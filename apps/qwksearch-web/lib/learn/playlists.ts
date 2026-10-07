/**
 * @fileoverview Server-side storage for education playlists
 * (`/api/learn/playlists`): the D1 repository behind
 * `education-playlists/server`'s `handlePlaylistStoreRequest`, and the
 * signed-in user it is asked on behalf of.
 *
 * The package owns the rules (who may view, edit, invite, accept); this file
 * only stores whole playlists and says who is calling. See
 * `learnPlaylists` / `learnPlaylistMembers` in `lib/database/schema.ts`.
 */
import { eq, inArray, or } from "drizzle-orm";
import {
  handlePlaylistStoreRequest,
  type PlaylistRepository,
  type PlaylistUser,
} from "education-playlists/server";
import type { Playlist, PlaylistMember } from "education-playlists";
import { getQueryDB, type QueryDB } from "@/lib/database";
import { learnPlaylistMembers, learnPlaylists } from "@/lib/database/schema";
import { getSession } from "@/lib/auth/session";

type PlaylistRow = typeof learnPlaylists.$inferSelect;
type MemberRow = typeof learnPlaylistMembers.$inferSelect;

/** D1 refuses a statement with more than 100 bound parameters. */
const D1_MAX_BOUND_PARAMETERS = 100;
const MEMBER_COLUMNS = 6;
const MEMBER_INSERT_CHUNK = Math.floor(D1_MAX_BOUND_PARAMETERS / MEMBER_COLUMNS);
const ID_CHUNK = 90;

const chunk = <T,>(values: T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(values.length / size) }, (_, i) => values.slice(i * size, (i + 1) * size));

const toDate = (iso: string | undefined): Date => {
  const date = iso ? new Date(iso) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
};

function toPlaylist(row: PlaylistRow, members: MemberRow[]): Playlist | null {
  let data: Playlist;
  try {
    data = JSON.parse(row.data) as Playlist;
  } catch {
    return null;
  }
  return {
    ...data,
    id: row.id,
    ownerId: row.ownerId,
    visibility: row.visibility === "public" ? "public" : "private",
    members: members.map(
      (m): PlaylistMember => ({
        email: m.email,
        userId: m.userId ?? undefined,
        role: m.role === "editor" ? "editor" : "viewer",
        status: m.status === "active" ? "active" : "invited",
        inviteToken: m.inviteToken ?? undefined,
      }),
    ),
  };
}

/**
 * Runs the statements as one batch where the driver supports it (D1 and
 * libsql both do), so replacing a member list can never half-apply.
 */
async function runAll(db: QueryDB, statements: unknown[]): Promise<void> {
  const batch = (db as unknown as { batch?: (queries: unknown[]) => Promise<unknown> }).batch;
  if (batch) {
    await batch.call(db, statements);
    return;
  }
  for (const statement of statements) await statement;
}

/** Playlists stored in D1 (or the local SQLite fallback). */
export function createD1PlaylistRepository(db: QueryDB = getQueryDB()): PlaylistRepository {
  async function load(ids: string[]): Promise<Playlist[]> {
    const unique = [...new Set(ids)];
    if (!unique.length) return [];
    const rows: PlaylistRow[] = [];
    const members: MemberRow[] = [];
    for (const part of chunk(unique, ID_CHUNK)) {
      rows.push(...(await db.select().from(learnPlaylists).where(inArray(learnPlaylists.id, part))));
      members.push(
        ...(await db.select().from(learnPlaylistMembers).where(inArray(learnPlaylistMembers.playlistId, part))),
      );
    }
    return rows.flatMap((row) => toPlaylist(row, members.filter((m) => m.playlistId === row.id)) ?? []);
  }

  return {
    async get(id) {
      return (await load([id]))[0] ?? null;
    },

    async put(playlist) {
      const { members = [], ...rest } = playlist;
      const row = {
        id: playlist.id,
        ownerId: playlist.ownerId!,
        title: playlist.title,
        visibility: playlist.visibility === "public" ? "public" : "private",
        data: JSON.stringify(rest),
        createdAt: toDate(playlist.createdAt),
        updatedAt: toDate(playlist.updatedAt),
      };
      const memberRows = members
        .filter((m) => m.email)
        .map((m) => ({
          playlistId: playlist.id,
          email: m.email!,
          userId: m.userId ?? null,
          role: m.role,
          status: m.status,
          inviteToken: m.inviteToken ?? null,
        }));
      await runAll(db, [
        db
          .insert(learnPlaylists)
          .values(row)
          .onConflictDoUpdate({
            target: learnPlaylists.id,
            set: { title: row.title, visibility: row.visibility, data: row.data, updatedAt: row.updatedAt },
          }),
        db.delete(learnPlaylistMembers).where(eq(learnPlaylistMembers.playlistId, playlist.id)),
        ...chunk(memberRows, MEMBER_INSERT_CHUNK).map((part) => db.insert(learnPlaylistMembers).values(part)),
      ]);
    },

    async delete(id) {
      // Members go with it (ON DELETE CASCADE), but D1 only enforces foreign
      // keys when asked to, so they are deleted explicitly too.
      await runAll(db, [
        db.delete(learnPlaylistMembers).where(eq(learnPlaylistMembers.playlistId, id)),
        db.delete(learnPlaylists).where(eq(learnPlaylists.id, id)),
      ]);
    },

    async listForUser(userId, email) {
      const owned = await db
        .select({ id: learnPlaylists.id })
        .from(learnPlaylists)
        .where(eq(learnPlaylists.ownerId, userId));
      const shared = await db
        .select({ id: learnPlaylistMembers.playlistId })
        .from(learnPlaylistMembers)
        .where(
          email
            ? or(eq(learnPlaylistMembers.userId, userId), eq(learnPlaylistMembers.email, email))
            : eq(learnPlaylistMembers.userId, userId),
        );
      return load([...owned, ...shared].map((r) => r.id));
    },

    async findByInviteToken(token) {
      const [match] = await db
        .select({ id: learnPlaylistMembers.playlistId })
        .from(learnPlaylistMembers)
        .where(eq(learnPlaylistMembers.inviteToken, token))
        .limit(1);
      return match ? (await load([match.id]))[0] ?? null : null;
    },
  };
}

/**
 * The signed-in user, or `null`. Guests on an anonymous session have no
 * address to invite and nothing that follows them to another device, so
 * their playlists stay in the browser.
 */
export async function currentPlaylistUser(): Promise<PlaylistUser | null> {
  const session = await getSession();
  const user = session?.user as
    | (NonNullable<typeof session>["user"] & { emailVerified?: boolean; isAnonymous?: boolean | null })
    | undefined;
  if (!user?.id || user.isAnonymous) return null;
  return { id: user.id, email: user.email, emailVerified: user.emailVerified, name: user.name };
}

export function servePlaylistStore(req: Request): Promise<Response> {
  return handlePlaylistStoreRequest(req, {
    repository: createD1PlaylistRepository(),
    getUser: () => currentPlaylistUser(),
  });
}
