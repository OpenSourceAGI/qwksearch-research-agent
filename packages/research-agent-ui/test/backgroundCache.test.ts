/**
 * @fileoverview The homepage background cache: the `localStorage` list of what
 * is cached, and its agreement with Cache Storage, which is what lets the
 * homepage show a cached piece on load instead of fetching a random one.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BACKGROUND_ARTWORKS } from '../src/components/ChatConversation/background-art';
import {
  BACKGROUND_CACHE_LIST_KEY,
  MAX_CACHED_BACKGROUNDS,
  cacheBackground,
  forgetCachedBackground,
  loadCachedBackground,
  pickCachedBackground,
  pickUncachedBackground,
  readCachedBackgroundList,
  rememberCachedBackground,
} from '../src/components/ChatConversation/background-cache';

/** A Cache Storage stand-in: one bucket, keyed by URL. */
function fakeCaches() {
  const store = new Map<string, Response>();
  const cache = {
    match: vi.fn(async (url: string) => store.get(url)?.clone()),
    put: vi.fn(async (url: string, response: Response) => {
      store.set(url, response);
    }),
    delete: vi.fn(async (url: string) => store.delete(url)),
  };
  return { store, cache, caches: { open: vi.fn(async () => cache) } };
}

const [first, second, third] = BACKGROUND_ARTWORKS;

let objectUrlCount = 0;

beforeEach(() => {
  localStorage.clear();
  objectUrlCount = 0;
  vi.stubGlobal('URL', Object.assign(URL, {
    createObjectURL: vi.fn(() => `blob:test/${++objectUrlCount}`),
    revokeObjectURL: vi.fn(),
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('the cached background list', () => {
  it('is empty on a first visit', () => {
    expect(readCachedBackgroundList()).toEqual([]);
    expect(pickCachedBackground()).toBeNull();
  });

  it('ignores entries that are not artworks, duplicates and garbage', () => {
    localStorage.setItem(
      BACKGROUND_CACHE_LIST_KEY,
      JSON.stringify([first, 'https://evil.example/x.png', first, 42]),
    );
    expect(readCachedBackgroundList()).toEqual([first]);

    localStorage.setItem(BACKGROUND_CACHE_LIST_KEY, '{not json');
    expect(readCachedBackgroundList()).toEqual([]);
  });

  it('keeps the newest entries and reports the evicted ones', () => {
    const pieces = BACKGROUND_ARTWORKS.slice(0, MAX_CACHED_BACKGROUNDS + 2);
    const evicted = pieces.flatMap((url) => rememberCachedBackground(url));
    expect(evicted).toEqual(pieces.slice(0, 2));
    expect(readCachedBackgroundList()).toEqual(pieces.slice(2));
  });

  it('moves a re-cached piece to the end instead of duplicating it', () => {
    rememberCachedBackground(first);
    rememberCachedBackground(second);
    rememberCachedBackground(first);
    expect(readCachedBackgroundList()).toEqual([second, first]);
  });

  it('picks a cached piece other than the one on screen', () => {
    rememberCachedBackground(first);
    rememberCachedBackground(second);
    for (let i = 0; i < 20; i++) expect(pickCachedBackground(first)).toBe(second);
    forgetCachedBackground(second);
    expect(pickCachedBackground(first)).toBeNull();
  });

  it('only offers uncached pieces for download', () => {
    localStorage.setItem(BACKGROUND_CACHE_LIST_KEY, JSON.stringify(BACKGROUND_ARTWORKS.slice(1)));
    expect(pickUncachedBackground()).toBe(first);

    localStorage.setItem(BACKGROUND_CACHE_LIST_KEY, JSON.stringify(BACKGROUND_ARTWORKS));
    expect(pickUncachedBackground()).toBeNull();
  });
});

describe('Cache Storage', () => {
  it('stores a download, records it, and reads it back without the network', async () => {
    const { caches, store } = fakeCaches();
    vi.stubGlobal('caches', caches);
    // A string body: jsdom's Blob is not one Node's Response can read.
    const fetchMock = vi.fn(
      async () => new Response('img', { headers: { 'Content-Type': 'image/png' } }),
    );
    vi.stubGlobal('fetch', fetchMock);

    expect(await cacheBackground(first)).toMatch(/^blob:/);
    expect(store.has(first)).toBe(true);
    expect(readCachedBackgroundList()).toEqual([first]);

    fetchMock.mockClear();
    expect(await loadCachedBackground(first)).toMatch(/^blob:/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('deletes evicted pieces from Cache Storage', async () => {
    const { caches, cache } = fakeCaches();
    vi.stubGlobal('caches', caches);
    vi.stubGlobal('fetch', vi.fn(async () => new Response('img')));
    for (const url of BACKGROUND_ARTWORKS.slice(0, MAX_CACHED_BACKGROUNDS)) {
      rememberCachedBackground(url);
    }

    expect(await cacheBackground(BACKGROUND_ARTWORKS[MAX_CACHED_BACKGROUNDS])).toMatch(/^blob:/);
    expect(cache.delete).toHaveBeenCalledWith(first);
    expect(readCachedBackgroundList()).not.toContain(first);
  });

  it('drops a listed piece whose cache entry has gone missing', async () => {
    vi.stubGlobal('caches', fakeCaches().caches);
    rememberCachedBackground(first);
    rememberCachedBackground(second);

    expect(await loadCachedBackground(first)).toBeNull();
    expect(readCachedBackgroundList()).toEqual([second]);
  });

  it('falls back to the plain URL where it cannot cache', async () => {
    vi.stubGlobal('caches', undefined);
    expect(await cacheBackground(first)).toBe(first);
    expect(await loadCachedBackground(first)).toBeNull();

    vi.stubGlobal('caches', fakeCaches().caches);
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('CORS'); }));
    expect(await cacheBackground(second)).toBe(second);
    expect(readCachedBackgroundList()).toEqual([]);
  });

  it('reports a failed download and does not record it', async () => {
    vi.stubGlobal('caches', fakeCaches().caches);
    vi.stubGlobal('fetch', vi.fn(async () => new Response('gone', { status: 404 })));
    expect(await cacheBackground(third)).toBeNull();
    expect(readCachedBackgroundList()).toEqual([]);
  });
});
