import { describe, it, expect, beforeEach } from 'vitest';
import { formatMinutes, playlistTime, weeksToFinish } from '../src/lib/time';
import { createProgressStore, toggleDone } from '../src/lib/progress';
import { addItem, createLocalPlaylistStore, createPlaylist, moveItem, removeItem } from '../src/lib/playlists';
import { acceptInvite, canEdit, canView, decodeShareFragment, encodeShareFragment, invite, removeMember } from '../src/lib/sharing';
import { safeUrl, sanitizePlaylist } from '../src/lib/sanitize';
import { searchCatalog } from '../src/lib/search';
import { catalogItems, getDefaultCatalog } from '../src/catalog';
import type { PlaylistItem } from '../src/types';

const item = (id: string, minutes: number, url = `https://example.com/${id}`): PlaylistItem => ({
  id,
  title: `Item ${id}`,
  url,
  kind: 'video',
  minutes,
  estimate: 'exact',
  provenance: { provider: 'web', method: 'user', verified: false },
});

beforeEach(() => localStorage.clear());

describe('time', () => {
  it('formats minutes and hours', () => {
    expect(formatMinutes(45)).toBe('45 min');
    expect(formatMinutes(180)).toBe('3 h');
    expect(formatMinutes(150)).toBe('2 h 30 min');
    expect(formatMinutes(10550)).toBe('176 h');
  });

  it('measures progress by time, not by item count', () => {
    const playlist = createPlaylist({ title: 'p', items: [item('a', 30), item('b', 90)] });
    const time = playlistTime(playlist, new Set(['b']));
    expect(time).toMatchObject({ totalMinutes: 120, doneMinutes: 90, remainingMinutes: 30, percent: 75, doneCount: 1, itemCount: 2 });
  });

  it('turns a weekly pace into weeks left', () => {
    expect(weeksToFinish(600, 300)).toBe(2);
    expect(weeksToFinish(601, 300)).toBe(3);
    expect(weeksToFinish(600)).toBeNull();
  });
});

describe('progress', () => {
  it('round-trips checkmarks through localStorage', () => {
    const store = createProgressStore('test.progress');
    store.save(toggleDone(new Set(), 'x'));
    expect([...createProgressStore('test.progress').load()]).toEqual(['x']);
    expect(toggleDone(new Set(['x']), 'x').size).toBe(0);
  });

  it('survives corrupt storage', () => {
    localStorage.setItem('test.progress', '{not json');
    expect(createProgressStore('test.progress').load().size).toBe(0);
  });
});

describe('playlists', () => {
  it('adds without duplicating a URL, removes and reorders', () => {
    let playlist = createPlaylist({ title: 'p' });
    playlist = addItem(playlist, item('a', 10));
    playlist = addItem(playlist, item('b', 10));
    playlist = addItem(playlist, item('c', 10, 'https://example.com/a'));
    expect(playlist.items.map((i) => i.id)).toEqual(['a', 'b']);
    expect(moveItem(playlist, 1, 0).items.map((i) => i.id)).toEqual(['b', 'a']);
    expect(removeItem(playlist, 'a').items.map((i) => i.id)).toEqual(['b']);
  });

  it('stores playlists newest first and keeps private ones private', () => {
    const store = createLocalPlaylistStore('test.mine');
    const one = createPlaylist({ title: 'one', items: [item('a', 10)] });
    const two = createPlaylist({ title: 'two', items: [item('b', 10)], visibility: 'public' });
    store.save(one);
    store.save(two);
    const listed = createLocalPlaylistStore('test.mine').list();
    expect(listed.map((p) => p.title)).toEqual(['two', 'one']);
    expect(listed.map((p) => p.visibility)).toEqual(['public', 'private']);
    expect(store.remove(two.id).map((p) => p.title)).toEqual(['one']);
  });
});

describe('sharing', () => {
  const owned = () => createPlaylist({ title: 'p', ownerId: 'owner', items: [item('a', 10)] });

  it('lets only the owner and active members see a private playlist', () => {
    let playlist = invite(owned(), 'Friend@Example.com', 'editor', () => 'tok');
    expect(canView(playlist, 'owner')).toBe(true);
    expect(canView(playlist, 'friend')).toBe(false);
    expect(acceptInvite(playlist, 'wrong', 'friend')).toBeNull();
    playlist = acceptInvite(playlist, 'tok', 'friend')!;
    expect(canView(playlist, 'friend')).toBe(true);
    expect(canEdit(playlist, 'friend')).toBe(true);
    expect(canView(playlist, 'stranger')).toBe(false);
    expect(playlist.members![0]).toMatchObject({ email: 'friend@example.com', status: 'active', inviteToken: undefined });
  });

  it('never lets anyone edit a preset', () => {
    expect(canEdit({ ...owned(), visibility: 'preset' }, 'owner')).toBe(false);
  });

  it('updates an existing invite instead of adding a second row, and rejects bad addresses', () => {
    let playlist = invite(owned(), 'a@b.co', 'viewer');
    playlist = invite(playlist, 'A@B.co', 'editor');
    expect(playlist.members).toHaveLength(1);
    expect(playlist.members![0].role).toBe('editor');
    expect(() => invite(playlist, 'nope', 'viewer')).toThrow();
    expect(removeMember(playlist, 'a@b.co').members).toHaveLength(0);
  });

  it('round-trips a public playlist through a share link without its members', () => {
    const playlist = { ...invite(owned(), 'a@b.co', 'viewer'), visibility: 'public' as const };
    const decoded = decodeShareFragment(`#${encodeShareFragment(playlist)}`)!;
    expect(decoded.title).toBe('p');
    expect(decoded.items[0].url).toBe('https://example.com/a');
    expect(decoded.members).toBeUndefined();
    expect(decoded.visibility).toBe('public');
  });

  it('refuses to put a private playlist in a link', () => {
    expect(() => encodeShareFragment(owned())).toThrow();
  });
});

describe('sanitize', () => {
  it('keeps only http(s) URLs', () => {
    expect(safeUrl('javascript:alert(1)')).toBeNull();
    expect(safeUrl('data:text/html,hi')).toBeNull();
    expect(safeUrl('https://ocw.mit.edu/')).toBe('https://ocw.mit.edu/');
  });

  it('drops unsafe items and never trusts a claim of verification', () => {
    const playlist = sanitizePlaylist({
      title: 'x',
      visibility: 'preset',
      items: [
        { title: 'bad', url: 'javascript:alert(1)' },
        { title: 'good', url: 'https://example.com', minutes: 1e9, provenance: { verified: true } },
      ],
    })!;
    expect(playlist.items).toHaveLength(1);
    expect(playlist.items[0].provenance.verified).toBe(false);
    expect(playlist.items[0].minutes).toBe(500 * 60);
    expect(playlist.visibility).toBe('public');
  });

  it('returns null when nothing usable is left', () => {
    expect(sanitizePlaylist({ title: 'x', items: [{ title: 'bad', url: 'ftp://x' }] })).toBeNull();
    expect(sanitizePlaylist('nope')).toBeNull();
  });
});

describe('searchCatalog', () => {
  it('finds courses by subject and by course number', () => {
    const items = catalogItems(getDefaultCatalog());
    expect(searchCatalog(items, 'linear algebra')[0].courseNumber).toBe('18.06');
    expect(searchCatalog(items, '6.006').some((i) => i.courseNumber === '6.006')).toBe(true);
    expect(searchCatalog(items, 'the and of')).toEqual([]);
  });
});
