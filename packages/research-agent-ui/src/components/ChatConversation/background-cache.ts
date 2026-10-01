/**
 * @fileoverview The homepage's background-artwork cache: downloaded artwork is
 * kept in Cache Storage, and the list of what is in there is kept in
 * `localStorage`, so the homepage can show a piece the moment it mounts without
 * touching the network, and only goes to Imgur to grow the cache once the page
 * has loaded.
 *
 * Without a service worker an `<img>` never reads Cache Storage itself, so a
 * cached piece is handed to the page as an object URL of the stored blob.
 */
import { BACKGROUND_ARTWORKS } from './background-art';

/** The Cache Storage bucket the artwork lives in. Bump to drop old entries. */
export const BACKGROUND_CACHE_NAME = 'qwksearch-background-art-v1';

/** The `localStorage` key holding the URLs in the cache, oldest first. */
export const BACKGROUND_CACHE_LIST_KEY = 'backgroundArtCache';

/**
 * How many pieces are kept. Once full, the homepage rotates through these and
 * stops downloading, since some of the pieces are multi-megabyte video.
 */
export const MAX_CACHED_BACKGROUNDS = 10;

/** A piece larger than this is still shown, but not stored. */
export const MAX_CACHED_BACKGROUND_BYTES = 15 * 1024 * 1024;

const isKnownArtwork = (url: unknown): url is string =>
  typeof url === 'string' && BACKGROUND_ARTWORKS.includes(url);

/**
 * The cached URLs, oldest first. Anything that is not (or is no longer) one of
 * the artworks is dropped, so a stale or hand-edited entry can never be loaded.
 */
export function readCachedBackgroundList(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(BACKGROUND_CACHE_LIST_KEY) || '[]');
    if (!Array.isArray(parsed)) return [];
    return [...new Set(parsed.filter(isKnownArtwork))];
  } catch {
    return [];
  }
}

function writeCachedBackgroundList(list: string[]): void {
  try {
    localStorage.setItem(BACKGROUND_CACHE_LIST_KEY, JSON.stringify(list));
  } catch {
    // Storage full or blocked: the cache still works for this visit.
  }
}

/**
 * Records `url` as cached (most recent last) and returns the URLs that fell off
 * the end of the list, which the caller deletes from Cache Storage.
 */
export function rememberCachedBackground(url: string): string[] {
  const list = readCachedBackgroundList().filter((cached) => cached !== url);
  list.push(url);
  const evicted = list.splice(0, Math.max(0, list.length - MAX_CACHED_BACKGROUNDS));
  writeCachedBackgroundList(list);
  return evicted;
}

/** Drops `url` from the list, e.g. when its cache entry has gone missing. */
export function forgetCachedBackground(url: string): void {
  writeCachedBackgroundList(readCachedBackgroundList().filter((cached) => cached !== url));
}

const pickRandom = (list: readonly string[]): string | null =>
  list.length ? list[Math.floor(Math.random() * list.length)] : null;

/** A random cached piece other than `exclude`, or `null` if there is none. */
export function pickCachedBackground(exclude?: string | null): string | null {
  return pickRandom(readCachedBackgroundList().filter((url) => url !== exclude));
}

/** A random piece that is not cached yet, or `null` once every one is. */
export function pickUncachedBackground(): string | null {
  const cached = new Set(readCachedBackgroundList());
  return pickRandom(BACKGROUND_ARTWORKS.filter((url) => !cached.has(url)));
}

/**
 * Opens the artwork cache, or `null` where there is no Cache Storage (an
 * insecure origin, some embedded webviews) or it refuses to open.
 */
async function openBackgroundCache(): Promise<Cache | null> {
  if (typeof caches === 'undefined') return null;
  try {
    return await caches.open(BACKGROUND_CACHE_NAME);
  } catch {
    return null;
  }
}

/**
 * Reads a cached piece back as an object URL the page can display, without
 * touching the network. Returns `null` if it is not actually in the cache, in
 * which case it is also dropped from the list.
 */
export async function loadCachedBackground(url: string): Promise<string | null> {
  const cache = await openBackgroundCache();
  if (!cache) return null;
  try {
    const response = await cache.match(url);
    if (!response) {
      forgetCachedBackground(url);
      return null;
    }
    return URL.createObjectURL(await response.blob());
  } catch {
    return null;
  }
}

/**
 * Downloads a piece, stores it and records it in the list, evicting the oldest
 * past {@link MAX_CACHED_BACKGROUNDS}. Returns what the page should display:
 * an object URL of the download, or the plain URL where it cannot be cached
 * (no Cache Storage, or the fetch was refused), so the element loads it from
 * the network as it always did. Returns `null` for a failed download.
 */
export async function cacheBackground(url: string): Promise<string | null> {
  const cache = await openBackgroundCache();
  if (!cache) return url;

  let blob: Blob;
  try {
    const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
    if (!response.ok) return null;
    blob = await response.blob();
  } catch {
    return url;
  }

  if (blob.size <= MAX_CACHED_BACKGROUND_BYTES) {
    try {
      await cache.put(
        url,
        new Response(blob, { headers: { 'Content-Type': blob.type } }),
      );
      const evicted = rememberCachedBackground(url);
      await Promise.all(evicted.map((old) => cache.delete(old)));
    } catch {
      // Over quota: show it anyway, it just will not be there next visit.
    }
  }
  return URL.createObjectURL(blob);
}
