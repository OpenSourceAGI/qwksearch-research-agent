import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearTrendingNewsCache,
  readCachedTrendingNews,
  writeCachedTrendingNews,
} from '../src/lib/cache';

const CACHE_PREFIX = 'trending-news-cache:';
const TTL_MS = 10 * 60 * 1000;

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

  it('returns null for a key that was never written', () => {
    expect(readCachedTrendingNews('missing')).toBeNull();
  });

  it('serves entries written within the 10 minute TTL', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
    writeCachedTrendingNews('key-a', 'fresh');

    vi.setSystemTime(new Date('2024-01-01T00:09:59Z'));
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
