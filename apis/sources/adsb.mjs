// ADS-B Exchange — Unfiltered Flight Tracking (including Military)
// Unlike FlightRadar24/FlightAware, ADS-B Exchange does NOT filter military aircraft.
// RapidAPI provides programmatic access with dedicated /mil endpoint for military aircraft.

import { safeFetch } from '../utils/fetch.mjs';
import '../utils/env.mjs'; // Load .env file

// Known endpoints (availability may change)
const ENDPOINTS = {
  // v2 API via RapidAPI (requires ADSB_API_KEY)
  rapidApi: 'https://adsbexchange-com1.p.rapidapi.com/v2',
  // Public globe feed (may be rate-limited or blocked for automated access)
  publicFeed: 'https://globe.adsbexchange.com/data/aircraft.json',
  // Alternative: aircraft within bounding box
  publicTrace: 'https://globe.adsbexchange.com/data/traces',
};

// Simple in-memory cache (60 seconds TTL)
let cachedData = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60000; // 60 seconds

// Known military aircraft types and ICAO type designators
const MILITARY_TYPES = {
  // Reconnaissance / ISR
  'RC135': 'RC-135 Rivet Joint (SIGINT)',
  'E3CF':  'E-3 Sentry AWACS',
  'E3TF':  'E-3 Sentry AWACS',
  'E6B':   'E-6B Mercury (TACAMO)',
  'EP3':   'EP-3 Aries (SIGINT)',
  'P8':    'P-8 Poseidon (Maritime Patrol)',
  'P8A':   'P-8A Poseidon',
  'RQ4':   'RQ-4 Global Hawk (UAV)',
  'RQ4B':  'RQ-4B Global Hawk',
  'U2':    'U-2 Dragon Lady',
  'MQ9':   'MQ-9 Reaper (UAV)',
  'MQ1':   'MQ-1 Predator (UAV)',
  'E8':    'E-8 JSTARS',
  // Tankers
  'KC135': 'KC-135 Stratotanker',
  'KC10':  'KC-10 Extender',
  'KC46':  'KC-46 Pegasus',
  // Bombers
  'B52':   'B-52 Stratofortress',
  'B1':    'B-1B Lancer',
  'B2':    'B-2 Spirit',
  // Transport / Special
  'C17':   'C-17 Globemaster III',
  'C5':    'C-5 Galaxy',
  'C130':  'C-130 Hercules',
  'VC25':  'VC-25 (Air Force One)',
  'E4B':   'E-4B Nightwatch (Doomsday Plane)',
  'C32':   'C-32 (Air Force Two)',
  'C40':   'C-40 Clipper',
};

// Known military ICAO hex ranges (partial — US military allocations)
const MIL_HEX_RANGES = [
  { start: 0xADF7C8, end: 0xAFFFFF, country: 'US Military' },
  { start: 0xAE0000, end: 0xAFFFFF, country: 'US Military (alt)' },
  { start: 0x43C000, end: 0x43CFFF, country: 'UK Military' },
  { start: 0x3F0000, end: 0x3FFFFF, country: 'France Military' },
  { start: 0x3CC000, end: 0x3CFFFF, country: 'Germany Military' },
];

// Interesting callsign patterns that suggest military/government flights
const MIL_CALLSIGN_PATTERNS = [
  /^RCH/,      // US AMC (Air Mobility Command) — strategic airlift
  /^REACH/,    // US AMC alternate
  /^DUKE/,     // Often military special ops
  /^IRON/,     // US military
  /^JAKE/,     // Military
  /^NAVY/,     // US Navy
  /^TOPCAT/,   // E-6B Mercury
  /^DARKST/,   // Dark Star / classified
  /^GORDO/,    // USAF
  /^BISON/,    // B-52
  /^DEATH/,    // B-1B
  /^DOOM/,     // E-4B
  /^SAM/,      // Special Air Mission (VIP)
  /^EXEC/,     // Executive transport
  /^PCSF/,     // Chinese military
  /^CHN/,      // Chinese military
  /^RF/,       // Russian Air Force
  /^RFF/,      // Russian Air Force
];

