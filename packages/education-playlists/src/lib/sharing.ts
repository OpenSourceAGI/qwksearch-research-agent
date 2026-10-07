/**
 * @fileoverview Who can see and change a playlist, invitations, and share
 * links.
 *
 * Access rules are pure functions so the server and the widget agree on them.
 * The widget's own checks are for display only; a server that stores
 * playlists must run `canView`/`canEdit` itself before answering.
 */
import type { Playlist, PlaylistMember, PlaylistRole } from '../types';
import { sanitizePlaylist } from './sanitize';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function activeMember(playlist: Playlist, userId: string | undefined): PlaylistMember | undefined {
  if (!userId) return undefined;
  return playlist.members?.find((member) => member.status === 'active' && member.userId === userId);
}

export function canView(playlist: Playlist, userId?: string): boolean {
  if (playlist.visibility !== 'private') return true;
  if (userId && playlist.ownerId === userId) return true;
  return Boolean(activeMember(playlist, userId));
}

export function canEdit(playlist: Playlist, userId?: string): boolean {
  if (playlist.visibility === 'preset') return false;
  if (userId && playlist.ownerId === userId) return true;
  const member = activeMember(playlist, userId);
  return member?.role === 'owner' || member?.role === 'editor';
}

const defaultToken = (): string =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

/**
 * The playlist with `email` invited at `role`. Re-inviting an address updates
 * its role rather than adding a second row. Throws on a malformed address or
 * an attempt to invite a second owner.
 */
export function invite(
  playlist: Playlist,
  email: string,
  role: Exclude<PlaylistRole, 'owner'>,
  makeToken: () => string = defaultToken,
): Playlist {
  const address = email.trim().toLowerCase();
  if (!EMAIL.test(address)) throw new Error(`Not an email address: ${email}`);
  if ((role as PlaylistRole) === 'owner') throw new Error('A playlist has exactly one owner');
  const members = [...(playlist.members ?? [])];
  const existing = members.findIndex((member) => member.email === address);
  if (existing >= 0) {
    members[existing] = { ...members[existing], role };
  } else {
    members.push({ email: address, role, status: 'invited', inviteToken: makeToken() });
  }
  return { ...playlist, members };
}

/** The playlist with the invite behind `token` accepted by `userId`, or `null` for an unknown token. */
export function acceptInvite(playlist: Playlist, token: string, userId: string): Playlist | null {
  const members = playlist.members ?? [];
  const index = members.findIndex((member) => member.inviteToken === token && member.status === 'invited');
  if (index < 0) return null;
  const next = [...members];
  next[index] = { ...next[index], userId, status: 'active', inviteToken: undefined };
  return { ...playlist, members: next };
}

export function removeMember(playlist: Playlist, email: string): Playlist {
  const address = email.trim().toLowerCase();
  return { ...playlist, members: (playlist.members ?? []).filter((member) => member.email !== address) };
}

const toBase64Url = (value: string): string => {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const fromBase64Url = (value: string): string => {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(padded);
  return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
};

/** Hash parameter a share link carries its playlist in. */
export const SHARE_HASH_PARAM = 'playlist';

/**
 * A share fragment (`playlist=<base64url>`) carrying a public copy of the
 * playlist. The whole playlist rides in the URL fragment, which browsers never
 * send to a server, so sharing works with no storage behind it. Private
 * playlists are refused: those are shared by invitation, not by link.
 */
export function encodeShareFragment(playlist: Playlist): string {
  if (playlist.visibility === 'private') throw new Error('Private playlists are shared by invitation');
  const { members: _members, ownerId: _ownerId, plannedFrom: _plannedFrom, ...shareable } = playlist;
  return `${SHARE_HASH_PARAM}=${toBase64Url(JSON.stringify({ ...shareable, visibility: 'public' }))}`;
}

/** The playlist in a share fragment (with or without the leading `#`), or `null`. */
export function decodeShareFragment(fragment: string): Playlist | null {
  const params = new URLSearchParams(fragment.replace(/^#/, ''));
  const encoded = params.get(SHARE_HASH_PARAM);
  if (!encoded) return null;
  try {
    return sanitizePlaylist(JSON.parse(fromBase64Url(encoded)));
  } catch {
    return null;
  }
}
