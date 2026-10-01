import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearTrendingNewsCache,
  readCachedTrendingNews,
  readStaleCachedTrendingNews,
  writeCachedTrendingNews,
} from '../src/lib/cache';

const CACHE_PREFIX = 'trending-news-cache:v2:';
const TTL_MS = 24 * 60 * 60 * 1000;
const STALE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

describe('trending news cache', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('round-trips a cached value', () => {
    writeCachedTrendingNews('key-a', { topics: [] });
    expect(readCachedTrendingNews('key-a')).toEqual({ topics: [] });
  });

  it('namespaces stored keys', () => {
    writeCachedTrendingNews('key-a', 1);

    expect(window.localStorage.getItem(CACHE_PREFIX + 'key-a')).not.toBeNull();
    expect(window.localStorage.getItem('key-a')).toBeNull();
  });

  it('ignores entries written under the old, differently-shaped prefix', () => {
    window.localStorage.setItem(
      'trending-news-cache:key-a',
      JSON.stringify({ timestamp: Date.now(), data: 'old' })
    );

    expect(readCachedTrendingNews('key-a')).toBeNull();
    expect(readStaleCachedTrendingNews('key-a')).toBeNull();
  });

  it('returns null for a key that was never written', () => {
    expect(readCachedTrendingNews('missing')).toBeNull();
  });

  it('serves entries written within the 24 hour TTL', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
    writeCachedTrendingNews('key-a', 'fresh');

    vi.setSystemTime(new Date('2024-01-01T23:59:59Z'));
    expect(readCachedTrendingNews('key-a')).toBe('fresh');
  });

  it('expires and evicts entries older than the TTL', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
    writeCachedTrendingNews('key-a', 'stale');

    vi.setSystemTime(Date.now() + TTL_MS + 1);
    expect(readCachedTrendingNews('key-a')).toBeNull();
    expect(window.localStorage.getItem(CACHE_PREFIX + 'key-a')).toBeNull();
  });

  it('returns null instead of throwing on corrupted JSON', () => {
    window.localStorage.setItem(CACHE_PREFIX + 'key-a', 'not-json');
    expect(readCachedTrendingNews('key-a')).toBeNull();
  });

  it('swallows quota errors when writing', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    expect(() => writeCachedTrendingNews('key-a', 'x')).not.toThrow();
    setItem.mockRestore();
  });

  it('clearTrendingNewsCache removes only prefixed keys', () => {
    writeCachedTrendingNews('key-a', 1);
    writeCachedTrendingNews('key-b', 2);
    window.localStorage.setItem('other', 'keep');

    clearTrendingNewsCache();

    expect(readCachedTrendingNews('key-a')).toBeNull();
    expect(readCachedTrendingNews('key-b')).toBeNull();
    expect(window.localStorage.getItem('other')).toBe('keep');
  });
});

describe('readStaleCachedTrendingNews', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns a fresh entry, same as the normal read', () => {
    writeCachedTrendingNews('key-a', 'fresh');
    expect(readStaleCachedTrendingNews('key-a')).toBe('fresh');
  });

  it('still returns an entry past the 24 hour TTL', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
    writeCachedTrendingNews('key-a', 'yesterday');

    vi.setSystemTime(Date.now() + TTL_MS + 1);
    expect(readStaleCachedTrendingNews('key-a')).toBe('yesterday');
    // The entry is kept, not evicted: it is the only copy left to fall back on.
    expect(window.localStorage.getItem(CACHE_PREFIX + 'key-a')).not.toBeNull();
  });

  it('evicts and returns null past the 7 day stale window', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
    writeCachedTrendingNews('key-a', 'ancient');

    vi.setSystemTime(Date.now() + STALE_TTL_MS + 1);
    expect(readStaleCachedTrendingNews('key-a')).toBeNull();
    expect(window.localStorage.getItem(CACHE_PREFIX + 'key-a')).toBeNull();
  });

  it('returns null for a key that was never written', () => {
    expect(readStaleCachedTrendingNews('missing')).toBeNull();
  });

  it('returns null instead of throwing on corrupted JSON', () => {
    window.localStorage.setItem(CACHE_PREFIX + 'key-a', 'not-json');
    expect(readStaleCachedTrendingNews('key-a')).toBeNull();
  });
});
