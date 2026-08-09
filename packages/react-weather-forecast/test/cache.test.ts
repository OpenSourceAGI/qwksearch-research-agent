import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearWeatherForecastCache,
  readCachedForecast,
  writeCachedForecast,
} from '../src/lib/cache';

const CACHE_PREFIX = 'weather-forecast-cache:';
const TTL_MS = 30 * 60 * 1000;

describe('forecast cache', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('round-trips a cached value', () => {
    writeCachedForecast('key-a', { temperature: 72 });
    expect(readCachedForecast('key-a')).toEqual({ temperature: 72 });
  });

  it('namespaces stored keys so unrelated localStorage entries are untouched', () => {
    window.localStorage.setItem('unrelated', 'keep me');
    writeCachedForecast('key-a', 1);

    expect(window.localStorage.getItem(CACHE_PREFIX + 'key-a')).not.toBeNull();
    expect(window.localStorage.getItem('key-a')).toBeNull();
    expect(window.localStorage.getItem('unrelated')).toBe('keep me');
  });

  it('returns null for a key that was never written', () => {
    expect(readCachedForecast('missing')).toBeNull();
  });

  it('serves entries written within the 30 minute TTL', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
    writeCachedForecast('key-a', 'fresh');

    vi.setSystemTime(new Date('2024-01-01T00:29:59Z'));
    expect(readCachedForecast('key-a')).toBe('fresh');
  });

  it('expires and evicts entries older than the TTL', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
    writeCachedForecast('key-a', 'stale');

    vi.setSystemTime(Date.now() + TTL_MS + 1);
    expect(readCachedForecast('key-a')).toBeNull();
    // The expired entry is removed rather than left to accumulate.
    expect(window.localStorage.getItem(CACHE_PREFIX + 'key-a')).toBeNull();
  });

  it('returns null instead of throwing on corrupted JSON', () => {
    window.localStorage.setItem(CACHE_PREFIX + 'key-a', '{not json');
    expect(readCachedForecast('key-a')).toBeNull();
  });

  it('swallows quota errors when writing', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    expect(() => writeCachedForecast('key-a', 'x')).not.toThrow();
    setItem.mockRestore();
  });

  it('clearWeatherForecastCache removes only prefixed keys', () => {
    writeCachedForecast('key-a', 1);
    writeCachedForecast('key-b', 2);
    window.localStorage.setItem('other', 'keep');

    clearWeatherForecastCache();

    expect(readCachedForecast('key-a')).toBeNull();
    expect(readCachedForecast('key-b')).toBeNull();
    expect(window.localStorage.getItem('other')).toBe('keep');
  });
});
