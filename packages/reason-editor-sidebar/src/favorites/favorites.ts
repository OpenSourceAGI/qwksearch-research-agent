/**
 * @module favorites
 * @description Favorited documents and each document's last-used time,
 * backing the file tree's gold star and the Files panel's "favorites only"
 * bookmarks view.
 *
 * Both are kept in `localStorage` beside the editor's other `REASON-*`
 * workspace keys, keyed by document ID, so the sidebar needs nothing new from
 * its host. Like the file sources they are per browser. Every write
 * dispatches {@link FAVORITES_CHANGED_EVENT} on `window` so each mounted
 * sidebar (the left one, the right panel, the mobile drawer) re-reads at
 * once; other tabs pick the change up through the `storage` event.
 */
import type { Document } from '../documents/DocumentTree';

/** `localStorage` key: `{ [documentId]: favoritedAt }` (epoch ms). */
export const FAVORITES_STORAGE_KEY = 'REASON-favorites';
/** `localStorage` key: `{ [documentId]: lastUsedAt }` (epoch ms). */
export const LAST_USED_STORAGE_KEY = 'REASON-last-used';
/** Dispatched on `window` after either map is written. */
export const FAVORITES_CHANGED_EVENT = 'reason-favorites-changed';
/**
 * Most last-used entries kept. Every opened document gets one, so the map is
 * capped to the most recent ones rather than growing for ever.
 */
export const MAX_LAST_USED_ENTRIES = 500;

/** Document ID → epoch milliseconds. */
export type TimestampMap = Record<string, number>;

function readMap(key: string): TimestampMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const map: TimestampMap = {};
    for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === 'number' && Number.isFinite(value)) map[id] = value;
    }
    return map;
  } catch {
    return {};
  }
}

function writeMap(key: string, map: TimestampMap): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(map));
  } catch {
    // Storage full or blocked: the star still toggles for this render.
  }
  window.dispatchEvent(new Event(FAVORITES_CHANGED_EVENT));
}

/** Favorited document IDs, each with the time it was favorited. */
export function getFavorites(): TimestampMap {
  return readMap(FAVORITES_STORAGE_KEY);
}

/** When each document was last opened. */
export function getLastUsed(): TimestampMap {
  return readMap(LAST_USED_STORAGE_KEY);
}

/** Whether `id` is favorited. */
export function isFavorite(id: string): boolean {
  return id in getFavorites();
}

/** Favorites (`true`) or unfavorites (`false`) a document. */
export function setFavorite(id: string, favorite: boolean, now: number = Date.now()): void {
  const favorites = getFavorites();
  if (favorite === id in favorites) return;
  if (favorite) {
    favorites[id] = now;
  } else {
    delete favorites[id];
  }
  writeMap(FAVORITES_STORAGE_KEY, favorites);
}

/** Flips a document's favorite state and returns the new one. */
export function toggleFavorite(id: string, now: number = Date.now()): boolean {
  const next = !isFavorite(id);
  setFavorite(id, next, now);
  return next;
}

/**
 * Stamps a document as used now. The sidebar calls this whenever the active
 * document changes; a host that opens documents some other way can call it
 * too.
 */
export function recordDocumentUse(id: string, now: number = Date.now()): void {
  const lastUsed = getLastUsed();
  lastUsed[id] = now;
  const ids = Object.keys(lastUsed);
  if (ids.length > MAX_LAST_USED_ENTRIES) {
    ids
      .sort((a, b) => lastUsed[b] - lastUsed[a])
      .slice(MAX_LAST_USED_ENTRIES)
      .forEach((staleId) => delete lastUsed[staleId]);
  }
  writeMap(LAST_USED_STORAGE_KEY, lastUsed);
}

/**
 * The favorited, non-folder documents among `documents`, most recently used
 * first. A favorite that was never opened falls back to the time it was
 * favorited, and ties keep the tree's order. Favorites of documents that are
 * no longer in `documents` (deleted, or in another storage source) are left
 * out but stay stored, so they come back with their document.
 */
export function getFavoriteDocuments(
  documents: Document[],
  favorites: TimestampMap,
  lastUsed: TimestampMap,
): Document[] {
  const recency = (doc: Document) => lastUsed[doc.id] ?? favorites[doc.id] ?? 0;
  return documents
    .filter((doc) => doc.id in favorites && !doc.isFolder && !doc.isDeleted)
    .map((doc, index) => ({ doc, index }))
    .sort((a, b) => recency(b.doc) - recency(a.doc) || a.index - b.index)
    .map(({ doc }) => doc);
}

/**
 * A short "how long ago" label for the favorites list: `now`, `5m`, `3h`,
 * `2d`, `4w`, then a date.
 */
export function formatLastUsed(timestamp: number | undefined, now: number = Date.now()): string {
  if (!timestamp) return '';
  const seconds = Math.max(0, Math.floor((now - timestamp) / 1000));
  if (seconds < 60) return 'now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  if (days < 56) return `${Math.floor(days / 7)}w`;
  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
