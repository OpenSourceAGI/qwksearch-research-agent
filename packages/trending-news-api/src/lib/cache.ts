/**
 * Namespace for stored responses, versioned.
 *
 * The `v2` suffix is because the stored value changed from the mapped
 * camelCase result to the raw wire body, so an entry written by an older
 * version would be re-mapped and silently come back empty. A new prefix
 * ignores those instead.
 */
const CACHE_PREFIX = 'trending-news-cache:v2:';

/**
 * How long a cached response is served without asking the server again.
 *
 * A day, because the data is a daily snapshot: the server reads Wikipedia's
 * pageview ranking for a single UTC day and joins it to that day's headlines,
 * so a response fetched this morning is exactly as true this evening. A short
 * TTL here would only re-fetch the same body.
 */
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * How long a response is kept after it goes stale, to be used only when the
 * network fails.
 *
 * Yesterday's headlines are a better answer than an error message, and the
 * server rate-limits per-request, so a refresh that lands during a limit would
 * otherwise leave the visitor with nothing. Kept for a week, matching the
 * server's own last-good window.
 */
const STALE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type CacheEntry<T> = {
  timestamp: number;
  data: T;
};

function getStorage(): Storage | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  return window.localStorage;
}

function parse<T>(raw: string | null): CacheEntry<T> | null {
  if (!raw) return null;
  try {
    const entry = JSON.parse(raw) as CacheEntry<T>;
    return typeof entry?.timestamp === 'number' ? entry : null;
  } catch {
    return null;
  }
}

/**
 * Returns the cached value for `key` if it was written within the last 24
 * hours, evicting it from storage once it is too old to use.
 */
export function readCachedTrendingNews<T>(key: string): T | null {
  const storage = getStorage();
  if (!storage) return null;

  try {
    const entry = parse<T>(storage.getItem(CACHE_PREFIX + key));
    if (!entry) return null;
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      storage.removeItem(CACHE_PREFIX + key);
      return null;
    }

    return entry.data;
  } catch {
    return null;
  }
}

/**
 * Returns the cached value for `key` even if it is past its TTL, for up to a
 * week after it was written.
 *
 * Unlike `readCachedTrendingNews` this never evicts: the entry is the fallback
 * for a failed fetch, and evicting it here would throw away the only copy
 * exactly when it is needed. A caller that has no way to refresh should prefer
 * this over surfacing an error.
 */
export function readStaleCachedTrendingNews<T>(key: string): T | null {
  const storage = getStorage();
  if (!storage) return null;

  try {
    const entry = parse<T>(storage.getItem(CACHE_PREFIX + key));
    if (!entry) return null;
    if (Date.now() - entry.timestamp > STALE_TTL_MS) {
      storage.removeItem(CACHE_PREFIX + key);
      return null;
    }

    return entry.data;
  } catch {
    return null;
  }
}

export function writeCachedTrendingNews<T>(key: string, data: T): void {
  const storage = getStorage();
  if (!storage) return;

  try {
    const entry: CacheEntry<T> = { timestamp: Date.now(), data };
    storage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  } catch {
    // Storage full or unavailable (e.g. private browsing) — safe to ignore,
    // the next call will simply hit the network again.
  }
}

/** Clears all cached trending news responses. Mainly useful for tests/debugging. */
export function clearTrendingNewsCache(): void {
  const storage = getStorage();
  if (!storage) return;

  for (let i = storage.length - 1; i >= 0; i--) {
    const key = storage.key(i);
    if (key?.startsWith(CACHE_PREFIX)) storage.removeItem(key);
  }
}
