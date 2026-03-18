// GDELT — Global Database of Events, Language, and Tone
// No auth required. Updates every 15 minutes. Monitors news in 100+ languages.
// DOC 2.0 API: full-text search across last 3 months of global news
// GEO 2.0 API: geolocation mapping of events
//
// OPTIMIZED: Single query with smart caching, deduplication, and importance scoring

import { safeFetch } from '../utils/fetch.mjs';

const BASE = 'https://api.gdeltproject.org/api/v2';

// Rate limiting: random interval between requests (6-10 seconds) to avoid strict rate limiting
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 6000;  // 6 seconds minimum
const MAX_REQUEST_INTERVAL = 10000; // 10 seconds maximum

async function withRateLimit(fn) {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  // Calculate random wait time between 6-10 seconds
  const randomWait = MIN_REQUEST_INTERVAL + Math.random() * (MAX_REQUEST_INTERVAL - MIN_REQUEST_INTERVAL);

  if (timeSinceLastRequest < randomWait) {
    const waitTime = Math.round(randomWait - timeSinceLastRequest);
    console.log(`[GDELT] Rate limiting: waiting ${waitTime / 1000}s`);
    await delay(waitTime);
  }

  lastRequestTime = Date.now();
  return fn();
}

// Cache (15 minutes TTL - matches dashboard refresh)
let cachedData = null;
let cacheTimestamp = 0;
const CACHE_TTL = 900000; // 15 minutes

// Comprehensive keyword sets for different categories
const CATEGORIES = {
  // Military & Conflict
  military: ['war', 'military', 'conflict', 'attack', 'strike', 'missile', 'troops', 'combat', 'battle', 'assault', 'offensive', 'defense', 'weapons', 'arsenal', 'bomb', 'explosion', 'firefight', 'casualties', 'frontline', 'invasion', 'occupation', 'airstrike', 'naval', 'ground', 'forces'],

  // Economy & Finance
  economy: ['economy', 'inflation', 'recession', 'market', 'stock', 'trading', 'gdp', 'growth', 'crash', 'rally', 'bull', 'bear', 'currency', 'exchange', 'tariff', 'sanctions', 'trade', 'import', 'export', 'supply', 'demand', 'interest', 'rate', 'federal', 'reserve', 'stimulus', 'hike', 'cut', 'bank', 'finance', 'investment'],

  // Geopolitics & Diplomacy
  geopolitics: ['summit', 'meeting', 'talks', 'negotiation', 'treaty', 'agreement', 'diplomacy', 'minister', 'president', 'leader', 'visit', 'bilateral', 'multilateral', 'alliance', 'cooperation', 'tension', 'dispute', 'embargo', 'deadline', 'pledge', 'memo'],

  // Crisis & Disasters
  crisis: ['crisis', 'disaster', 'emergency', 'outbreak', 'epidemic', 'pandemic', 'famine', 'flood', 'earthquake', 'typhoon', 'hurricane', 'wildfire', 'tsunami', 'evacuation', 'relief', 'aid', 'refugee', 'migrant', 'humanitarian', 'collapse', 'failure', 'rescue'],

  // Energy & Resources
  energy: ['oil', 'gas', 'petroleum', 'crude', 'energy', 'pipeline', 'production', 'export', 'opec', 'lng', 'shipment', 'barrel', 'price', 'supply', 'demand', 'reserve', 'refinery', 'tanker', 'sanction'],

  // China Focus
  china: ['China', 'Chinese', 'Beijing', 'Shanghai', 'Taiwan', 'Xi Jinping', 'CCP', 'PLA', 'South China Sea', 'semiconductor', 'chip', 'tech', 'economy', 'trade', 'sanction'],

  // Technology & Cyber
  tech: ['cyber', 'hack', 'data', 'privacy', 'AI', 'technology', 'chip', 'semiconductor', 'quantum', '5G', 'surveillance', 'ban', 'restriction', 'export', 'control', 'regulation', 'security'],

  // Russia/Ukraine
  russia: ['Russia', 'Ukraine', 'Putin', 'Zelenskyy', 'Kiev', 'Moscow', 'sanction', 'war', 'conflict', 'invasion', 'attack', 'missile', 'nuclear', 'threat'],

  // Middle East
  mideast: ['Israel', 'Gaza', 'Palestine', 'Hamas', 'Hezbollah', 'Iran', 'Middle East', 'war', 'conflict', 'ceasefire', 'summit', 'peace', 'hostage']
};

