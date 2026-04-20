const { queryAll, queryOne, runSql } = require('../db');
const { searchWebMulti } = require('./search');
const { searchTweets, getTrends } = require('./twitter');
const { analyzeHotTopics, expandQuery } = require('./ai');
const { notifyHotTopics } = require('./email');
const { filterReliableResults } = require('./reliability');
const { logResultStage, logSourceBreakdown } = require('./debug-log');

/**
 * Collect hot topics for all enabled domains
 */
async function collectHotTopics() {
  const domains = queryAll('SELECT * FROM domains WHERE enabled = 1');
  if (!domains.length) return;

  console.log(`[Hotspot] Collecting for ${domains.length} domains...`);

  const startedAt = Date.now();
  const results = await Promise.allSettled(domains.map((domain) => collectForDomain(domain)));
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.error(`[Hotspot] Error collecting "${domains[index].name}":`, result.reason?.message || result.reason);
    }
  });
  console.log(`[Hotspot] Collection finished in ${Date.now() - startedAt}ms`);
}

async function collectForDomain(domain) {
  const name = domain.name;
  const startedAt = Date.now();
  console.log(`[Hotspot] Collecting: "${name}"`);

  // Query expansion for better domain coverage
  const expandedQueries = await expandQuery(name);

  // Gather from multiple sources using expanded queries
  const searchPromises = expandedQueries.map(q =>
    Promise.allSettled([
      searchWebMulti(`${q} 最新热点 新闻`, 10),
      searchTweets(q, 'Top'),
    ])
  );
  const expandedResults = await Promise.all(searchPromises);

  const allResults = [];
  for (const [webResults, twitterData] of expandedResults) {
    if (webResults.status === 'fulfilled') allResults.push(...webResults.value);
    if (twitterData.status === 'fulfilled') allResults.push(...twitterData.value.tweets);
  }

  // Also fetch worldwide trends (only once, not per expansion)
  const trends = await getTrends(1).catch(() => []);

  // Filter relevant trends
  const relevantTrends = (Array.isArray(trends) ? trends : [])
    .filter(t => {
      const query = (t.query || t.title || '').toLowerCase();
      const domainLower = name.toLowerCase();
      return query.includes(domainLower) || domainLower.split(/\s+/).some(w => query.includes(w));
    })
    .map(t => ({
      title: t.title,
      text: t.description || `Twitter趋势 #${t.rank}: ${t.title}`,
      url: `https://x.com/search?q=${encodeURIComponent(t.query || t.title)}`,
      source: 'twitter_trend',
      timestamp: new Date().toISOString()
    }));

  const combined = [...allResults, ...relevantTrends];

  logSourceBreakdown(`Hotspot raw sources for "${name}" (expanded: ${expandedQueries.length} queries)`, {
    total: allResults,
    trends: relevantTrends,
  });
  logResultStage(`Hotspot raw combined for "${name}"`, combined);

  const filteredResults = filterReliableResults(combined, { mode: 'hotspot', query: name });
  logResultStage(`Hotspot filtered for "${name}"`, filteredResults);

  if (!filteredResults.length) {
    console.log(`[Hotspot] No results for "${name}"`);
    return;
  }

  // AI analyze and score
  const topics = await analyzeHotTopics(name, filteredResults);
  logResultStage(`Hotspot analyzed topics for "${name}"`, topics);

  if (!topics.length) {
    console.log(`[Hotspot] No topics extracted for "${name}"`);
    return;
  }

  console.log(`[Hotspot] Got ${topics.length} hot topics for "${name}"`);

  // Store topics (deduplicate by title)
  const newTopics = [];
  for (const t of topics) {
    const existing = queryOne(
      `SELECT id FROM hot_topics
       WHERE (source_url != '' AND source_url = ?)
          OR (title = ? AND domain = ?)`,
      [t.source_items?.[0]?.url || '', t.title, name]
    );
    if (!existing) {
      const sourceUrl = t.source_items?.[0]?.url || '';
      const sourceType = t.source_items?.[0]?.source || 'mixed';
      const sourceMeta = t.source_items?.[0] || {};
      runSql(
        `INSERT INTO hot_topics (
           title, summary, source, source_url, score, domain, is_verified,
           source_type, source_engine, source_domain, language, rule_score, cross_source_count,
           ai_reason, summary_type, published_at,
           author, author_name, author_followers, likes, retweets, replies, views,
           source_engines, source_domains
         ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, 'ai', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          t.title,
          t.summary || '',
          sourceType,
          sourceUrl,
          t.score || 0,
          name,
          sourceMeta.sourceType || '',
          sourceMeta.sourceEngine || '',
          sourceMeta.sourceDomain || '',
          sourceMeta.language || '',
          sourceMeta.ruleScore || sourceMeta.rule_score || 0,
          sourceMeta.crossSourceCount || sourceMeta.cross_source_count || 1,
          t.reason || '',
          sourceMeta.timestamp || sourceMeta.createdAt || '',
          sourceMeta.author || '',
          sourceMeta.authorName || '',
          Number(sourceMeta.authorFollowers) || 0,
          Number(sourceMeta.likes) || 0,
          Number(sourceMeta.retweets) || 0,
          Number(sourceMeta.replies) || 0,
          Number(sourceMeta.views) || 0,
          sourceMeta.sourceEngines || sourceMeta.sourceEngine || '',
          sourceMeta.sourceDomains || sourceMeta.sourceDomain || '',
        ]
      );
      newTopics.push(t);
    }
  }

  // Send email digest if there are new topics
  if (newTopics.length > 0) {
    await notifyHotTopics(name, newTopics);
  }

  console.log(`[Hotspot] Domain "${name}" finished in ${Date.now() - startedAt}ms`);
}

module.exports = { collectHotTopics, collectForDomain };
