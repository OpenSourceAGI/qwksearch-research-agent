/**
 * @fileoverview Browser side of server-side playlist storage: a signed-in
 * learner's playlists and pending invites, read from and written to the
 * host's `<base>/playlists` endpoint (see `education-playlists/server`).
 *
 * Answers are re-validated like any other outside data; only the fields a
 * server owns (owner, members, timestamps) are carried over as it sent them,
 * type-checked.
 */
import type { Playlist, PlaylistMember, PlaylistRole } from '../types';
import { sanitizePlaylist } from '../lib/sanitize';

/** An invitation waiting for the signed-in user. */
export interface PlaylistInvite {
  playlistId: string;
  title: string;
  role: PlaylistRole;
  token: string;
}

export interface RemotePlaylistStore {
  /** The user's playlists (owned and shared with them) and pending invites. */
  list(signal?: AbortSignal): Promise<{ playlists: Playlist[]; invites: PlaylistInvite[] }>;
  /** Saves a playlist; resolves to the server's copy (with invite tokens for new members). */
  save(playlist: Playlist): Promise<Playlist>;
  remove(id: string): Promise<void>;
  acceptInvite(token: string): Promise<Playlist>;
}

/** Hash parameter an invite link carries its token in. */
export const INVITE_HASH_PARAM = 'invite';

/** The invite token in a page fragment (with or without the leading `#`), or `null`. */
export function readInviteFragment(fragment: string): string | null {
  const token = new URLSearchParams(fragment.replace(/^#/, '')).get(INVITE_HASH_PARAM);
  return token && token.length <= 200 ? token : null;
}

/** An invite link for `token`, opening `baseHref`. */
export function inviteLink(baseHref: string, token: string): string {
  return `${baseHref.split('#')[0]}#${INVITE_HASH_PARAM}=${encodeURIComponent(token)}`;
}

const ROLES: PlaylistRole[] = ['owner', 'editor', 'viewer'];
const str = (value: unknown, max = 200): string | undefined => (typeof value === 'string' && value ? value.slice(0, max) : undefined);

function readMember(raw: unknown): PlaylistMember[] {
  if (!raw || typeof raw !== 'object') return [];
  const r = raw as Record<string, unknown>;
  if (!ROLES.includes(r.role as PlaylistRole)) return [];
  return [
    {
      userId: str(r.userId),
      email: str(r.email, 320),
      role: r.role as PlaylistRole,
      status: r.status === 'active' ? 'active' : 'invited',
      inviteToken: str(r.inviteToken),
    },
  ];
}

/** A playlist from the store, or `null` if it is unusable. */
export function readStoredPlaylist(raw: unknown): Playlist | null {
  const clean = sanitizePlaylist(raw);
  if (!clean) return null;
  const r = raw as Record<string, unknown>;
  const plannedFrom = r.plannedFrom as Playlist['plannedFrom'];
  return {
    ...clean,
    visibility: r.visibility === 'public' ? 'public' : 'private',
    ownerId: str(r.ownerId),
    members: Array.isArray(r.members) ? r.members.flatMap(readMember) : [],
    plannedFrom: plannedFrom && typeof plannedFrom.goal === 'string' && Array.isArray(plannedFrom.answers) ? plannedFrom : undefined,
    createdAt: str(r.createdAt, 40),
    updatedAt: str(r.updatedAt, 40),
  };
}

function readInvite(raw: unknown): PlaylistInvite[] {
  if (!raw || typeof raw !== 'object') return [];
  const r = raw as Record<string, unknown>;
  const playlistId = str(r.playlistId);
  const token = str(r.token);
  if (!playlistId || !token) return [];
  return [{ playlistId, token, title: str(r.title) ?? 'Shared playlist', role: r.role === 'editor' ? 'editor' : 'viewer' }];
}

/**
 * A store over the host's playlist endpoint, e.g. `/api/learn/playlists`.
 * Requests carry the page's cookies, which is how the server knows who is
 * signed in. Every failure rejects with the server's message.
 */
export function createRemotePlaylistStore(endpoint: string, fetchImpl: typeof fetch = (input, init) => fetch(input, init)): RemotePlaylistStore {
  const base = endpoint.replace(/\/+$/, '');

  async function call(path: string, init: RequestInit = {}): Promise<Record<string, unknown>> {
    const res = await fetchImpl(`${base}${path}`, {
      credentials: 'same-origin',
      ...init,
      headers: init.body ? { 'content-type': 'application/json' } : undefined,
    });
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) throw new Error(typeof body.error === 'string' ? body.error : `Playlist request failed (${res.status})`);
    return body;
  }

  const one = (body: Record<string, unknown>): Playlist => {
    const playlist = readStoredPlaylist(body.playlist);
    if (!playlist) throw new Error('The server sent back an unusable playlist');
    return playlist;
  };

  return {
    async list(signal) {
      const body = await call('', { signal });
      return {
        playlists: (Array.isArray(body.playlists) ? body.playlists : []).flatMap((raw) => readStoredPlaylist(raw) ?? []),
        invites: (Array.isArray(body.invites) ? body.invites : []).flatMap(readInvite),
      };
    },
    async save(playlist) {
      return one(await call(`/${encodeURIComponent(playlist.id)}`, { method: 'PUT', body: JSON.stringify(playlist) }));
    },
    async remove(id) {
      await call(`/${encodeURIComponent(id)}`, { method: 'DELETE' });
    },
    async acceptInvite(token) {
      return one(await call('/accept-invite', { method: 'POST', body: JSON.stringify({ token }) }));
    },
  };
}
