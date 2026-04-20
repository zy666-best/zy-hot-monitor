const { queryAll, queryOne, runSql } = require('../db');
const { searchWebMulti } = require('./search');
const { searchTweets } = require('./twitter');
const { verifyResults, expandQuery } = require('./ai');
const { notifyKeywordHit } = require('./email');
const { filterReliableResults } = require('./reliability');
const { logResultStage, logSourceBreakdown } = require('./debug-log');

// In-memory notification queue for browser push
const pendingNotifications = [];

function getPendingNotifications() {
  return pendingNotifications.splice(0);
}

/**
 * Check all enabled keywords
 */
async function checkKeywords() {
  const keywords = queryAll('SELECT * FROM keywords WHERE enabled = 1');
  if (!keywords.length) return;

  console.log(`[Monitor] Checking ${keywords.length} keywords...`);

  for (const kw of keywords) {
    try {
      await checkSingleKeyword(kw);
    } catch (err) {
      console.error(`[Monitor] Error checking "${kw.keyword}":`, err.message);
    }
  }
}

async function checkSingleKeyword(kw) {
  const keyword = kw.keyword;
  console.log(`[Monitor] Searching: "${keyword}"`);

  // Query expansion: generate semantic variants for better recall
  const expandedQueries = await expandQuery(keyword);

  // Search from multiple sources in parallel, using all expanded queries
  const searchPromises = expandedQueries.map(q =>
    Promise.allSettled([
      searchWebMulti(q, 8),
      searchTweets(q, 'Latest')
    ])
  );
  const expandedResults = await Promise.all(searchPromises);

  const allResults = [];
  for (const [webResults, twitterData] of expandedResults) {
    if (webResults.status === 'fulfilled') allResults.push(...webResults.value);
    if (twitterData.status === 'fulfilled') allResults.push(...twitterData.value.tweets);
  }

  logSourceBreakdown(`Keyword raw sources for "${keyword}" (expanded: ${expandedQueries.length} queries)`, {
    total: allResults,
  });
  logResultStage(`Keyword raw combined for "${keyword}"`, allResults);

  const filteredResults = filterReliableResults(allResults, { mode: 'keyword', query: keyword });
  logResultStage(`Keyword filtered for "${keyword}"`, filteredResults);

  if (!filteredResults.length) {
    console.log(`[Monitor] No results for "${keyword}"`);
    return;
  }

  // AI verify results
  const verified = await verifyResults(keyword, filteredResults);
  logResultStage(`Keyword verified for "${keyword}"`, verified);

  if (!verified.length) {
    console.log(`[Monitor] No verified results for "${keyword}"`);
    return;
  }

  // Check for duplicates (already stored)
  const newResults = [];
  for (const r of verified) {
    const existing = queryOne(
      `SELECT id FROM hot_topics
       WHERE (source_url != '' AND source_url = ?)
          OR (title = ? AND source = ?)`,
      [r.url || '', r.title, r.source]
    );
    if (!existing) {
      newResults.push(r);
    }
  }

  if (!newResults.length) {
    console.log(`[Monitor] No new results for "${keyword}"`);
    return;
  }

  console.log(`[Monitor] Found ${newResults.length} new results for "${keyword}"`);

  // Store and notify
  for (const r of newResults) {
    const { lastId } = runSql(
      `INSERT INTO hot_topics (
         title, summary, source, source_url, score, domain, is_verified, keyword_id,
         source_type, source_engine, source_domain, language, rule_score, cross_source_count,
         ai_reason, summary_type, published_at,
         author, author_name, author_followers, likes, retweets, replies, views,
         source_engines, source_domains
       ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, 'original', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        r.title,
        r.text || r.summary || '',
        r.source,
        r.url || '',
        (r.ai_relevance || r.ai_confidence || 0) * 100,
        keyword,
        kw.id,
        r.sourceType || '',
        r.sourceEngine || '',
        r.sourceDomain || '',
        r.language || '',
        r.ruleScore || r.rule_score || 0,
        r.crossSourceCount || r.cross_source_count || 1,
        r.ai_reason || '',
        r.timestamp || r.createdAt || '',
        r.author || '',
        r.authorName || '',
        Number(r.authorFollowers) || 0,
        Number(r.likes) || 0,
        Number(r.retweets) || 0,
        Number(r.replies) || 0,
        Number(r.views) || 0,
        r.sourceEngines || r.sourceEngine || '',
        r.sourceDomains || r.sourceDomain || '',
      ]
    );

    runSql(
      `INSERT INTO notifications (topic_id, type, channel, title, content)
       VALUES (?, 'keyword_hit', 'browser', ?, ?)`,
      [lastId, `关键词"${keyword}"命中`, r.title]
    );

    pendingNotifications.push({
      type: 'keyword_hit',
      keyword,
      title: r.title,
      summary: r.text || r.summary || '',
      url: r.url || '',
      source: r.source,
      confidence: r.ai_confidence
    });
  }

  // Send email notification
  await notifyKeywordHit(keyword, newResults);
}

module.exports = { checkKeywords, checkSingleKeyword, getPendingNotifications };
