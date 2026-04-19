const DEFAULT_TTL_MS = 30 * 60 * 1000;
const DEFAULT_TIMEOUT_MS = 5000;

const responseCache = new Map();

async function fetchWithTimeout(url, options = {}) {
  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    cacheKey,
    ttlMs,
    ...fetchOptions
  } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function cachedValue(key, ttlMs, loader) {
  const now = Date.now();
  const cached = responseCache.get(key);
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  const value = await loader();
  responseCache.set(key, {
    value,
    expiresAt: now + ttlMs,
  });
  return value;
}

async function cachedFetchText(url, options = {}) {
  const { cacheKey = `text:${url}`, ttlMs = DEFAULT_TTL_MS } = options;
  return cachedValue(cacheKey, ttlMs, async () => {
    const response = await fetchWithTimeout(url, options);
    if (!response.ok) {
      throw new Error(`Request failed ${response.status} for ${url}`);
    }
    return response.text();
  });
}

async function cachedFetchJson(url, options = {}) {
  const { cacheKey = `json:${url}`, ttlMs = DEFAULT_TTL_MS } = options;
  return cachedValue(cacheKey, ttlMs, async () => {
    const response = await fetchWithTimeout(url, options);
    if (!response.ok) {
      throw new Error(`Request failed ${response.status} for ${url}`);
    }
    return response.json();
  });
}

module.exports = {
  fetchWithTimeout,
  cachedFetchText,
  cachedFetchJson,
};