// Priority regions for geo-tagging
const PRIORITY_REGIONS = [
  'Ukraine', 'Russia', 'China', 'Taiwan', 'Israel', 'Gaza', 'Palestine', 'Iran',
  'United States', 'Europe', 'Middle East', 'Asia', 'Africa', 'Latin America'
];

// Authoritative news sources
const AUTHORITATIVE_SOURCES = [
  'reuters.com', 'apnews.com', 'bbc.com', 'bloomberg.com', 'ft.com', 'wsj.com',
  'nytimes.com', 'washingtonpost.com', 'cnn.com', 'aljazeera.com', 'france24.com'
];

// High-impact keywords for scoring
const HIGH_IMPACT = ['war', 'attack', 'crisis', 'summit', 'sanctions', 'invasion', 'explosion'];
const MEDIUM_IMPACT = ['military', 'economy', 'protest', 'meeting', 'agreement', 'emergency'];
const LOW_IMPACT = ['report', 'says', 'according', 'announces'];

// Search recent global events/articles by keyword
export async function searchEvents(query = '', opts = {}) {
  return withRateLimit(async () => {
    const {
      mode = 'ArtList',       // ArtList, TimelineVol, TimelineVolInfo, TimelineTone, TimelineLang, TimelineSourceCountry
      maxRecords = 75,
      timespan = '24h',       // e.g. "24h", "7d", "3m"
      format = 'json',
      sortBy = 'DateDesc',    // DateDesc, DateAsc, ToneDesc, ToneAsc
    } = opts;

    // If no query, use broad geopolitical terms
    const q = query || 'conflict OR crisis OR military OR sanctions OR war OR economy';
    const params = new URLSearchParams({
      query: q,
      mode,
      maxrecords: String(maxRecords),
      timespan,
      format,
      sort: sortBy,
    });

    return safeFetch(`${BASE}/doc/doc?${params}`);
  });
}

// Get tone/sentiment timeline for a topic
export async function toneTrend(query, timespan = '7d') {
  return withRateLimit(async () => {
    const params = new URLSearchParams({
      query,
      mode: 'TimelineTone',
      timespan,
      format: 'json',
    });
    return safeFetch(`${BASE}/doc/doc?${params}`);
  });
}

// Get volume timeline for a topic (how much coverage)
export async function volumeTrend(query, timespan = '7d') {
  return withRateLimit(async () => {
    const params = new URLSearchParams({
      query,
      mode: 'TimelineVol',
      timespan,
      format: 'json',
    });
    return safeFetch(`${BASE}/doc/doc?${params}`);
  });
}

// GEO API — geographic event mapping
export async function geoEvents(query = '', opts = {}) {
  return withRateLimit(async () => {
    const {
      mode = 'PointData',
      timespan = '24h',
      format = 'GeoJSON',
      maxPoints = 500,
    } = opts;

    const q = query || 'conflict OR military OR protest OR explosion';
    const params = new URLSearchParams({
      query: q,
      mode,
      timespan,
      format,
      maxpoints: String(maxPoints),
    });

    return safeFetch(`${BASE}/geo/geo?${params}`);
  });
}

// Compact article for briefing
function compactArticle(a) {
  return {
    title: a.title,
    url: a.url,
    date: a.seendate,
    domain: a.domain,
    language: a.language,
    country: a.sourcecountry,
  };
}

// Calculate importance score for an article
function calculateImportance(article) {
  let score = 0;
  const title = (article.title || '').toLowerCase();

  // Keyword impact scoring
  for (const kw of HIGH_IMPACT) {
    if (title.includes(kw)) score += 3;
  }
  for (const kw of MEDIUM_IMPACT) {
    if (title.includes(kw)) score += 2;
  }
  for (const kw of LOW_IMPACT) {
    if (title.includes(kw)) score += 0;
  }

  // Source authority
  if (article.domain) {
    for (const src of AUTHORITATIVE_SOURCES) {
      if (article.domain.includes(src)) {
        score += 2;
        break;
      }
    }
  }

  // Region priority
  if (article.country) {
    for (const region of PRIORITY_REGIONS) {
      if (article.country.includes(region)) {
        score += 1;
        break;
      }
    }
  }

  return score;
}

// Deduplicate articles by title
function deduplicateArticles(articles) {
  const seen = new Set();
  const unique = [];

  for (const a of articles) {
    const key = (a.title || '').toLowerCase().replace(/\s+/g, '').substring(0, 100);
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(a);
    }
  }

  return unique;
}

