// East Money (东方财富) — Chinese financial news live feed
// API endpoint: q.889.ink/em_hotnews
// No auth required. Provides real-time Chinese financial news.

import { safeFetch } from '../utils/fetch.mjs';

const BASE = 'https://q.889.ink/em_hotnews';

// Default headers to mimic browser request
const DEFAULT_HEADERS = {
  'accept': 'application/json',
  'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
  'origin': 'https://wealth.want.biz',
  'referer': 'https://wealth.want.biz/',
  'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

// Fetch live news from East Money
export async function fetchNews(opts = {}) {
  const { limit = 50 } = opts;

  try {
    const response = await fetch(BASE, {
      headers: DEFAULT_HEADERS,
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (e) {
    console.error('[EastMoney] Fetch failed:', e.message);
    return null;
  }
}

// Compact news item for briefing
function compactItem(item) {
  return {
    id: item.id || item.newsid,
    title: item.title,
    content: item.digest?.substring(0, 300),
    date: item.showtime ? new Date(item.showtime).toISOString() : null,
    url: item.url_w || item.url_m || item.url_unique,
    source: item.Art_Media_Name || '东方财富',
    type: item.type, // 1=快讯, 2=行情, 3=资讯
    commentnum: parseInt(item.commentnum) || 0,
  };
}

// Briefing mode — get latest Chinese financial news
export async function briefing() {
  const data = await fetchNews();

  if (!data || !data.news || data.rc !== 1) {
    return {
      source: 'EastMoney',
      timestamp: new Date().toISOString(),
      error: 'Failed to fetch data',
      items: [],
    };
  }

  const items = data.news.map(compactItem);

  // Categorize by keywords
  const categorize = (keywords) => items.filter(item =>
    keywords.some(k =>
      (item.title?.toLowerCase().includes(k.toLowerCase())) ||
      (item.content?.toLowerCase().includes(k.toLowerCase()))
    )
  );

  // Financial keywords in Chinese
  const marketKeywords = ['股市', '指数', '沪指', '深成指', '创业板', 'A股', '港股', '恒生', '涨停', '跌停', '成交'];
  const forexKeywords = ['汇率', '美元', '人民币', '欧元', '日元', '外汇'];
  const commodityKeywords = ['原油', 'WTI', '布伦特', '黄金', '白银', '大宗', '期货', '锂矿', '有色金属'];
  const centralBankKeywords = ['央行', '美联储', '欧洲央行', '利率', '加息', '降息', '货币政策', 'LPR'];
  const techKeywords = ['芯片', '半导体', 'AI', '人工智能', '大模型', '算力', '脑机', '量子'];
  const geopoliticalKeywords = ['伊朗', '以色列', '中东', '美国', '俄罗斯', '乌克兰', '战争', '冲突'];

  return {
    source: 'EastMoney',
    timestamp: new Date().toISOString(),
    totalItems: items.length,
    items,
    markets: categorize(marketKeywords),
    forex: categorize(forexKeywords),
    commodities: categorize(commodityKeywords),
    centralBanks: categorize(centralBankKeywords),
    tech: categorize(techKeywords),
    geopolitical: categorize(geopoliticalKeywords),
    hot: items.filter(i => i.commentnum > 10).slice(0, 10),
  };
}

// Run standalone
if (process.argv[1]?.endsWith('eastmoney.mjs')) {
  const data = await briefing();
  console.log(JSON.stringify(data, null, 2));
}
