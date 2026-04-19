const { URL } = require('url');

const TRUSTED_DOMAINS = new Set([
  'openai.com',
  'anthropic.com',
  'googleblog.com',
  'microsoft.com',
  'github.com',
  'huggingface.co',
  'techcrunch.com',
  'theverge.com',
  'venturebeat.com',
  'wired.com',
  'arstechnica.com',
  'bilibili.com',
  'weibo.com',
  '36kr.com',
  'sspai.com',
  'jiqizhixin.com',
  'qbitai.com',
]);

const LOW_TRUST_HINTS = ['baijiahao.', 'sohu.com/a/', '163.com/dy/article', 'toutiao.com'];
const TRACKING_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'spm', 'from'];

function stripHtml(value = '') {
  return String(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractDomain(rawUrl = '') {
  if (!rawUrl) return '';

  try {
    const url = new URL(rawUrl);
    return url.hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

function normalizeUrl(rawUrl = '') {
  if (!rawUrl) return '';

  try {
    const url = new URL(rawUrl);
    url.hash = '';
    TRACKING_PARAMS.forEach((param) => url.searchParams.delete(param));
    if (url.protocol === 'http:') {
      url.protocol = 'https:';
    }
    return url.toString();
  } catch {
    return rawUrl.trim();
  }
}

function normalizeTitle(title = '') {
  return stripHtml(title)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function detectLanguage(...values) {
  const text = values.map((value) => stripHtml(value)).join(' ');
  const hasChinese = /[\u4e00-\u9fff]/.test(text);
  const hasEnglish = /[A-Za-z]/.test(text);

  if (hasChinese && hasEnglish) return 'mixed';
  if (hasChinese) return 'zh';
  if (hasEnglish) return 'en';
  return 'unknown';
}

function inferSourceType(result) {
  if (result.sourceType) return result.sourceType;

  const engine = String(result.sourceEngine || result.source || '').toLowerCase();
  const domain = String(result.sourceDomain || extractDomain(result.url)).toLowerCase();

  if (engine.includes('twitter') || domain === 'x.com' || domain === 'twitter.com' || domain === 'weibo.com' || domain === 'bilibili.com') {
    return 'social';
  }
  if (engine.includes('news')) {
    return 'news';
  }
  return 'web';
}

function inferSourceLabel(result) {
  const engine = String(result.sourceEngine || '').toLowerCase();
  const type = inferSourceType(result);
  if (type === 'social') {
    if (engine.includes('weibo')) return 'weibo';
    if (engine.includes('bilibili')) return 'bilibili';
    return 'twitter';
  }
  if (type === 'news') return 'news';
  return 'web';
}

function isTrustedDomain(domain) {
  if (!domain) return false;
  if (TRUSTED_DOMAINS.has(domain)) return true;
  return [...TRUSTED_DOMAINS].some((trusted) => domain.endsWith(`.${trusted}`));
}

function textLengthScore(text) {
  const length = stripHtml(text).length;
  if (length >= 180) return 8;
  if (length >= 100) return 6;
  if (length >= 50) return 4;
  if (length >= 25) return 2;
  return -4;
}

function freshnessScore(timestamp) {
  if (!timestamp) return 0;
  const ageMs = Date.now() - new Date(timestamp).getTime();
  if (!Number.isFinite(ageMs) || ageMs < 0) return 0;

  const hours = ageMs / (60 * 60 * 1000);
  if (hours <= 12) return 18;
  if (hours <= 24) return 14;
  if (hours <= 72) return 10;
  if (hours <= 7 * 24) return 5;
  if (hours <= 14 * 24) return 1;
  return -6;
}

function socialScore(result) {
  const likes = Number(result.likes) || 0;
  const retweets = Number(result.retweets) || 0;
  const replies = Number(result.replies) || 0;
  const views = Number(result.views) || 0;
  const followers = Number(result.authorFollowers) || 0;
  const text = stripHtml(result.text || result.summary || result.title);

  let score = 0;

  if (followers >= 100) score += 4;
  if (followers >= 1000) score += 6;
  if (followers >= 10000) score += 8;

  if (likes >= 5) score += 5;
  if (likes >= 20) score += 5;
  if (retweets >= 2) score += 5;
  if (retweets >= 10) score += 4;
  if (replies >= 2) score += 3;
  if (views >= 1000) score += 3;
  if (views >= 10000) score += 4;

  if (/^(?:@[A-Za-z0-9_]+\s*){1,4}/.test(text)) score -= 20;
  if (text.length < 40) score -= 10;

  return score;
}

function mergeResult(target, incoming) {
  target.sourceEngineSet = target.sourceEngineSet || new Set([target.sourceEngine || 'unknown']);
  target.sourceDomainSet = target.sourceDomainSet || new Set(target.sourceDomain ? [target.sourceDomain] : []);
  target.sourceEngineSet.add(incoming.sourceEngine || 'unknown');
  if (incoming.sourceDomain) target.sourceDomainSet.add(incoming.sourceDomain);

  if ((incoming.ruleScore || 0) > (target.ruleScore || 0)) {
    target.ruleScore = incoming.ruleScore;
  }

  if (stripHtml(incoming.text).length > stripHtml(target.text).length) {
    target.text = incoming.text;
    target.summary = incoming.summary || incoming.text || target.summary;
  }

  if (!target.url && incoming.url) target.url = incoming.url;
  if (!target.sourceDomain && incoming.sourceDomain) target.sourceDomain = incoming.sourceDomain;
  if (!target.timestamp || new Date(incoming.timestamp).getTime() > new Date(target.timestamp).getTime()) {
    target.timestamp = incoming.timestamp;
  }

  target.likes = Math.max(Number(target.likes) || 0, Number(incoming.likes) || 0);
  target.retweets = Math.max(Number(target.retweets) || 0, Number(incoming.retweets) || 0);
  target.replies = Math.max(Number(target.replies) || 0, Number(incoming.replies) || 0);
  target.views = Math.max(Number(target.views) || 0, Number(incoming.views) || 0);
  target.authorFollowers = Math.max(Number(target.authorFollowers) || 0, Number(incoming.authorFollowers) || 0);

  return target;
}

function enrichResult(result) {
  const cleanedText = stripHtml(result.text || result.summary || '');
  const sourceDomain = result.sourceDomain || extractDomain(result.url || '');
  const sourceEngine = result.sourceEngine || result.source || 'unknown';
  const sourceType = inferSourceType({ ...result, sourceDomain, sourceEngine });
  const language = result.language || detectLanguage(result.title, cleanedText);

  return {
    ...result,
    title: stripHtml(result.title || ''),
    text: cleanedText,
    summary: stripHtml(result.summary || cleanedText),
    url: normalizeUrl(result.url || result.source_url || ''),
    source: inferSourceLabel({ ...result, sourceType, sourceEngine, sourceDomain }),
    sourceType,
    sourceEngine,
    sourceDomain,
    language,
    timestamp: result.timestamp || result.createdAt || new Date().toISOString(),
  };
}

function dedupeResults(results) {
  const map = new Map();

  for (const rawResult of results) {
    const result = enrichResult(rawResult);
    if (!result.title) continue;

    const key = result.url || normalizeTitle(result.title).slice(0, 140);
    if (!key) continue;

    if (!map.has(key)) {
      map.set(key, {
        ...result,
        sourceEngineSet: new Set([result.sourceEngine || 'unknown']),
        sourceDomainSet: new Set(result.sourceDomain ? [result.sourceDomain] : []),
      });
      continue;
    }

    mergeResult(map.get(key), result);
  }

  return [...map.values()].map((result) => ({
    ...result,
    crossSourceCount: result.sourceEngineSet.size,
    cross_source_count: result.sourceEngineSet.size,
  }));
}

function scoreResult(result, context = {}) {
  let score = 0;
  const domain = result.sourceDomain;
  const sourceType = result.sourceType;
  const mode = context.mode || 'keyword';
  const fullText = `${result.title} ${result.text || result.summary || ''}`;

  if (sourceType === 'news') score += 28;
  if (sourceType === 'web') score += 18;
  if (sourceType === 'social') score += 8;

  if (isTrustedDomain(domain)) score += 20;
  if (LOW_TRUST_HINTS.some((hint) => (result.url || '').includes(hint))) score -= 18;
  if (!domain && sourceType !== 'social') score -= 6;

  score += textLengthScore(fullText);
  score += freshnessScore(result.timestamp);
  score += Math.min(18, Math.max(0, ((result.crossSourceCount || 1) - 1) * 8));

  if (sourceType === 'social') {
    score += socialScore(result);
  }

  if (result.language === 'mixed') score += 4;
  else if (result.language === 'zh' || result.language === 'en') score += 2;

  if (mode === 'keyword' && sourceType === 'social' && !isTrustedDomain(domain)) {
    score -= 6;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

function filterReliableResults(results, context = {}) {
  const ranked = dedupeResults(results)
    .map((result) => {
      const ruleScore = scoreResult(result, context);
      return {
        ...result,
        ruleScore,
        rule_score: ruleScore,
      };
    })
    .sort((left, right) => {
      if (right.ruleScore !== left.ruleScore) return right.ruleScore - left.ruleScore;
      return new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime();
    });

  const threshold = context.mode === 'hotspot' ? 40 : 45;
  return ranked.filter((result) => {
    if (result.ruleScore < threshold) return false;
    if (result.sourceType !== 'social') return true;
    return result.ruleScore >= threshold + 8;
  });
}

module.exports = {
  TRUSTED_DOMAINS,
  stripHtml,
  extractDomain,
  normalizeUrl,
  normalizeTitle,
  detectLanguage,
  isTrustedDomain,
  dedupeResults,
  scoreResult,
  filterReliableResults,
};