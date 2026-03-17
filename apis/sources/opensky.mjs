// OpenSky Network — Real-time flight tracking
// Free for research. 4,000 API credits/day (no auth), 8,000 with account.
// Tracks all aircraft with ADS-B transponders including many military.
//
// OPTIMIZED: Uses single global call + client-side filtering to reduce API usage
// from 6 requests per refresh to just 1 request per refresh (with 60s cache).
// AUTHENTICATED: Uses OpenSky account for 8,000 requests/day limit.

import { safeFetch } from '../utils/fetch.mjs';
import { readFileSync } from 'fs';

const BASE = 'https://opensky-network.org/api';

// Load OpenSky credentials from credentials.json
let CREDENTIALS = null;
try {
  const credPath = '/Users/ygs/Downloads/credentials.json';
  const creds = JSON.parse(readFileSync(credPath, 'utf-8'));
  // Support both formats: clientId/clientSecret and username/password
  CREDENTIALS = {
    username: creds.username || creds.clientId,
    password: creds.password || creds.clientSecret
  };
  console.log('[OpenSky] Using authenticated mode (8,000 req/day)');
} catch (e) {
  console.warn('[OpenSky] No credentials found, running in anonymous mode (4,000 req/day)');
}

// Simple in-memory cache (60 seconds TTL)
let cachedAllFlights = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60000; // 60 seconds

// Clear cache (call when rate limit resets or force refresh)
export function clearCache() {
  cachedAllFlights = null;
  cacheTimestamp = 0;
}

// Get all current flights (global state vector) with caching
export async function getAllFlights() {
  const now = Date.now();

  // Return cached data if still valid
  if (cachedAllFlights && (now - cacheTimestamp) < CACHE_TTL) {
    return cachedAllFlights;
  }

  try {
    // Build URL with authentication if available
    let url = `${BASE}/states/all`;
    const options = { timeout: 30000, headers: {} };

    if (CREDENTIALS?.username && CREDENTIALS?.password) {
      // Use Basic Auth header instead of embedding credentials in URL
      const auth = Buffer.from(`${CREDENTIALS.username}:${CREDENTIALS.password}`).toString('base64');
      options.headers['Authorization'] = `Basic ${auth}`;
      console.log('[OpenSky] Using authentication for user:', CREDENTIALS.username);
    }

    const data = await safeFetch(url, options);

    // Debug: log response
    if (data?.error) {
      console.log('[OpenSky] API error:', data.error);
    } else if (data?.states) {
      console.log('[OpenSky] Success - got', data.states.length, 'aircraft');
    } else {
      console.log('[OpenSky] Unexpected response:', JSON.stringify(data).slice(0, 200));
    }

    // Check for authentication error
    if (data?.error?.includes('HTTP 401') || data?.error?.includes('Unauthorized')) {
      console.warn('[OpenSky] Authentication failed - falling back to anonymous mode');
      // Try again without authentication
      CREDENTIALS = null;
      return getAllFlights();
    }

    // Check for rate limit error
    if (data?.error?.includes('Too many requests') || data?.error?.includes('429')) {
      console.warn('[OpenSky] Rate limited - using cached data if available');
      return cachedAllFlights || { states: [], error: 'rate_limited' };
    }

    // Cache successful response
    if (data?.states) {
      cachedAllFlights = data;
      cacheTimestamp = now;
    }

    return data;
  } catch (e) {
    console.error('[OpenSky] Fetch error:', e.message);
    // Return cached data on error, or empty result
    return cachedAllFlights || { states: [], error: e.message };
  }
}

// Filter flights by bounding box (client-side filtering)
function filterFlightsByBox(states, lamin, lomin, lamax, lomax) {
  if (!states || !Array.isArray(states)) return [];
  return states.filter(s => {
    const lat = s[6]; // latitude
    const lon = s[5]; // longitude
    return lat != null && lon != null &&
           lat >= lamin && lat <= lamax &&
           lon >= lomin && lon <= lomax;
  });
}