// Smart categorization with scoring
function categorizeArticle(article) {
  const title = (article.title || '').toLowerCase();
  const categories = [];
  const scores = {};

  for (const [cat, keywords] of Object.entries(CATEGORIES)) {
    const matchCount = keywords.filter(k => title.includes(k)).length;
    if (matchCount > 0) {
      categories.push(cat);
      scores[cat] = matchCount;
    }
  }

  // Get top categories
  categories.sort((a, b) => (scores[b] || 0) - (scores[a] || 0));

  return {
    article,
    categories: categories.slice(0, 3),
    primaryCategory: categories[0] || null,
    score: calculateImportance(article)
  };
}

// GDELT rate limit: 1 request per 5 seconds
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// Multiple query keywords for comprehensive coverage
const QUERY_KEYWORDS = [
  'crisis',      // Conflicts, disasters, emergencies
  'war',         // Military conflicts, wars
  'economic',    // Economy, markets, finance
  'summit',      // Diplomatic meetings, negotiations
  'trade',       // Trade, tariffs, sanctions
  'attack',      // Military strikes, conflicts
  'sanctions',   // Economic sanctions
  'emergency',   // Emergency situations
  'inflation',   // Inflation, prices
];

// Briefing mode — get top global events summary (sequential due to rate limit)
// OPTIMIZED: Queries multiple keywords sequentially for comprehensive coverage
export async function briefing() {
  const now = Date.now();

  // Check cache first
  if (cachedData && (now - cacheTimestamp) < CACHE_TTL) {
    console.log('[GDELT] Using cached data (' + Math.round((now - cacheTimestamp) / 1000) + 's old)');
    return cachedData;
  }

  console.log('[GDELT] Starting comprehensive sweep with', QUERY_KEYWORDS.length, 'keywords...');

  // Fetch from all keywords sequentially (respecting rate limit)
  const allArticles = [];
  const queryResults = {};

  for (let i = 0; i < QUERY_KEYWORDS.length; i++) {
    const keyword = QUERY_KEYWORDS[i];
    console.log(`[GDELT] [${i + 1}/${QUERY_KEYWORDS.length}] Querying: "${keyword}"`);

    const result = await searchEvents(keyword, { maxRecords: 50, timespan: '24h' });

    if (result?.error) {
      console.error(`[GDELT] Error for "${keyword}":`, result.error);
      queryResults[keyword] = { error: result.error, count: 0 };
      continue;
    }

    const articles = result?.articles || [];
    const compacted = articles.map(compactArticle);
    allArticles.push(...compacted);

    queryResults[keyword] = { count: articles.length };
    console.log(`[GDELT] [${i + 1}/${QUERY_KEYWORDS.length}] "${keyword}": ${articles.length} articles`);
  }

  console.log('[GDELT] Total raw articles:', allArticles.length);

  // Deduplicate
  const uniqueArticles = deduplicateArticles(allArticles);
  console.log('[GDELT] After deduplication:', uniqueArticles.length, 'articles');

  // Apply smart categorization with scoring
  const categorized = uniqueArticles.map(a => categorizeArticle(a));

  // Build category-based groupings
  const categoryGroups = {};
  for (const item of categorized) {
    for (const cat of item.categories) {
      if (!categoryGroups[cat]) {
        categoryGroups[cat] = [];
      }
      categoryGroups[cat].push({ ...item.article, score: item.score });
    }
  }

  // Sort each category by importance score and limit to top 15
  for (const cat in categoryGroups) {
    categoryGroups[cat].sort((a, b) => b.score - a.score);
    categoryGroups[cat] = categoryGroups[cat].slice(0, 15);
  }

  const result = {
    source: 'GDELT',
    timestamp: new Date().toISOString(),
    totalArticles: uniqueArticles.length,
    timespan: '24h',
    queries: queryResults,
    categories: categoryGroups,
    // Legacy field names for backward compatibility
    conflicts: categoryGroups.military || [],
    economy: (categoryGroups.economy || []).concat(categoryGroups.energy || []),
    health: categoryGroups.crisis || [],
    topArticles: categorized
      .sort((a, b) => b.score - a.score)
      .slice(0, 30)
      .map(item => ({ ...item.article, score: item.score, primaryCategory: item.primaryCategory })),
  };

  // Cache the result
  cachedData = result;
  cacheTimestamp = now;

  console.log('[GDELT] Comprehensive sweep complete:', uniqueArticles.length, 'unique articles across',
    Object.keys(categoryGroups).length, 'categories');

  return result;
}

// Run standalone
if (process.argv[1]?.endsWith('gdelt.mjs')) {
  const data = await briefing();
  console.log(JSON.stringify(data, null, 2));
}
