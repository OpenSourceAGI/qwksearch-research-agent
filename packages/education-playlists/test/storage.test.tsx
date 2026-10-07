import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { createMemoryPlaylistRepository, handlePlaylistStoreRequest, type PlaylistUser, type InviteNotice } from '../src/server';
import { createRemotePlaylistStore, inviteLink, readInviteFragment } from '../src/api/playlists';
import { createLocalPlaylistStore, createPlaylist } from '../src/lib/playlists';
import { EducationPlaylists } from '../src/components/EducationPlaylists';
import type { Playlist, PlaylistItem } from '../src/types';

const BASE = 'https://app.test/api/learn/playlists';

const item: PlaylistItem = {
  id: 'a',
  title: 'Intro lecture',
  url: 'https://ocw.mit.edu/courses/a/',
  kind: 'courseware',
  minutes: 60,
  estimate: 'rough',
  provenance: { provider: 'mit_ocw', method: 'curated_seed', verified: false },
};

const users: Record<string, PlaylistUser> = {
  ada: { id: 'ada', email: 'ada@example.com', name: 'Ada' },
  bob: { id: 'bob', email: 'bob@example.com' },
  eve: { id: 'eve', email: 'eve@example.com' },
  mallory: { id: 'mallory', email: 'bob@example.com', emailVerified: false },
};

