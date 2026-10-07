/**
 * @fileoverview Server-side playlist storage: the request handler a host
 * mounts at `<base>/playlists`, and the repository interface it stores
 * through.
 *
 * - `GET    <base>/playlists`               → `{ playlists, invites }` for the signed-in user
 * - `GET    <base>/playlists/:id`           → `{ playlist }` if the caller may view it
 * - `PUT    <base>/playlists/:id`           → create (caller becomes owner) or update
 * - `DELETE <base>/playlists/:id`           → owner only
 * - `POST   <base>/playlists/accept-invite` `{ token }` → `{ playlist }`
 *
 * This is where `canView`/`canEdit` are actually enforced; the widget's own
 * checks are display only. The handler knows nothing about the host's auth or
 * database: `getUser` says who is calling and `repository` stores playlists,
 * so the same rules run over D1, SQLite, Postgres or the in-memory store used
 * in tests.
 */
import type { Playlist, PlaylistMember, PlaylistRole } from '../types';
import { sanitizePlaylist } from '../lib/sanitize';
import { canEdit, canView, invite } from '../lib/sharing';
import { normalizePlanRequest } from '../planner';

/** Request bodies larger than this are refused before parsing. */
export const MAX_PLAYLIST_BODY_BYTES = 64 * 1024;
/** People one private playlist may be shared with. */
export const MAX_PLAYLIST_MEMBERS = 50;
/** Playlists one user may own. */
export const MAX_OWNED_PLAYLISTS = 200;

const PLAYLIST_ID = /^[A-Za-z0-9_-]{1,120}$/;
const ACCEPT_INVITE = 'accept-invite';
const ROLES: PlaylistRole[] = ['owner', 'editor', 'viewer'];

/** The signed-in caller, as the host's auth reports them. */
export interface PlaylistUser {
  id: string;
  /** The address invites are matched against. */
  email?: string;
  /**
   * `false` when the host knows the address is unverified. Such a user is not
   * shown, and cannot accept, invites addressed to it — otherwise signing up
   * with someone else's address would hand over their invites.
   */
  emailVerified?: boolean;
  name?: string;
}

/** An invitation waiting for the signed-in user to accept it. */
export interface PendingInvite {
  playlistId: string;
  title: string;
  role: PlaylistRole;
  token: string;
}

/** Where playlists live. Every method is given and returns whole playlists, members included. */
export interface PlaylistRepository {
  get(id: string): Promise<Playlist | null>;
  /** Inserts or replaces the playlist and its member list. */
  put(playlist: Playlist): Promise<void>;
  delete(id: string): Promise<void>;
  /**
   * Playlists the user owns, is an active member of, or (when `email` is
   * given) has an invite to. The handler filters the result again, so a
   * repository may over-return.
   */
  listForUser(userId: string, email?: string): Promise<Playlist[]>;
  findByInviteToken(token: string): Promise<Playlist | null>;
}

export interface InviteNotice {
  /** The invitee's address. */
  to: string;
  role: PlaylistRole;
  playlist: Pick<Playlist, 'id' | 'title'>;
  /** Who sent it. */
  from: PlaylistUser;
  token: string;
}

export interface PlaylistStoreDeps {
  repository: PlaylistRepository;
  /** The signed-in user behind the request, or `null`. */
  getUser: (request: Request) => Promise<PlaylistUser | null>;
  /**
   * Delivers a new invite (email, in-app notification…). Optional: invitees
   * also see pending invites when they sign in with the invited address, and
   * the owner gets the token to share an invite link by hand. A failure here
   * never fails the save.
   */
  notifyInvite?: (notice: InviteNotice) => Promise<void> | void;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });

const normalizeEmail = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value.trim().toLowerCase() : undefined;

const inviteEmail = (user: PlaylistUser): string | undefined =>
  user.emailVerified === false ? undefined : normalizeEmail(user.email);

/** In-memory repository, for tests and local development. */
export function createMemoryPlaylistRepository(initial: Playlist[] = []): PlaylistRepository {
  const rows = new Map<string, Playlist>(initial.map((playlist) => [playlist.id, structuredClone(playlist)]));
  return {
    async get(id) {
      const found = rows.get(id);
      return found ? structuredClone(found) : null;
    },
    async put(playlist) {
      rows.set(playlist.id, structuredClone(playlist));
    },
    async delete(id) {
      rows.delete(id);
    },
    async listForUser(userId, email) {
      const address = normalizeEmail(email);
      return [...rows.values()]
        .filter(
          (playlist) =>
            playlist.ownerId === userId ||
            (playlist.members ?? []).some((member) => member.userId === userId || (address && member.email === address)),
        )
        .map((playlist) => structuredClone(playlist));
    },
    async findByInviteToken(token) {
      const found = [...rows.values()].find((playlist) => (playlist.members ?? []).some((member) => member.inviteToken === token));
      return found ? structuredClone(found) : null;
    },
  };
}

