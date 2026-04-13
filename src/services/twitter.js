const TWITTER_API_BASE = 'https://api.twitterapi.io';

function getApiKey() {
  return process.env.TWITTER_API_KEY || '';
}

/**
 * Twitter Advanced Search
 * @param {string} query - Search query (supports Twitter advanced search syntax)
 * @param {string} queryType - 'Latest' or 'Top'
 * @param {string} cursor - Pagination cursor
 */
async function searchTweets(query, queryType = 'Latest', cursor = '') {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn('TWITTER_API_KEY not configured, skipping Twitter search');
    return { tweets: [], has_next_page: false };
  }

  try {
    const params = new URLSearchParams({
      query,
      queryType,
    });
    if (cursor) params.set('cursor', cursor);

    const res = await fetch(`${TWITTER_API_BASE}/twitter/tweet/advanced_search?${params}`, {
      headers: { 'X-API-Key': apiKey }
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`Twitter search error ${res.status}: ${errText}`);
      return { tweets: [], has_next_page: false };
    }

    const data = await res.json();
    return {
      tweets: (data.tweets || []).map(t => ({
        id: t.id,
        title: t.text?.substring(0, 100) || '',
        text: t.text || '',
        url: t.url || `https://x.com/i/status/${t.id}`,
        source: 'twitter',
        author: t.author?.userName || '',
        authorName: t.author?.name || '',
        authorFollowers: t.author?.followers || 0,
        likes: t.likeCount || 0,
        retweets: t.retweetCount || 0,
        replies: t.replyCount || 0,
        views: t.viewCount || 0,
        lang: t.lang || '',
        createdAt: t.createdAt || '',
        timestamp: t.createdAt || new Date().toISOString()
      })),
      has_next_page: data.has_next_page || false,
      next_cursor: data.next_cursor || ''
    };
  } catch (err) {
    console.error('Twitter search error:', err.message);
    return { tweets: [], has_next_page: false };
  }
}

/**
 * Get Twitter trending topics
 * @param {number} woeid - 1 = worldwide, 23424977 = US, 23424856 = Japan
 */
async function getTrends(woeid = 1) {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn('TWITTER_API_KEY not configured, skipping Twitter trends');
    return [];
  }

  try {
    const params = new URLSearchParams({ woeid: String(woeid) });
    const res = await fetch(`${TWITTER_API_BASE}/twitter/trends?${params}`, {
      headers: { 'X-API-Key': apiKey }
    });

    if (!res.ok) return [];

    const data = await res.json();
    return (data.trends || []).map(t => ({
      title: t.name || '',
      query: t.target?.query || t.name || '',
      rank: t.rank || 0,
      description: t.meta_description || '',
      source: 'twitter_trend'
    }));
  } catch (err) {
    console.error('Twitter trends error:', err.message);
    return [];
  }
}

module.exports = { searchTweets, getTrends };