/** A handler over one in-memory repository; the `x-user` header says who is signed in. */
function server(notifyInvite?: (notice: InviteNotice) => void) {
  const repository = createMemoryPlaylistRepository();
  const handle = (request: Request) =>
    handlePlaylistStoreRequest(request, {
      repository,
      getUser: async (req) => users[req.headers.get('x-user') ?? ''] ?? null,
      notifyInvite,
    });
  const call = async (as: string | null, method: string, path = '', body?: unknown) => {
    const res = await handle(
      new Request(`${BASE}${path}`, {
        method,
        headers: as ? { 'x-user': as } : {},
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
    );
    return { status: res.status, body: (await res.json()) as Record<string, any> };
  };
  return { repository, handle, call };
}

const draft = (overrides: Partial<Playlist> = {}): Playlist => ({ ...createPlaylist({ title: 'Algorithms', items: [item] }), id: 'p1', ...overrides });

describe('playlist store handler', () => {
  it('makes the caller the owner and lists the playlist on any device they sign in from', async () => {
    const { call } = server();
    expect((await call(null, 'PUT', '/p1', draft())).status).toBe(401);
    const created = await call('ada', 'PUT', '/p1', { ...draft(), ownerId: 'someone-else' });
    expect(created.status).toBe(201);
    expect(created.body.playlist.ownerId).toBe('ada');
    const listed = await call('ada', 'GET');
    expect(listed.body.playlists.map((p: Playlist) => p.id)).toEqual(['p1']);
    expect((await call('bob', 'GET')).body.playlists).toEqual([]);
  });

  it('hides a private playlist from everyone else, and serves a public one to anyone', async () => {
    const { call } = server();
    await call('ada', 'PUT', '/p1', draft());
    expect((await call('bob', 'GET', '/p1')).status).toBe(404);
    expect((await call(null, 'GET', '/p1')).status).toBe(404);
    expect((await call('bob', 'PUT', '/p1', draft({ title: 'Mine now' }))).status).toBe(404);
    expect((await call('bob', 'DELETE', '/p1')).status).toBe(404);
    await call('ada', 'PUT', '/p1', draft({ visibility: 'public' }));
    expect((await call(null, 'GET', '/p1')).body.playlist.title).toBe('Algorithms');
    expect((await call('bob', 'PUT', '/p1', draft({ title: 'Mine now' }))).status).toBe(403);
  });

  it('delivers an invite to the invitee, who accepts it and can then view but not edit', async () => {
    const notify = vi.fn();
    const { call } = server(notify);
    const saved = await call('ada', 'PUT', '/p1', draft({ members: [{ email: 'Bob@Example.com', role: 'viewer', status: 'active', userId: 'forged', inviteToken: 'forged' }] }));
    const member = saved.body.playlist.members[0];
    // The server, not the client, decides status and token.
    expect(member).toMatchObject({ email: 'bob@example.com', status: 'invited' });
    expect(member.userId).toBeUndefined();
    expect(member.inviteToken).not.toBe('forged');
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({ to: 'bob@example.com', token: member.inviteToken, playlist: { id: 'p1', title: 'Algorithms' } }));

    const pending = await call('bob', 'GET');
    expect(pending.body.playlists).toEqual([]);
    expect(pending.body.invites).toEqual([{ playlistId: 'p1', title: 'Algorithms', role: 'viewer', token: member.inviteToken }]);

    expect((await call('bob', 'POST', '/accept-invite', { token: 'nope' })).status).toBe(404);
    const accepted = await call('bob', 'POST', '/accept-invite', { token: member.inviteToken });
    expect(accepted.status).toBe(200);
    expect(accepted.body.playlist.members[0]).toEqual({ email: 'bob@example.com', role: 'viewer', status: 'active', userId: 'bob' });

    const after = await call('bob', 'GET');
    expect(after.body.playlists.map((p: Playlist) => p.id)).toEqual(['p1']);
    expect(after.body.invites).toEqual([]);
    expect((await call('bob', 'PUT', '/p1', draft({ title: 'Changed' }))).status).toBe(403);
    expect((await call('bob', 'POST', '/accept-invite', { token: member.inviteToken })).status).toBe(404);
  });

  it('refuses a forwarded invite link and an unverified address', async () => {
    const { call } = server();
    const saved = await call('ada', 'PUT', '/p1', draft({ members: [{ email: 'bob@example.com', role: 'viewer', status: 'invited' }] }));
    const token = saved.body.playlist.members[0].inviteToken;
    expect((await call('eve', 'POST', '/accept-invite', { token })).status).toBe(403);
    expect((await call('mallory', 'POST', '/accept-invite', { token })).status).toBe(403);
    expect((await call('mallory', 'GET')).body.invites).toEqual([]);
  });

  it('lets an editor change items but not visibility or members, and keeps tokens from non-owners', async () => {
    const { call } = server();
    const saved = await call('ada', 'PUT', '/p1', draft({ members: [{ email: 'bob@example.com', role: 'editor', status: 'invited' }, { email: 'eve@example.com', role: 'viewer', status: 'invited' }] }));
    await call('bob', 'POST', '/accept-invite', { token: saved.body.playlist.members[0].inviteToken });

    const edited = await call('bob', 'PUT', '/p1', draft({ title: 'Algorithms II', visibility: 'public', members: [] }));
    expect(edited.status).toBe(200);
    expect(edited.body.playlist).toMatchObject({ title: 'Algorithms II', visibility: 'private', ownerId: 'ada' });
    expect(edited.body.playlist.members).toHaveLength(2);
    expect(edited.body.playlist.members.every((m: { inviteToken?: string }) => m.inviteToken === undefined)).toBe(true);
    expect((await call('bob', 'DELETE', '/p1')).status).toBe(403);

    // The owner removing a member removes them.
    const trimmed = await call('ada', 'PUT', '/p1', { ...edited.body.playlist, members: [{ email: 'bob@example.com', role: 'viewer' }] });
    expect(trimmed.body.playlist.members).toEqual([{ email: 'bob@example.com', role: 'viewer', status: 'active', userId: 'bob' }]);
    expect((await call('ada', 'DELETE', '/p1')).status).toBe(200);
    expect((await call('ada', 'GET')).body.playlists).toEqual([]);
  });

  it('rejects unusable ids, bodies and paths', async () => {
    const { call, handle } = server();
    expect((await call('ada', 'PUT', '/bad%20id', draft())).status).toBe(404);
    expect((await call('ada', 'PUT', '/p1', { title: 'No items', items: [] })).status).toBe(400);
    expect((await call('ada', 'PUT', '/p1/extra', draft())).status).toBe(404);
    const big = await handle(new Request(`${BASE}/p1`, { method: 'PUT', headers: { 'x-user': 'ada' }, body: 'x'.repeat(70 * 1024) }));
    expect(big.status).toBe(413);
  });
});

describe('remote playlist store', () => {
  it('round-trips through the handler and re-validates what comes back', async () => {
    const { handle } = server();
    const asAda = (input: RequestInfo | URL, init?: RequestInit) => handle(new Request(new URL(String(input), BASE), { ...init, headers: { ...(init?.headers as object), 'x-user': 'ada' } }));
    const store = createRemotePlaylistStore('/api/learn/playlists/', asAda as typeof fetch);
    const saved = await store.save(draft({ items: [item, { ...item, id: 'b', url: 'javascript:alert(1)' }] }));
    expect(saved.items.map((i) => i.id)).toEqual(['a']);
    expect((await store.list()).playlists[0].ownerId).toBe('ada');
    await store.remove('p1');
    expect((await store.list()).playlists).toEqual([]);
    await expect(store.acceptInvite('missing')).rejects.toThrow('no longer valid');
  });

  it('reads and writes invite links', () => {
    const link = inviteLink('https://app.test/learn#old', 'tok/1');
    expect(link).toBe('https://app.test/learn#invite=tok%2F1');
    expect(readInviteFragment(new URL(link).hash)).toBe('tok/1');
    expect(readInviteFragment('#playlist=abc')).toBeNull();
  });
});

describe('EducationPlaylists with an account', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';
  });

  function stubFetch(handle: (request: Request) => Promise<Response>, user: string) {
    vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) =>
      handle(new Request(new URL(String(input), 'https://app.test'), { ...init, headers: { ...(init?.headers as object), 'x-user': user } })),
    );
  }

  it('moves device playlists into the account and saves copies there', async () => {
    const { handle, repository } = server();
    createLocalPlaylistStore().save(draft({ id: 'local1', title: 'Made offline' }));
    stubFetch(handle, 'ada');
    render(<EducationPlaylists userId="ada" playlistsEndpoint="/api/learn/playlists" />);
    await waitFor(async () => expect((await repository.get('local1'))?.ownerId).toBe('ada'));
    expect(createLocalPlaylistStore().list()).toEqual([]);

    fireEvent.click(screen.getByRole('button', { name: /CS Foundations/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Save to my playlists' }));
    await waitFor(async () => expect((await repository.listForUser('ada')).map((p) => p.title)).toContain('CS Foundations'));
    expect(screen.queryByText(/kept on this device/)).toBeNull();
  });

  it('shows a pending invite and opens the playlist once accepted', async () => {
    const { handle, call } = server();
    await call('ada', 'PUT', '/p1', draft({ title: 'Shared algorithms', members: [{ email: 'bob@example.com', role: 'viewer', status: 'invited' }] }));
    stubFetch(handle, 'bob');
    render(<EducationPlaylists userId="bob" playlistsEndpoint="/api/learn/playlists" />);
    fireEvent.click(await screen.findByRole('tab', { name: /1 invite/ }));
    expect(screen.getByText(/invited to/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Accept' }));
    expect(await screen.findByText('Shared algorithms')).toBeTruthy();
    // A viewer gets neither delete nor the owner's sharing controls.
    expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull();
    expect(screen.queryByLabelText('Invite by email')).toBeNull();
  });

  it('accepts an invite link on arrival, and asks a signed-out visitor to sign in', async () => {
    const { handle, call } = server();
    const saved = await call('ada', 'PUT', '/p1', draft({ title: 'Linked playlist', members: [{ email: 'bob@example.com', role: 'viewer', status: 'invited' }] }));
    window.location.hash = `invite=${saved.body.playlist.members[0].inviteToken}`;

    const { unmount } = render(<EducationPlaylists importFromHash playlistsEndpoint="/api/learn/playlists" />);
    expect(screen.getByText(/Sign in with the invited email/)).toBeTruthy();
    unmount();

    stubFetch(handle, 'bob');
    render(<EducationPlaylists importFromHash userId="bob" playlistsEndpoint="/api/learn/playlists" />);
    expect(await screen.findByText('Linked playlist')).toBeTruthy();
    expect(window.location.hash).toBe('');
  });
});