/**
 * What `userId` gets to see of a playlist: invite tokens are the owner's
 * alone (they are what an invite link carries).
 */
export function playlistForViewer(playlist: Playlist, userId?: string): Playlist {
  if (userId && playlist.ownerId === userId) return playlist;
  return { ...playlist, members: (playlist.members ?? []).map(({ inviteToken: _token, ...member }) => member) };
}

/**
 * The owner's new member list, reconciled against the stored one. Existing
 * members keep their server-side state (user id, status, token) and take only
 * a new role; new addresses are invited with a server-made token; anyone
 * missing is removed. Client-supplied tokens, user ids and statuses are
 * ignored — those are never the client's to assert.
 */
function reconcileMembers(stored: Playlist, requested: unknown): { playlist: Playlist; added: PlaylistMember[] } {
  const wanted = (Array.isArray(requested) ? requested : [])
    .slice(0, MAX_PLAYLIST_MEMBERS)
    .flatMap((raw) => {
      const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
      const email = normalizeEmail(r.email);
      const role = ROLES.includes(r.role as PlaylistRole) && r.role !== 'owner' ? (r.role as Exclude<PlaylistRole, 'owner'>) : 'viewer';
      return email ? [{ email, role }] : [];
    });

  const previous = stored.members ?? [];
  let next: Playlist = { ...stored, members: previous.filter((member) => member.email && wanted.some((w) => w.email === member.email)) };
  const added: PlaylistMember[] = [];
  for (const { email, role } of wanted) {
    const existed = previous.some((member) => member.email === email);
    try {
      next = invite(next, email, role);
    } catch {
      continue; // A malformed address is dropped, not fatal to the save.
    }
    if (!existed) added.push(next.members!.find((m) => m.email === email)!);
  }
  return { playlist: next, added };
}

async function readBody(request: Request): Promise<unknown> {
  const text = await request.text();
  if (text.length > MAX_PLAYLIST_BODY_BYTES) throw new RangeError('Request body too large');
  return text ? JSON.parse(text) : {};
}

/**
 * Answers one playlist-storage request. `request`'s path must contain a
 * `/playlists` segment; everything after it is routed here. Rate limiting and
 * CORS are the host's job.
 */