// Check if an ICAO hex code falls in known military ranges
function isMilitaryHex(hex) {
  if (!hex) return false;
  const num = parseInt(hex, 16);
  if (isNaN(num)) return false;
  return MIL_HEX_RANGES.find(r => num >= r.start && num <= r.end) || null;
}

// Check if a callsign matches military patterns
function isMilitaryCallsign(callsign) {
  if (!callsign) return false;
  const cs = callsign.trim().toUpperCase();
  return MIL_CALLSIGN_PATTERNS.some(p => p.test(cs));
}

// Check if aircraft type is a known military type
function isMilitaryType(typeCode) {
  if (!typeCode) return false;
  const tc = typeCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return MILITARY_TYPES[tc] || null;
}

// Classify an aircraft from ADS-B data
function classifyAircraft(ac) {
  const hex = ac.hex || ac.icao || ac.icao24 || null;
  const callsign = ac.flight || ac.callsign || ac.call || '';
  const type = ac.t || ac.type || ac.typecode || '';
  const mil = ac.mil || ac.military || false;

  const milHex = isMilitaryHex(hex);
  const milCall = isMilitaryCallsign(callsign);
  const milType = isMilitaryType(type);

  const isMilitary = !!(mil || milHex || milCall || milType);

  return {
    hex,
    callsign: callsign.trim(),
    type,
    typeDescription: milType || null,
    latitude: ac.lat || ac.latitude || null,
    longitude: ac.lon || ac.longitude || null,
    altitude: ac.alt_baro || ac.alt_geom || ac.altitude || null,
    speed: ac.gs || ac.speed || null,
    heading: ac.track || ac.heading || null,
    squawk: ac.squawk || null,
    isMilitary,
    militaryMatch: milHex?.country || (milCall ? 'callsign pattern' : null) || (milType ? 'type match' : null),
    registration: ac.r || ac.registration || null,
    seen: ac.seen || ac.last_contact || null,
  };
}

// Attempt to fetch from RapidAPI (requires ADSB_API_KEY)
async function fetchViaRapidApi(apiKey) {
  if (!apiKey) return null;

  // Get all military aircraft
  const data = await safeFetch(`${ENDPOINTS.rapidApi}/mil`, {
    timeout: 20000,
    headers: {
      'X-RapidAPI-Key': apiKey,
      'X-RapidAPI-Host': 'adsbexchange-com1.p.rapidapi.com',
    },
  });

  return data;
}

// Attempt to fetch from public feed
async function fetchPublicFeed() {
  const data = await safeFetch(ENDPOINTS.publicFeed, { timeout: 15000 });
  return data;
}

// Get military aircraft from available sources
export async function getMilitaryAircraft(apiKey) {
  // Try RapidAPI first if key available
  if (apiKey) {
    const data = await fetchViaRapidApi(apiKey);
    if (data && !data.error) {
      const aircraft = data.ac || data.aircraft || [];
      if (Array.isArray(aircraft)) {
        return aircraft.map(classifyAircraft).filter(a => a.isMilitary);
      }
    }
  }

  // Try public feed
  const pubData = await fetchPublicFeed();
  if (pubData && !pubData.error) {
    const aircraft = pubData.ac || pubData.aircraft || pubData.states || [];
    if (Array.isArray(aircraft)) {
      return aircraft.map(classifyAircraft).filter(a => a.isMilitary);
    }
  }

  return null; // all sources failed
}

// Get all aircraft in a geographic bounding box via RapidAPI
export async function getAircraftInArea(lat, lon, radiusNm = 250, apiKey) {
  if (!apiKey) {
    return { error: 'ADSB_API_KEY required for area search', hint: 'Set ADSB_API_KEY (RapidAPI key)' };
  }

  const data = await safeFetch(
    `${ENDPOINTS.rapidApi}/lat/${lat}/lon/${lon}/dist/${radiusNm}/`,
    {
      timeout: 20000,
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': 'adsbexchange-com1.p.rapidapi.com',
      },
    }
  );

  if (data && !data.error) {
    const aircraft = data.ac || data.aircraft || [];
    if (Array.isArray(aircraft)) return aircraft.map(classifyAircraft);
  }

  return data;
}

