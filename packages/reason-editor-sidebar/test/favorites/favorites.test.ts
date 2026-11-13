/**
 * The favorites store: favorites and last-used times persist in
 * localStorage, every write notifies mounted sidebars, and the bookmarks
 * list is favorited files only, most recently used first.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  FAVORITES_CHANGED_EVENT,
  FAVORITES_STORAGE_KEY,
  LAST_USED_STORAGE_KEY,
  MAX_LAST_USED_ENTRIES,
  formatLastUsed,
  getFavoriteDocuments,
  getFavorites,
  getLastUsed,
  isFavorite,
  recordDocumentUse,
  setFavorite,
  toggleFavorite,
} from '../../src/favorites/favorites';
import type { Document } from '../../src/documents/DocumentTree';

function doc(id: string, extra: Partial<Document> = {}): Document {
  return { id, title: id, content: '', parentId: null, ...extra } as Document;
}

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe('favorites storage', () => {
  it('toggles a favorite on and off and persists it', () => {
    expect(toggleFavorite('a', 100)).toBe(true);
    expect(isFavorite('a')).toBe(true);
    expect(JSON.parse(localStorage.getItem(FAVORITES_STORAGE_KEY)!)).toEqual({ a: 100 });

    expect(toggleFavorite('a')).toBe(false);
    expect(isFavorite('a')).toBe(false);
    expect(getFavorites()).toEqual({});
  });

  it('keeps the original favorited time when favorited again', () => {
    setFavorite('a', true, 100);
    setFavorite('a', true, 200);
    expect(getFavorites()).toEqual({ a: 100 });
  });

  it('dispatches the change event on every write', () => {
    const listener = vi.fn();
    window.addEventListener(FAVORITES_CHANGED_EVENT, listener);
    toggleFavorite('a');
    recordDocumentUse('a');
    window.removeEventListener(FAVORITES_CHANGED_EVENT, listener);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('ignores corrupt or non-numeric stored values', () => {
    localStorage.setItem(FAVORITES_STORAGE_KEY, 'not json');
    expect(getFavorites()).toEqual({});
    localStorage.setItem(LAST_USED_STORAGE_KEY, JSON.stringify({ a: 5, b: 'x', c: null }));
    expect(getLastUsed()).toEqual({ a: 5 });
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(['a']));
    expect(getFavorites()).toEqual({});
  });

  it('records last use and caps the map to the most recent entries', () => {
    const seeded: Record<string, number> = {};
    for (let i = 0; i < MAX_LAST_USED_ENTRIES; i++) seeded[`d${i}`] = i + 1;
    localStorage.setItem(LAST_USED_STORAGE_KEY, JSON.stringify(seeded));

    recordDocumentUse('newest', 10_000);
    const lastUsed = getLastUsed();
    expect(Object.keys(lastUsed)).toHaveLength(MAX_LAST_USED_ENTRIES);
    expect(lastUsed.newest).toBe(10_000);
    // The oldest entry was dropped.
    expect(lastUsed.d0).toBeUndefined();
  });
});

describe('getFavoriteDocuments', () => {
  it('lists favorited files most recently used first', () => {
    const documents = [doc('a'), doc('b'), doc('c'), doc('d')];
    const favorites = { a: 1, b: 1, c: 1 };
    const lastUsed = { a: 10, b: 30, c: 20, d: 99 };
    expect(getFavoriteDocuments(documents, favorites, lastUsed).map((d) => d.id)).toEqual([
      'b',
      'c',
      'a',
    ]);
  });

  it('falls back to the favorited time for never-opened favorites', () => {
    const documents = [doc('a'), doc('b')];
    expect(getFavoriteDocuments(documents, { a: 50, b: 5 }, { b: 40 }).map((d) => d.id)).toEqual([
      'a',
      'b',
    ]);
  });

  it('leaves out folders, deleted documents and favorites with no document', () => {
    const documents = [doc('f', { isFolder: true }), doc('x', { isDeleted: true }), doc('a')];
    const favorites = { f: 1, x: 1, a: 1, gone: 1 };
    expect(getFavoriteDocuments(documents, favorites, {}).map((d) => d.id)).toEqual(['a']);
  });

  it('keeps tree order for ties', () => {
    const documents = [doc('a'), doc('b'), doc('c')];
    expect(getFavoriteDocuments(documents, { c: 1, a: 1, b: 1 }, {}).map((d) => d.id)).toEqual([
      'a',
      'b',
      'c',
    ]);
  });
});

describe('formatLastUsed', () => {
  const now = 1_000_000_000_000;
  it.each([
    [undefined, ''],
    [now - 10_000, 'now'],
    [now - 5 * 60_000, '5m'],
    [now - 3 * 3_600_000, '3h'],
    [now - 2 * 86_400_000, '2d'],
    [now - 15 * 86_400_000, '2w'],
  ])('formats %s as %s', (timestamp, expected) => {
    expect(formatLastUsed(timestamp, now)).toBe(expected);
  });
});
