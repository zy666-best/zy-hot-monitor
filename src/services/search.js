const cheerio = require('cheerio');
const { cachedFetchJson, cachedFetchText } = require('./fetch-utils');
const { extractDomain, stripHtml } = require('./reliability');

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0',
];

function randomUA() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

const DEFAULT_HEADERS = {
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
};

const PRIORITY_SITE_GROUP = [
  'bilibili.com',
  'weibo.com',
  '36kr.com',
  'sspai.com',
  'jiqizhixin.com',
  'qbitai.com',
];

function buildHeaders(referer) {
  return {
    ...DEFAULT_HEADERS,
    'User-Agent': randomUA(),
    ...(referer ? { Referer: referer } : {}),
  };
}

function toResult({ title, text, url, sourceEngine, sourceType = 'web', author, authorName, views, likes, replies, retweets, authorFollowers }) {
  return {
    title: stripHtml(title),
    text: stripHtml(text),
    url: url || '',
    source: sourceType === 'news' ? 'news' : 'web',
    sourceType,
    sourceEngine,
    sourceDomain: extractDomain(url),
    timestamp: new Date().toISOString(),
    author: author || '',
    authorName: authorName || '',
    views: Number(views) || 0,
    likes: Number(likes) || 0,
    replies: Number(replies) || 0,
    retweets: Number(retweets) || 0,
    authorFollowers: Number(authorFollowers) || 0,
  };
}

