const TWITTER_API_BASE = 'https://api.twitterapi.io';

const MIN_SOCIAL_SIGNAL = {
  minFollowers: 100,
  minLikes: 5,
  minRetweets: 2,
  minReplies: 1,
  minViews: 1000,
  minTextLength: 40,
};

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
      tweets: filterTweets((data.tweets || []).map(t => ({
        id: t.id,
        title: t.text?.substring(0, 100) || '',
        text: t.text || '',
        url: t.url || `https://x.com/i/status/${t.id}`,
        source: 'twitter',
        sourceType: 'social',
        sourceEngine: 'twitter',
        sourceDomain: 'x.com',
        author: t.author?.userName || '',
        authorName: t.author?.name || '',
        authorFollowers: t.author?.followers || 0,
        likes: t.likeCount || 0,
        retweets: t.retweetCount || 0,
        replies: t.replyCount || 0,
        views: t.viewCount || 0,
        lang: t.lang || '',
        language: t.lang || '',
        createdAt: t.createdAt || '',
        timestamp: t.createdAt || new Date().toISOString()
      }))),
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
      source: 'twitter_trend',
      sourceType: 'social',
      sourceEngine: 'twitter-trends',
      sourceDomain: 'x.com',
    }));
  } catch (err) {
    console.error('Twitter trends error:', err.message);
    return [];
  }
}

function filterTweets(tweets) {
  return tweets.filter((tweet) => {
    const text = String(tweet.text || '').replace(/\s+/g, ' ').trim();
    const followers = Number(tweet.authorFollowers) || 0;
    const likes = Number(tweet.likes) || 0;
    const retweets = Number(tweet.retweets) || 0;
    const replies = Number(tweet.replies) || 0;
    const views = Number(tweet.views) || 0;
    const ageMs = Date.now() - new Date(tweet.timestamp).getTime();
    const isRecentEnough = !Number.isFinite(ageMs) || ageMs <= 14 * 24 * 60 * 60 * 1000;
    const looksLikeReply = /^(?:@[A-Za-z0-9_]+\s*){1,4}/.test(text);
    const meetsSignal =
      followers >= MIN_SOCIAL_SIGNAL.minFollowers ||
      likes >= MIN_SOCIAL_SIGNAL.minLikes ||
      retweets >= MIN_SOCIAL_SIGNAL.minRetweets ||
      replies >= MIN_SOCIAL_SIGNAL.minReplies ||
      views >= MIN_SOCIAL_SIGNAL.minViews;

    return Boolean(
      text &&
      text.length >= MIN_SOCIAL_SIGNAL.minTextLength &&
      isRecentEnough &&
      !looksLikeReply &&
      meetsSignal
    );
  });
}

module.exports = { searchTweets, getTrends, filterTweets };