export async function handlePlaylistStoreRequest(request: Request, deps: PlaylistStoreDeps): Promise<Response> {
  const segments = new URL(request.url).pathname.split('/').filter(Boolean);
  const base = segments.lastIndexOf('playlists');
  if (base < 0) return json({ error: 'Not found' }, 404);
  const rest = segments.slice(base + 1).map((segment) => decodeURIComponent(segment));
  if (rest.length > 1) return json({ error: 'Not found' }, 404);
  const id = rest[0];
  const { repository } = deps;

  const user = await deps.getUser(request);

  // GET <base>/playlists/:id is the one call open to signed-out visitors:
  // a public playlist is readable by anyone with its link.
  if (request.method === 'GET' && id) {
    const playlist = await repository.get(id);
    // Not-found and not-allowed answer the same, so ids cannot be probed.
    if (!playlist || !canView(playlist, user?.id)) return json({ error: 'Not found' }, 404);
    return json({ playlist: playlistForViewer(playlist, user?.id) });
  }

  if (!user) return json({ error: 'Sign in to keep playlists in your account' }, 401);

  if (request.method === 'GET') {
    const email = inviteEmail(user);
    const found = await repository.listForUser(user.id, email);
    const playlists = found.filter((playlist) => canView(playlist, user.id)).map((playlist) => playlistForViewer(playlist, user.id));
    // An invite to a playlist the user can already open has nothing to add.
    const invites: PendingInvite[] = email
      ? found
          .filter((playlist) => !canView(playlist, user.id))
          .flatMap((playlist) =>
            (playlist.members ?? [])
              .filter((member) => member.status === 'invited' && member.email === email && member.inviteToken)
              .map((member) => ({ playlistId: playlist.id, title: playlist.title, role: member.role, token: member.inviteToken! })),
          )
      : [];
    playlists.sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));
    return json({ playlists, invites });
  }

  let body: unknown;
  if (request.method === 'PUT' || request.method === 'POST') {
    try {
      body = await readBody(request);
    } catch (error) {
      return json({ error: error instanceof RangeError ? error.message : 'Body must be JSON' }, error instanceof RangeError ? 413 : 400);
    }
  }

  if (request.method === 'POST' && id === ACCEPT_INVITE) {
    const token = typeof (body as { token?: unknown })?.token === 'string' ? (body as { token: string }).token.slice(0, 200) : '';
    const playlist = token ? await repository.findByInviteToken(token) : null;
    const member = playlist?.members?.find((m) => m.inviteToken === token && m.status === 'invited');
    if (!playlist || !member) return json({ error: 'This invite is no longer valid' }, 404);
    // The token alone is not enough: an invite link can be forwarded, so it
    // only works for the address it was sent to.
    if (!member.email || member.email !== inviteEmail(user)) {
      return json({ error: `This invite was sent to another address. Sign in as ${member.email ?? 'the invitee'} to accept it.` }, 403);
    }
    // Someone accepting their own playlist's invite would just add a duplicate.
    const accepted: Playlist = { ...playlist, members: playlist.members!.filter((m) => m === member || m.userId !== user.id) };
    const index = accepted.members!.indexOf(member);
    accepted.members![index] = { ...member, userId: user.id, status: 'active', inviteToken: undefined };
    await repository.put(accepted);
    return json({ playlist: playlistForViewer(accepted, user.id) });
  }

  if (!id || !PLAYLIST_ID.test(id) || id === ACCEPT_INVITE) return json({ error: 'Not found' }, id ? 404 : 405);

  if (request.method === 'DELETE') {
    const playlist = await repository.get(id);
    if (!playlist || !canView(playlist, user.id)) return json({ error: 'Not found' }, 404);
    if (playlist.ownerId !== user.id) return json({ error: 'Only the owner can delete a playlist' }, 403);
    await repository.delete(id);
    return json({ ok: true });
  }

  if (request.method !== 'PUT') return json({ error: 'Method not allowed' }, 405);

  const clean = sanitizePlaylist({ ...(body as object), id });
  if (!clean) return json({ error: 'A playlist needs a title and at least one valid item' }, 400);
  const raw = body as Record<string, unknown>;
  const requestedVisibility = raw.visibility === 'public' ? 'public' : 'private';
  const now = new Date().toISOString();

  const stored = await repository.get(id);
  let next: Playlist;
  let added: PlaylistMember[] = [];
  if (!stored) {
    const owned = (await repository.listForUser(user.id)).filter((playlist) => playlist.ownerId === user.id);
    if (owned.length >= MAX_OWNED_PLAYLISTS) return json({ error: `You can keep up to ${MAX_OWNED_PLAYLISTS} playlists` }, 409);
    const base: Playlist = { ...clean, visibility: requestedVisibility, ownerId: user.id, members: [], plannedFrom: sanitizePlannedFrom(raw.plannedFrom), createdAt: now, updatedAt: now };
    ({ playlist: next, added } = reconcileMembers(base, raw.members));
  } else {
    if (!canView(stored, user.id)) return json({ error: 'Not found' }, 404);
    if (!canEdit(stored, user.id)) return json({ error: 'You can view this playlist but not change it' }, 403);
    const content: Playlist = {
      ...stored,
      title: clean.title,
      description: clean.description,
      categoryId: clean.categoryId,
      majorId: clean.majorId,
      programId: clean.programId,
      level: clean.level,
      items: clean.items,
      updatedAt: now,
    };
    if (stored.ownerId === user.id) {
      // Visibility and membership are the owner's; an editor's copy of them is ignored.
      ({ playlist: next, added } = reconcileMembers({ ...content, visibility: requestedVisibility }, raw.members));
    } else {
      next = content;
    }
  }

  await repository.put(next);
  if (deps.notifyInvite) {
    for (const member of added) {
      try {
        await deps.notifyInvite({ to: member.email!, role: member.role, playlist: { id: next.id, title: next.title }, from: user, token: member.inviteToken! });
      } catch {
        // The invite is stored and shows up when the invitee signs in.
      }
    }
  }
  return json({ playlist: playlistForViewer(next, user.id) }, stored ? 200 : 201);
}

/** A planner-built playlist's goal and answers, capped like a plan request, or nothing. */
function sanitizePlannedFrom(raw: unknown): Playlist['plannedFrom'] {
  try {
    const { goal, answers = [] } = normalizePlanRequest(raw);
    return { goal, answers };
  } catch {
    return undefined;
  }
}
