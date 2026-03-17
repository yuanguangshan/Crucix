// Wall Street CN (华尔街见闻) — Chinese financial news live feed
// API endpoint: api-one-wscn.awtmt.com
// No auth required. Provides real-time global financial news in Chinese.

import { safeFetch } from '../utils/fetch.mjs';

const BASE = 'https://api-one-wscn.awtmt.com/apiv1/content/lives';

// Default headers to mimic browser request
const DEFAULT_HEADERS = {
  'accept': '*/*',
  'accept-language': 'en,zh-CN;q=0.9,zh;q=0.8',
  'origin': 'https://wealth.want.biz',
  'referer': 'https://wealth.want.biz/',
  'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

// Fetch live news from Wall Street CN
export async function fetchLives(opts = {}) {
  const {
    channel = 'global-channel',
    accept = 'live,vip-live',
    limit = 30,
    cursor = null,
    firstPage = true,
  } = opts;

  const params = new URLSearchParams({
    channel,
    accept,
    limit: String(limit),
    first_page: String(firstPage),
    client: 'pc',
  });

  if (cursor) {
    params.set('cursor', String(cursor));
    params.set('first_page', 'false');
  }

  const url = `${BASE}?${params}`;

  try {
    const response = await fetch(url, {
      headers: DEFAULT_HEADERS,
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (e) {
    console.error('[WallStreetCN] Fetch failed:', e.message);
    return null;
  }
}

// Compact news item for briefing
function compactItem(item) {
  return {
    id: item.id,
    title: item.title || item.content_text?.substring(0, 150),
    content: item.content_text?.substring(0, 300),
    date: item.display_time ? new Date(item.display_time * 1000).toISOString() : null,
    important: item.important || false,
    vip: item.vip || false,
    url: item.source_link || undefined,
    source: item.source || '华尔街见闻',
  };
}

// Briefing mode — get latest global financial news
export async function briefing() {
  const data = await fetchLives({ limit: 50 });

  if (!data || !data.data) {
    return {
      source: 'WallStreetCN',
      timestamp: new Date().toISOString(),
      error: 'Failed to fetch data',
      items: [],
    };
  }

  const items = (data.data.items || data.data.list || []).map(compactItem);

  // Categorize by keywords in Chinese and English
  const categorize = (keywords) => items.filter(item =>
    keywords.some(k =>
      (item.title?.toLowerCase().includes(k.toLowerCase())) ||
      (item.content?.toLowerCase().includes(k.toLowerCase()))
    )
  );

  // Financial keywords
  const marketKeywords = ['股市', 'stock', '指数', 'index', '道指', 'dow', '纳指', 'nasdaq', '标普', 's&p', 'a股', '港股', '恒生'];
  const forexKeywords = ['汇率', 'fx', '美元', 'dollar', 'usd', '人民币', 'yuan', 'rmb', '欧元', 'euro', '日元', 'yen'];
  const commodityKeywords = ['原油', 'oil', 'wti', '布伦特', 'brent', '黄金', 'gold', '白银', 'silver', '大宗', 'commodity'];
  const centralBankKeywords = ['央行', 'fed', '美联储', 'ecb', '欧洲央行', '利率', 'rate', '加息', '降息', '货币政策', 'monetary'];
  const chinaKeywords = ['中国', 'china', '北京', 'beijing', '上海', 'shanghai', '证监会', 'csrs', '央行', 'pbo'];
  const usKeywords = ['美国', 'us', 'biden', 'trump', '拜登', '特朗普', '白宫', 'white house', '国会', 'congress'];

  return {
    source: 'WallStreetCN',
    timestamp: new Date().toISOString(),
    totalItems: items.length,
    items,
    markets: categorize(marketKeywords),
    forex: categorize(forexKeywords),
    commodities: categorize(commodityKeywords),
    centralBanks: categorize(centralBankKeywords),
    china: categorize(chinaKeywords),
    us: categorize(usKeywords),
    important: items.filter(i => i.important),
  };
}

// Run standalone
if (process.argv[1]?.endsWith('wallstreetcn.mjs')) {
  const data = await briefing();
  console.log(JSON.stringify(data, null, 2));
}