// Get flights in a bounding box (lat/lon) - uses cached global data
export async function getFlightsInArea(lamin, lomin, lamax, lomax) {
  const data = await getAllFlights();
  const states = data?.states || [];

  // If rate limited, return empty with error flag
  if (data?.error === 'rate_limited') {
    return { states: [], error: 'rate_limited', cached: true };
  }

  const filtered = filterFlightsByBox(states, lamin, lomin, lamax, lomax);
  return { states: filtered, ...data };
}

// Get flights by specific aircraft (ICAO24 hex codes)
export async function getFlightsByIcao(icao24List) {
  const icao = Array.isArray(icao24List) ? icao24List : [icao24List];
  const params = icao.map(i => `icao24=${i}`).join('&');
  return safeFetch(`${BASE}/states/all?${params}`, { timeout: 20000 });
}

// Get departures from an airport in a time range
export async function getDepartures(airportIcao, begin, end) {
  const params = new URLSearchParams({
    airport: airportIcao,
    begin: String(Math.floor(begin / 1000)),
    end: String(Math.floor(end / 1000)),
  });
  return safeFetch(`${BASE}/flights/departure?${params}`);
}

// Get arrivals at an airport
export async function getArrivals(airportIcao, begin, end) {
  const params = new URLSearchParams({
    airport: airportIcao,
    begin: String(Math.floor(begin / 1000)),
    end: String(Math.floor(end / 1000)),
  });
  return safeFetch(`${BASE}/flights/arrival?${params}`);
}

// Key hotspot regions for monitoring
const HOTSPOTS = {
  middleEast: { lamin: 12, lomin: 30, lamax: 42, lomax: 65, label: 'Middle East' },
  taiwan: { lamin: 20, lomin: 115, lamax: 28, lomax: 125, label: 'Taiwan Strait' },
  ukraine: { lamin: 44, lomin: 22, lamax: 53, lomax: 41, label: 'Ukraine Region' },
  baltics: { lamin: 53, lomin: 19, lamax: 60, lomax: 29, label: 'Baltic Region' },
  southChinaSea: { lamin: 5, lomin: 105, lamax: 23, lomax: 122, label: 'South China Sea' },
  koreanPeninsula: { lamin: 33, lomin: 124, lamax: 43, lomax: 132, label: 'Korean Peninsula' },
};

// Briefing — check hotspot regions for flight activity
// OPTIMIZED: Single API call + client-side filtering instead of 6 API calls
export async function briefing() {
  // Get all flights once (uses cache if recent)
  const globalData = await getAllFlights();
  const allStates = globalData?.states || [];
  const isRateLimited = globalData?.error === 'rate_limited';
  const isUsingCache = cachedAllFlights && globalData === cachedAllFlights;

  const hotspotEntries = Object.entries(HOTSPOTS);
  const results = hotspotEntries.map(([key, box]) => {
    // Filter flights for this region on client side
    const states = filterFlightsByBox(allStates, box.lamin, box.lomin, box.lamax, box.lomax);

    return {
      region: box.label,
      key,
      totalAircraft: states.length,
      // states format: [icao24, callsign, origin_country, ...]
      byCountry: states.reduce((acc, s) => {
        const country = s[2] || 'Unknown';
        acc[country] = (acc[country] || 0) + 1;
        return acc;
      }, {}),
      // Flag potentially interesting (military often have no callsign or specific patterns)
      noCallsign: states.filter(s => !s[1]?.trim()).length,
      highAltitude: states.filter(s => s[7] && s[7] > 12000).length, // >12km altitude
    };
  });

  return {
    source: 'OpenSky',
    timestamp: new Date().toISOString(),
    hotspots: results,
    metadata: {
      totalAircraftGlobal: allStates.length,
      rateLimited: isRateLimited,
      usingCache: isUsingCache,
      cacheAge: isUsingCache ? Math.round((Date.now() - cacheTimestamp) / 1000) : 0,
    },
  };
}

if (process.argv[1]?.endsWith('opensky.mjs')) {
  const data = await briefing();
  console.log(JSON.stringify(data, null, 2));
}