function normalizeBilibiliUrl(rawUrl = '', bvid = '') {
  if (rawUrl && /^https?:\/\//i.test(rawUrl)) {
    return rawUrl.replace(/^http:\/\//i, 'https://');
  }
  if (bvid) {
    return `https://www.bilibili.com/video/${bvid}`;
  }
  return rawUrl || '';
}

async function fetchHtml(url, options = {}) {
  return cachedFetchText(url, {
    ttlMs: options.ttlMs,
    timeoutMs: options.timeoutMs || 5000,
    cacheKey: options.cacheKey,
    headers: buildHeaders(options.referer),
  });
}

function dedupeEngineResults(results) {
  const seen = new Set();
  return results.filter((result) => {
    const key = (result.url || result.title || '').toLowerCase().replace(/\s+/g, ' ').trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Search via DuckDuckGo HTML (no API key needed)
 */
async function searchWeb(query, maxResults = 10) {
  try {
    const encodedQuery = encodeURIComponent(query);
    const url = `https://html.duckduckgo.com/html/?q=${encodedQuery}`;
    const html = await fetchHtml(url, {
      cacheKey: `ddg:${query}`,
      ttlMs: 30 * 60 * 1000,
    });
    const $ = cheerio.load(html);
    const results = [];

    $('.result').each((i, el) => {
      if (i >= maxResults) return false;
      const $el = $(el);
      const title = $el.find('.result__title .result__a').text().trim();
      const snippet = $el.find('.result__snippet').text().trim();
      const href = $el.find('.result__title .result__a').attr('href') || '';

      if (title) results.push(toResult({ title, text: snippet, url: href, sourceEngine: 'duckduckgo', sourceType: 'web' }));
    });

    return dedupeEngineResults(results).slice(0, maxResults);
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
    const html = await fetchHtml(url, {
      cacheKey: `bing:${query}`,
      ttlMs: 30 * 60 * 1000,
    });
    const $ = cheerio.load(html);
    const results = [];

    $('li.b_algo').each((i, el) => {
      if (i >= maxResults) return false;
      const $el = $(el);
      const title = $el.find('h2 a').text().trim();
      const snippet = $el.find('.b_caption p').text().trim();
      const href = $el.find('h2 a').attr('href') || '';

      if (title) results.push(toResult({ title, text: snippet, url: href, sourceEngine: 'bing', sourceType: 'web' }));
    });

    return dedupeEngineResults(results).slice(0, maxResults);
  } catch (err) {
    console.error('Bing search error:', err.message);
    return [];
  }
}

async function searchBingNews(query, maxResults = 8) {
  try {
    const encodedQuery = encodeURIComponent(query);
    const url = `https://www.bing.com/news/search?q=${encodedQuery}&setlang=zh-Hans`;
    const html = await fetchHtml(url, {
      cacheKey: `bing-news:${query}`,
      ttlMs: 20 * 60 * 1000,
    });
    const $ = cheerio.load(html);
    const results = [];

    $('a.title, a.news-card').each((index, element) => {
      if (index >= maxResults) return false;
      const $element = $(element);
      const title = $element.text().trim();
      const href = $element.attr('href') || '';
      const snippet = $element.closest('div').find('.snippet, .caption, .source').first().text().trim();
      if (title && href) results.push(toResult({ title, text: snippet, url: href, sourceEngine: 'bing-news', sourceType: 'news' }));
      return undefined;
    });

    return dedupeEngineResults(results).slice(0, maxResults);
  } catch (err) {
    console.error('Bing news error:', err.message);
    return [];
  }
}

async function searchBilibili(query, maxResults = 6) {
  try {
    const encodedQuery = encodeURIComponent(query);
    const url = `https://api.bilibili.com/x/web-interface/wbi/search/type?search_type=video&keyword=${encodedQuery}&page=1`;
    const payload = await cachedFetchJson(url, {
      cacheKey: `bilibili:${query}`,
      ttlMs: 15 * 60 * 1000,
      timeoutMs: 5000,
      headers: {
        ...buildHeaders('https://www.bilibili.com/'),
        Accept: 'application/json, text/plain, */*',
      },
    });

    const results = Array.isArray(payload?.data?.result) ? payload.data.result : [];
    return results
      .slice(0, maxResults)
      .map((item) => {
        const title = item.title || '';
        const videoUrl = normalizeBilibiliUrl(item.arcurl, item.bvid);
        return toResult({
          title,
          text: item.description || '',
          url: videoUrl,
          sourceEngine: 'bilibili-api',
          sourceType: 'social',
          author: item.author || '',
          authorName: item.author || '',
          views: Number(item.play) || 0,
          likes: Number(item.like) || 0,
          replies: Number(item.review) || 0,
        });
      })
      .filter((item) => item.title && item.url);
  } catch (err) {
    console.error('Bilibili search error:', err.message);
    return [];
  }
}

async function searchPriorityDomains(query, maxResults = 8) {
  try {
    const siteQuery = `${query} (${PRIORITY_SITE_GROUP.map((domain) => `site:${domain}`).join(' OR ')})`;
    return searchBing(siteQuery, maxResults).then((results) => results.map((result) => ({
      ...result,
      sourceEngine: 'bing-priority-sites',
    })));
  } catch (err) {
    console.error('Priority domain search error:', err.message);
    return [];
  }
}

/**
 * Aggregate web search from multiple engines
 */
async function searchWebMulti(query, maxResults = 10) {
  const [ddgResults, bingResults, bingNewsResults, priorityDomainResults, bilibiliResults] = await Promise.allSettled([
    searchWeb(query, maxResults),
    searchBing(query, maxResults),
    searchBingNews(query, Math.max(4, Math.ceil(maxResults / 2))),
    searchPriorityDomains(query, Math.max(4, Math.ceil(maxResults / 2))),
    searchBilibili(query, Math.max(4, Math.ceil(maxResults / 2))),
  ]);

  const all = [
    ...(ddgResults.status === 'fulfilled' ? ddgResults.value : []),
    ...(bingResults.status === 'fulfilled' ? bingResults.value : []),
    ...(bingNewsResults.status === 'fulfilled' ? bingNewsResults.value : []),
    ...(priorityDomainResults.status === 'fulfilled' ? priorityDomainResults.value : []),
    ...(bilibiliResults.status === 'fulfilled' ? bilibiliResults.value : []),
  ];

  return dedupeEngineResults(all).slice(0, maxResults * 2);
}

module.exports = {
  searchWeb,
  searchBing,
  searchBingNews,
  searchBilibili,
  searchPriorityDomains,
  searchWebMulti,
};
