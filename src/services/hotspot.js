const { queryAll, queryOne, runSql } = require('../db');
const { searchWebMulti } = require('./search');
const { searchTweets, getTrends } = require('./twitter');
const { analyzeHotTopics } = require('./ai');
const { notifyHotTopics } = require('./email');

/**
 * Collect hot topics for all enabled domains
 */
async function collectHotTopics() {
  const domains = queryAll('SELECT * FROM domains WHERE enabled = 1');
  if (!domains.length) return;

  console.log(`[Hotspot] Collecting for ${domains.length} domains...`);

  for (const domain of domains) {
    try {
      await collectForDomain(domain);
    } catch (err) {
      console.error(`[Hotspot] Error collecting "${domain.name}":`, err.message);
    }
  }
}

async function collectForDomain(domain) {
  const name = domain.name;
  console.log(`[Hotspot] Collecting: "${name}"`);

  // Gather from multiple sources
  const [webResults, twitterData, trends] = await Promise.allSettled([
    searchWebMulti(`${name} 最新热点 新闻`, 10),
    searchTweets(name, 'Top'),
    getTrends(1) // worldwide trends
  ]);

  const allResults = [
    ...(webResults.status === 'fulfilled' ? webResults.value : []),
    ...(twitterData.status === 'fulfilled' ? twitterData.value.tweets : [])
  ];

  // Filter relevant trends
  const relevantTrends = (trends.status === 'fulfilled' ? trends.value : [])
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

  if (!combined.length) {
    console.log(`[Hotspot] No results for "${name}"`);
    return;
  }

  // AI analyze and score
  const topics = await analyzeHotTopics(name, combined);

  if (!topics.length) {
    console.log(`[Hotspot] No topics extracted for "${name}"`);
    return;
  }

  console.log(`[Hotspot] Got ${topics.length} hot topics for "${name}"`);

  // Store topics (deduplicate by title)
  const newTopics = [];
  for (const t of topics) {
    const existing = queryOne(
      'SELECT id FROM hot_topics WHERE title = ? AND domain = ?',
      [t.title, name]
    );
    if (!existing) {
      const sourceUrl = t.source_items?.[0]?.url || '';
      const sourceType = t.source_items?.[0]?.source || 'mixed';
      runSql(
        `INSERT INTO hot_topics (title, summary, source, source_url, score, domain, is_verified)
         VALUES (?, ?, ?, ?, ?, ?, 1)`,
        [t.title, t.summary || '', sourceType, sourceUrl, t.score || 0, name]
      );
      newTopics.push(t);
    }
  }

  // Send email digest if there are new topics
  if (newTopics.length > 0) {
    await notifyHotTopics(name, newTopics);
  }
}

module.exports = { collectHotTopics, collectForDomain };
