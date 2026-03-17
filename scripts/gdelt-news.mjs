// gdelt-news-standalone.mjs
// 完全独立版本，不依赖Crucix项目文件
// 使用方式: node gdelt-news-standalone.mjs "你的关键词" [选项]

const BASE = 'https://api.gdeltproject.org/api/v2/doc/doc';

/**
 * 独立的 safeFetch 实现
 */
async function safeFetch(url, options = {}) {
  const {
    timeout = 30000,
    retries = 3,
    retryDelay = 1000,
  } = options;

  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        return await response.json();
      } else {
        return await response.text();
      }
    } catch (error) {
      const isLastAttempt = i === retries - 1;
      
      if (isLastAttempt) {
        throw new Error(`请求失败 (尝试 ${retries} 次): ${error.message}`);
      }

      // 指数退避
      const delay = retryDelay * Math.pow(2, i);
      console.log(`⏳ 请求失败，${delay/1000}秒后重试 (${i + 1}/${retries})...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

/**
 * 格式化输出
 */
function formatOutput(data, options) {
  if (!data.articles || data.articles.length === 0) {
    console.log('\n📭 没有找到相关新闻');
    return;
  }

  console.log(`\n📰 找到 ${data.articles.length} 条相关新闻（过去24小时）\n`);
  
  data.articles.forEach((article, index) => {
    console.log(`${'='.repeat(80)}`);
    console.log(`📌 [${index + 1}] ${article.title || '无标题'}`);
    console.log(`${'─'.repeat(80)}`);
    
    // 提取并显示正文片段
    if (article.body || article.content || article.snippet) {
      const bodyText = article.body || article.content || article.snippet || '';
      // 清理HTML标签和多余空格
      const body = bodyText
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      // 显示前200个字符的正文
      const snippet = body.length > 200 
        ? body.substring(0, 200) + '...' 
        : body;
      console.log(`📝 ${snippet}\n`);
    }
    
    // 显示元数据
    const metadata = [];
    if (article.domain) metadata.push(`🌐 来源: ${article.domain}`);
    if (article.url) metadata.push(`📎 域名: ${new URL(article.url).hostname}`);
    if (article.date) {
      const date = new Date(article.date);
      metadata.push(`⏰ 时间: ${date.toLocaleString()}`);
    }
    if (article.language) metadata.push(`🗣️ 语言: ${article.language}`);
    if (article.sourcecountry) metadata.push(`📍 国家: ${article.sourcecountry}`);
    
    console.log(metadata.join(' | '));
    
    if (article.url) {
      console.log(`🔗 ${article.url}`);
    }
    
    console.log('');
  });
}

/**
 * 导出为CSV格式
 */
async function exportToCSV(articles, filename) {
  try {
    // 动态导入fs（兼容ES Module）
    const fs = await import('fs');
    
    const headers = ['标题', '来源', '时间', '语言', '国家', '正文片段', 'URL'];
    const rows = articles.map(a => [
      (a.title || '').replace(/"/g, '""'),
      (a.domain || new URL(a.url || '').hostname || '').replace(/"/g, '""'),
      (a.date || '').replace(/"/g, '""'),
      (a.language || '').replace(/"/g, '""'),
      (a.sourcecountry || '').replace(/"/g, '""'),
      ((a.body || a.content || a.snippet || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').substring(0, 200) || '').replace(/"/g, '""'),
      (a.url || '').replace(/"/g, '""')
    ]);
    
    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
    
    fs.writeFileSync(filename, '\uFEFF' + csv, 'utf8'); // 添加BOM处理中文
    console.log(`\n💾 数据已导出到: ${filename}`);
  } catch (error) {
    console.error('❌ 导出CSV失败:', error.message);
  }
}

/**
 * 搜索新闻
 */
async function searchNews(keyword, options = {}) {
  const {
    limit = 50,           // 最大返回条数
    country = '',         // 按国家过滤
    language = '',        // 按语言过滤
    domain = '',          // 按域名过滤
    exact = false,        // 精确匹配
    exportCSV = '',       // 导出CSV的文件名
    verbose = false,      // 显示详细信息
  } = options;

  // 构建查询
  let query = keyword;
  
  // 如果要求精确匹配且关键词包含空格，自动加引号
  if (exact || keyword.includes(' ')) {
    query = `"${keyword}"`;
  }
  
  // 添加过滤条件
  const filters = [];
  if (country) filters.push(`sourcecountry:${country}`);
  if (language) filters.push(`language:${language}`);
  if (domain) filters.push(`domain:${domain}`);
  
  if (filters.length > 0) {
    query = `(${query}) AND ${filters.join(' AND ')}`;
  }

  // 构建API参数
  const params = new URLSearchParams({
    query: query,
    mode: 'ArtList',
    maxrecords: String(limit),
    timespan: '24h',      // 过去24小时
    format: 'json',
    sort: 'DateDesc',     // 按时间倒序
  });

  console.log(`\n🔍 正在搜索: "${keyword}"`);
  console.log(`📊 参数: 最多${limit}条, 过去24小时`);
  if (filters.length > 0) {
    console.log(`🔧 过滤: ${filters.join(', ')}`);
  }
  if (verbose) {
    console.log(`📡 API请求: ${BASE}?${params}`);
  }
  console.log('');

  try {
    const response = await safeFetch(`${BASE}?${params}`);
    
    if (!response) {
      console.log('❌ 没有获取到数据');
      return null;
    }

    if (response.articles && response.articles.length === 0) {
      console.log('📭 没有找到相关新闻');
      return null;
    }

    // 提取正文
    const articles = (response.articles || []).map(a => ({
      ...a,
      body: a.body || a.content || a.snippet || '',
    }));

    // 格式化输出
    formatOutput({ articles }, options);

    // 导出CSV
    if (exportCSV) {
      await exportToCSV(articles, exportCSV);
    }

    // 显示简要统计
    if (articles.length > 0) {
      console.log(`\n📊 统计信息:`);
      console.log(`   - 总条数: ${articles.length}`);
      
      // 按语言统计
      const langStats = articles.reduce((acc, a) => {
        const lang = a.language || 'unknown';
        acc[lang] = (acc[lang] || 0) + 1;
        return acc;
      }, {});
      
      console.log(`   - 语言分布: ${Object.entries(langStats)
        .map(([lang, count]) => `${lang}:${count}`)
        .join(', ')}`);
      
      // 按国家统计
      const countryStats = articles.reduce((acc, a) => {
        const country = a.sourcecountry || 'unknown';
        acc[country] = (acc[country] || 0) + 1;
        return acc;
      }, {});
      
      console.log(`   - 国家分布: ${Object.entries(countryStats)
        .slice(0, 5)
        .map(([country, count]) => `${country}:${count}`)
        .join(', ')}${Object.keys(countryStats).length > 5 ? '...' : ''}`);
    }

    return articles;
  } catch (error) {
    console.error('❌ 搜索失败:', error.message);
    return null;
  }
}

/**
 * 显示时间线趋势
 */
async function showTimeline(keyword, timespan = '7d') {
  const params = new URLSearchParams({
    query: keyword.includes(' ') ? `"${keyword}"` : keyword,
    mode: 'TimelineVol',
    timespan: timespan,
    format: 'json',
  });

  console.log(`\n📈 正在分析趋势: "${keyword}" (${timespan})`);

  try {
    const response = await safeFetch(`${BASE}?${params}`);
    
    if (!response || !response.timeline) {
      console.log('❌ 没有趋势数据');
      return;
    }

    console.log('\n📊 报道量趋势:');
    
    // 找出最大值用于归一化
    const maxValue = Math.max(...response.timeline.map(p => p.value));
    const barLength = 40; // 图表最大长度
    
    response.timeline.slice(-14).forEach(point => { // 只显示最近14个点
      const date = new Date(point.date).toLocaleDateString('zh-CN', { 
        month: '2-digit', 
        day: '2-digit'
      });
      const barCount = Math.floor((point.value / maxValue) * barLength);
      const bar = '█'.repeat(barCount);
      const empty = '░'.repeat(barLength - barCount);
      console.log(`${date} ${bar}${empty} ${point.value}`);
    });
  } catch (error) {
    console.error('❌ 获取趋势失败:', error.message);
  }
}

/**
 * 显示帮助信息
 */
function showHelp() {
  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GDELT 新闻查询工具 (独立版本)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

用法: node gdelt-news-standalone.mjs <关键词> [选项]

📋 基础选项:
  --limit, -l <数量>    最大返回条数 (默认: 50)
  --exact, -e          精确匹配关键词 (自动用于短语)

🌍 过滤选项:
  --country, -c <代码>  按国家过滤 (例如: CN, US, RU)
  --language, -lang <代码> 按语言过滤 (例如: zh, en, ja, fr)
  --domain, -d <域名>   按来源网站过滤 (例如: reuters.com)

📈 高级选项:
  --timeline, -t <周期> 显示时间线趋势 (例如: 7d, 1m, 3m)
  --export, -o <文件>   导出为CSV文件
  --verbose, -v        显示详细信息（包括API请求）
  --help, -h           显示帮助信息

📝 使用示例:
  # 基础搜索
  node gdelt-news-standalone.mjs "人工智能"
  
  # 精确匹配短语
  node gdelt-news-standalone.mjs "climate change" --exact
  
  # 按国家和语言过滤
  node gdelt-news-standalone.mjs "乌克兰" --country UA --language uk
  
  # 特定网站来源
  node gdelt-news-standalone.mjs "semiconductor" --domain reuters.com --limit 30
  
  # 趋势分析
  node gdelt-news-standalone.mjs "bitcoin" --timeline 30d
  
  # 导出数据
  node gdelt-news-standalone.mjs "人工智能" --export ai_news.csv --limit 100
  
  # 详细模式
  node gdelt-news-standalone.mjs "economy" --country US --verbose

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
}

/**
 * 主函数
 */
async function main() {
  // 解析命令行参数
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    showHelp();
    return;
  }

  const keyword = args[0];
  const options = {
    limit: 50,
    country: '',
    language: '',
    domain: '',
    exact: false,
    timeline: false,
    exportCSV: '',
    verbose: false,
  };

  // 解析选项
  for (let i = 1; i < args.length; i++) {
    switch (args[i]) {
      case '--limit':
      case '-l':
        options.limit = parseInt(args[++i]) || 50;
        break;
      case '--country':
      case '-c':
        options.country = args[++i] || '';
        break;
      case '--language':
      case '-lang':
        options.language = args[++i] || '';
        break;
      case '--domain':
      case '-d':
        options.domain = args[++i] || '';
        break;
      case '--exact':
      case '-e':
        options.exact = true;
        break;
      case '--timeline':
      case '-t':
        options.timeline = args[++i] || '7d';
        break;
      case '--export':
      case '-o':
        options.exportCSV = args[++i] || '';
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      default:
        // 忽略未知选项
        break;
    }
  }

  // 如果请求时间线，显示趋势
  if (options.timeline) {
    await showTimeline(keyword, options.timeline);
  } else {
    // 否则搜索新闻
    await searchNews(keyword, options);
  }
}

// 运行
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ 程序运行失败:', error);
    process.exit(1);
  });
}

// 导出函数供其他模块使用
export {
  searchNews,
  showTimeline,
};
