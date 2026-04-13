const cheerio = require('cheerio');

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0',
];

function randomUA() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * Search via DuckDuckGo HTML (no API key needed)
 */
async function searchWeb(query, maxResults = 10) {
  try {
    const encodedQuery = encodeURIComponent(query);
    const url = `https://html.duckduckgo.com/html/?q=${encodedQuery}`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': randomUA(),
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      }
    });

    if (!res.ok) {
      console.error(`Web search failed: ${res.status}`);
      return [];
    }

    const html = await res.text();
    const $ = cheerio.load(html);
    const results = [];

    $('.result').each((i, el) => {
      if (i >= maxResults) return false;
      const $el = $(el);
      const title = $el.find('.result__title .result__a').text().trim();
      const snippet = $el.find('.result__snippet').text().trim();
      const href = $el.find('.result__title .result__a').attr('href') || '';

      if (title) {
        results.push({
          title,
          text: snippet,
          url: href,
          source: 'web',
          timestamp: new Date().toISOString()
        });
      }
    });

    return results;
  } catch (err) {
    console.error('Web search error:', err.message);
    return [];
  }
}

/**
 * Search via Bing (scraping, no API key)
 */
async function searchBing(query, maxResults = 10) {
  try {
    const encodedQuery = encodeURIComponent(query);
    const url = `https://www.bing.com/search?q=${encodedQuery}&setlang=zh-Hans&count=${maxResults}`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': randomUA(),
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      }
    });

    if (!res.ok) return [];

    const html = await res.text();
    const $ = cheerio.load(html);
    const results = [];

    $('li.b_algo').each((i, el) => {
      if (i >= maxResults) return false;
      const $el = $(el);
      const title = $el.find('h2 a').text().trim();
      const snippet = $el.find('.b_caption p').text().trim();
      const href = $el.find('h2 a').attr('href') || '';

      if (title) {
        results.push({
          title,
          text: snippet,
          url: href,
          source: 'web',
          timestamp: new Date().toISOString()
        });
      }
    });

    return results;
  } catch (err) {
    console.error('Bing search error:', err.message);
    return [];
  }
}

/**
 * Aggregate web search from multiple engines
 */
async function searchWebMulti(query, maxResults = 10) {
  const [ddgResults, bingResults] = await Promise.allSettled([
    searchWeb(query, maxResults),
    searchBing(query, maxResults)
  ]);

  const all = [
    ...(ddgResults.status === 'fulfilled' ? ddgResults.value : []),
    ...(bingResults.status === 'fulfilled' ? bingResults.value : [])
  ];

  // Deduplicate by title similarity
  const seen = new Set();
  return all.filter(r => {
    const key = r.title.toLowerCase().replace(/\s+/g, '').substring(0, 30);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, maxResults);
}

module.exports = { searchWeb, searchBing, searchWebMulti };
