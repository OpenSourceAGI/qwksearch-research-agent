/**
 * @fileoverview The D1 playlist repository, run against a real in-memory
 * SQLite built from the migration that ships the tables, and the store
 * handler on top of it.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';

const mockGetSession = vi.fn();
vi.mock('@/lib/auth/session', () => ({ getSession: () => mockGetSession() }));
vi.mock('@/lib/database', () => ({ getQueryDB: vi.fn() }));

import { handlePlaylistStoreRequest } from 'education-playlists/server';
import type { Playlist } from 'education-playlists';
import { createD1PlaylistRepository, currentPlaylistUser } from '../playlists';
import type { QueryDB } from '@/lib/database';

const MIGRATION = resolve(__dirname, '../../../drizzle/0012_add_learn_playlists.sql');

async function freshDb(): Promise<QueryDB> {
  const client = createClient({ url: ':memory:' });
  await client.execute('CREATE TABLE `user` (`id` text PRIMARY KEY NOT NULL)');
  await client.execute("INSERT INTO `user` (`id`) VALUES ('ada'), ('bob')");
  for (const statement of readFileSync(MIGRATION, 'utf8').split('--> statement-breakpoint')) {
    await client.execute(statement);
  }
  return drizzle(client) as unknown as QueryDB;
}

const playlist = (overrides: Partial<Playlist> = {}): Playlist => ({
  id: 'p1',
  title: 'Algorithms',
  categoryId: 'custom',
  majorId: 'custom',
  visibility: 'private',
  ownerId: 'ada',
  members: [],
  items: [
    {
      id: 'a',
      title: 'Intro lecture',
      url: 'https://ocw.mit.edu/courses/a/',
      kind: 'courseware',
      minutes: 60,
      estimate: 'rough',
      provenance: { provider: 'mit_ocw', method: 'curated_seed', verified: false },
    },
  ],
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
  ...overrides,
});

describe('createD1PlaylistRepository', () => {
  let db: QueryDB;
  beforeEach(async () => {
    db = await freshDb();
  });

  it('stores a playlist with its members and finds it by owner, member, address and token', async () => {
    const repo = createD1PlaylistRepository(db);
    await repo.put(
      playlist({
        members: [
          { email: 'bob@example.com', userId: 'bob', role: 'editor', status: 'active' },
          { email: 'eve@example.com', role: 'viewer', status: 'invited', inviteToken: 'tok-eve' },
        ],
      }),
    );
    const stored = await repo.get('p1');
    expect(stored).toMatchObject({ id: 'p1', title: 'Algorithms', ownerId: 'ada', visibility: 'private' });
    expect(stored?.items).toHaveLength(1);
    expect(stored?.members).toEqual([
      { email: 'bob@example.com', userId: 'bob', role: 'editor', status: 'active', inviteToken: undefined },
      { email: 'eve@example.com', userId: undefined, role: 'viewer', status: 'invited', inviteToken: 'tok-eve' },
    ]);
    expect((await repo.listForUser('ada')).map((p) => p.id)).toEqual(['p1']);
    expect((await repo.listForUser('bob')).map((p) => p.id)).toEqual(['p1']);
    expect((await repo.listForUser('eve-id', 'eve@example.com')).map((p) => p.id)).toEqual(['p1']);
    expect(await repo.listForUser('eve-id')).toEqual([]);
    expect((await repo.findByInviteToken('tok-eve'))?.id).toBe('p1');
    expect(await repo.findByInviteToken('nope')).toBeNull();
  });

  it('replaces the member list on update and deletes members with the playlist', async () => {
    const repo = createD1PlaylistRepository(db);
    await repo.put(playlist({ members: [{ email: 'eve@example.com', role: 'viewer', status: 'invited', inviteToken: 't1' }] }));
    await repo.put(playlist({ title: 'Algorithms II', visibility: 'public', members: [{ email: 'eve@example.com', role: 'viewer', status: 'invited', inviteToken: 't1' }] }));
    expect(await repo.get('p1')).toMatchObject({ title: 'Algorithms II', visibility: 'public' });
    expect((await repo.get('p1'))?.members).toHaveLength(1);
    await repo.put(playlist({ members: [] }));
    expect((await repo.get('p1'))?.members).toEqual([]);
    await repo.put(playlist({ members: [{ email: 'eve@example.com', role: 'viewer', status: 'invited', inviteToken: 't2' }] }));
    await repo.delete('p1');
    expect(await repo.get('p1')).toBeNull();
    expect(await repo.findByInviteToken('t2')).toBeNull();
  });

  it('writes a member list larger than one D1 statement allows', async () => {
    const repo = createD1PlaylistRepository(db);
    const members = Array.from({ length: 50 }, (_, i) => ({ email: `m${i}@example.com`, role: 'viewer' as const, status: 'invited' as const, inviteToken: `t${i}` }));
    await repo.put(playlist({ members }));
    expect((await repo.get('p1'))?.members).toHaveLength(50);
  });

  it('carries an invite from the owner to the invitee through the store handler', async () => {
    const repo = createD1PlaylistRepository(db);
    const as = (id: string, email: string) => ({ repository: repo, getUser: async () => ({ id, email }) });
    const req = (method: string, path: string, body?: unknown) =>
      new Request(`http://localhost/api/learn/playlists${path}`, { method, body: body ? JSON.stringify(body) : undefined });

    const saved = await handlePlaylistStoreRequest(req('PUT', '/p1', playlist({ members: [{ email: 'bob@example.com', role: 'viewer', status: 'invited' }] })), as('ada', 'ada@example.com'));
    expect(saved.status).toBe(201);
    const listed = await (await handlePlaylistStoreRequest(req('GET', ''), as('bob', 'bob@example.com'))).json();
    expect(listed.invites).toHaveLength(1);
    const accepted = await handlePlaylistStoreRequest(req('POST', '/accept-invite', { token: listed.invites[0].token }), as('bob', 'bob@example.com'));
    expect(accepted.status).toBe(200);
    const after = await (await handlePlaylistStoreRequest(req('GET', ''), as('bob', 'bob@example.com'))).json();
    expect(after.playlists.map((p: Playlist) => p.title)).toEqual(['Algorithms']);
  });
});

describe('currentPlaylistUser', () => {
  it('passes the signed-in user through and keeps anonymous guests out', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'ada', email: 'ada@example.com', name: 'Ada', emailVerified: true } });
    expect(await currentPlaylistUser()).toEqual({ id: 'ada', email: 'ada@example.com', emailVerified: true, name: 'Ada' });
    mockGetSession.mockResolvedValue({ user: { id: 'guest', email: 'temp@guest', name: 'Guest', isAnonymous: true } });
    expect(await currentPlaylistUser()).toBeNull();
    mockGetSession.mockResolvedValue(null);
    expect(await currentPlaylistUser()).toBeNull();
  });
});
