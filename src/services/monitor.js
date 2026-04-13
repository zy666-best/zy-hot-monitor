const { queryAll, queryOne, runSql } = require('../db');
const { searchWebMulti } = require('./search');
const { searchTweets } = require('./twitter');
const { verifyResults } = require('./ai');
const { notifyKeywordHit } = require('./email');

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

  // Search from multiple sources in parallel
  const [webResults, twitterData] = await Promise.allSettled([
    searchWebMulti(keyword, 8),
    searchTweets(keyword, 'Latest')
  ]);

  const allResults = [
    ...(webResults.status === 'fulfilled' ? webResults.value : []),
    ...(twitterData.status === 'fulfilled' ? twitterData.value.tweets : [])
  ];

  if (!allResults.length) {
    console.log(`[Monitor] No results for "${keyword}"`);
    return;
  }

  // AI verify results
  const verified = await verifyResults(keyword, allResults);

  if (!verified.length) {
    console.log(`[Monitor] No verified results for "${keyword}"`);
    return;
  }

  // Check for duplicates (already stored)
  const newResults = [];
  for (const r of verified) {
    const existing = queryOne(
      'SELECT id FROM hot_topics WHERE title = ? AND source = ?',
      [r.title, r.source]
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
      `INSERT INTO hot_topics (title, summary, source, source_url, score, domain, is_verified, keyword_id)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
      [r.title, r.text || r.summary || '', r.source, r.url || '', r.ai_confidence * 100, keyword, kw.id]
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
