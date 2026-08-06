const CACHE_PREFIX = 'trending-news-cache:';
const CACHE_TTL_MS = 10 * 60 * 1000;

type CacheEntry<T> = {
  timestamp: number;
  data: T;
};

function getStorage(): Storage | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  return window.localStorage;
}

/** Returns the cached value for `key` if it was written within the last 10 minutes. */
export function readCachedTrendingNews<T>(key: string): T | null {
  const storage = getStorage();
  if (!storage) return null;

  try {
    const raw = storage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;

    const entry = JSON.parse(raw) as CacheEntry<T>;
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
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
