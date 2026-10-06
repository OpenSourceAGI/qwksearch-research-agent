/**
 * @fileoverview A learner's own playlists: creating and editing them, and
 * keeping them in the browser.
 *
 * Browser storage is this sketch's only backend. It is enough for private
 * playlists and progress on one device; sharing a private playlist with an
 * invitee needs the host app to store playlists server-side (see the
 * package README), which the `PlaylistStore` interface is shaped for.
 */
import type { Playlist, PlaylistItem, PlaylistVisibility } from '../types';
import { sanitizePlaylist } from './sanitize';

export const PLAYLISTS_STORAGE_KEY = 'educationPlaylists.mine';

export interface PlaylistStore {
  list(): Playlist[];
  save(playlist: Playlist): Playlist[];
  remove(id: string): Playlist[];
}

const newId = (): string =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `pl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export function createPlaylist(input: {
  title: string;
  ownerId?: string;
  visibility?: Exclude<PlaylistVisibility, 'preset'>;
  items?: PlaylistItem[];
  description?: string;
  plannedFrom?: Playlist['plannedFrom'];
}): Playlist {
  const now = new Date().toISOString();
  return {
    id: newId(),
    title: input.title.trim() || 'My playlist',
    description: input.description,
    categoryId: 'custom',
    majorId: 'custom',
    visibility: input.visibility ?? 'private',
    ownerId: input.ownerId,
    members: [],
    items: input.items ?? [],
    plannedFrom: input.plannedFrom,
    createdAt: now,
    updatedAt: now,
  };
}

/** Appends `item` unless the playlist already links to the same URL. */
export function addItem(playlist: Playlist, item: PlaylistItem): Playlist {
  if (playlist.items.some((existing) => existing.id === item.id || existing.url === item.url)) return playlist;
  return { ...playlist, items: [...playlist.items, item], updatedAt: new Date().toISOString() };
}

export function removeItem(playlist: Playlist, itemId: string): Playlist {
  return { ...playlist, items: playlist.items.filter((item) => item.id !== itemId), updatedAt: new Date().toISOString() };
}

/** Moves the item at `from` to `to`, clamped to the list. */
export function moveItem(playlist: Playlist, from: number, to: number): Playlist {
  const items = [...playlist.items];
  if (from < 0 || from >= items.length) return playlist;
  const [moved] = items.splice(from, 1);
  items.splice(Math.max(0, Math.min(to, items.length)), 0, moved);
  return { ...playlist, items, updatedAt: new Date().toISOString() };
}

/** A store over `localStorage`, or in memory where there is none. */
export function createLocalPlaylistStore(key = PLAYLISTS_STORAGE_KEY): PlaylistStore {
  let memory: Playlist[] = [];
  const read = (): Playlist[] => {
    try {
      const raw = typeof localStorage === 'undefined' ? null : localStorage.getItem(key);
      if (!raw) return memory;
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      // Stored playlists keep their visibility and members; only their
      // content is re-validated, since anything with page access can write here.
      return parsed.flatMap((entry) => {
        const clean = sanitizePlaylist(entry);
        if (!clean) return [];
        const original = entry as Playlist;
        return [{ ...clean, visibility: original.visibility === 'public' ? 'public' : 'private', ownerId: original.ownerId, members: original.members ?? [], plannedFrom: original.plannedFrom, createdAt: original.createdAt, updatedAt: original.updatedAt }];
      });
    } catch {
      return memory;
    }
  };
  const write = (playlists: Playlist[]): Playlist[] => {
    memory = playlists;
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(key, JSON.stringify(playlists));
    } catch {
      // Blocked storage: this page keeps the in-memory copy.
    }
    return playlists;
  };
  return {
    list: read,
    save(playlist) {
      const others = read().filter((existing) => existing.id !== playlist.id);
      return write([playlist, ...others]);
    },
    remove(id) {
      return write(read().filter((existing) => existing.id !== id));
    },
  };
}