// Briefing — attempt to get military flight data, document what's available
export async function briefing() {
  const apiKey = process.env.ADSB_API_KEY || process.env.RAPIDAPI_KEY || null;

  if (!apiKey) {
    return {
      source: 'ADS-B Exchange',
      timestamp: new Date().toISOString(),
      status: 'no_key',
      hotspots: [],
      message: 'No ADSB_API_KEY configured. Add to .env for military tracking.',
    };
  }

  const now = Date.now();
  const useCache = cachedData && (now - cacheTimestamp) < CACHE_TTL;

  let allAircraft = [];
  let isRateLimited = false;

  if (useCache) {
    allAircraft = cachedData.allAircraft || [];
    console.log('[ADS-B] Using cached data (' + Math.round((now - cacheTimestamp) / 1000) + 's old)');
  } else {
    // Fetch all aircraft via RapidAPI
    try {
      const data = await safeFetch(`${ENDPOINTS.rapidApi}/mil`, {
        timeout: 20000,
        headers: {
          'X-RapidAPI-Key': apiKey,
          'X-RapidAPI-Host': 'adsbexchange-com1.p.rapidapi.com',
        },
      });

      if (data?.error) {
        if (data.error.includes('429') || data.error.includes('Too many')) {
          console.warn('[ADS-B] Rate limited - using cached data');
          isRateLimited = true;
          allAircraft = cachedData?.allAircraft || [];
        } else {
          console.error('[ADS-B] API error:', data.error);
          allAircraft = cachedData?.allAircraft || [];
        }
      } else {
        allAircraft = (data.ac || data.aircraft || []).map(classifyAircraft);
        cachedData = { allAircraft, timestamp: now };
        cacheTimestamp = now;
        console.log('[ADS-B] Fetched', allAircraft.length, 'aircraft');
      }
    } catch (e) {
      console.error('[ADS-B] Fetch error:', e.message);
      allAircraft = cachedData?.allAircraft || [];
    }
  }

  // Filter by hotspot regions
  const hotspots = getHotspotData(allAircraft);

  return {
    source: 'ADS-B Exchange',
    timestamp: new Date().toISOString(),
    status: 'live',
    hotspots,
    metadata: {
      totalAircraftGlobal: allAircraft.length,
      usingCache: useCache,
      cacheAge: useCache ? Math.round((now - cacheTimestamp) / 1000) : 0,
      rateLimited: isRateLimited,
    },
  };
}

// Get hotspot regional data
function getHotspotData(aircraft) {
  const HOTSPOTS = [
    { name: 'Middle East', lat: 27, lon: 45, radius: 1200 },
    { name: 'Taiwan Strait', lat: 24, lon: 120, radius: 400 },
    { name: 'Ukraine Region', lat: 48, lon: 31, radius: 500 },
    { name: 'Baltic Region', lat: 56, lon: 24, radius: 400 },
    { name: 'South China Sea', lat: 14, lon: 113, radius: 600 },
    { name: 'Korean Peninsula', lat: 38, lon: 128, radius: 400 },
  ];

  return HOTSPOTS.map(region => {
    const inRegion = aircraft.filter(ac => {
      if (!ac.latitude || !ac.longitude) return false;
      const dist = calculateDistance(
        region.lat, region.lon,
        ac.latitude, ac.longitude
      );
      return dist <= region.radius;
    });

    const military = inRegion.filter(ac => ac.isMilitary);
    const byCountry = {};

    for (const ac of inRegion) {
      const country = ac.militaryMatch || 'Unknown';
      byCountry[country] = (byCountry[country] || 0) + 1;
    }

    return {
      region: region.name,
      totalAircraft: inRegion.length,
      militaryAircraft: military.length,
      byCountry,
      topAircraft: inRegion.slice(0, 5).map(ac => ({
        hex: ac.hex,
        callsign: ac.callsign,
        type: ac.typeDescription || ac.type,
        altitude: ac.altitude,
        speed: ac.speed,
        isMilitary: ac.isMilitary,
      })),
    };
  });
}

// Calculate distance between two lat/lon points (nautical miles)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 3440.1; // Earth's radius in nautical miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Run standalone
if (process.argv[1]?.endsWith('adsb.mjs')) {
  const data = await briefing();
  console.log(JSON.stringify(data, null, 2));
}
