import { beforeEach, describe, expect, it } from 'vitest';
import { LRUCache, createKeysLocalStorageLRUCache } from '../src/utils/lru-cache';

describe('LRUCache', () => {
  it('stores and retrieves values', () => {
    const cache = new LRUCache(3);
    cache.put('a', 1);

    expect(cache.get('a')).toBe(1);
  });

  it('returns -1 for a missing key', () => {
    expect(new LRUCache(3).get('nope')).toBe(-1);
  });

  it('lists keys most-recently-used first', () => {
    const cache = new LRUCache(3);
    cache.put('a', 1);
    cache.put('b', 2);
    cache.put('c', 3);

    expect(cache.keys()).toEqual(['c', 'b', 'a']);
    expect(cache.values()).toEqual([3, 2, 1]);
  });

  it('promotes a key to the front on read', () => {
    const cache = new LRUCache(3);
    cache.put('a', 1);
    cache.put('b', 2);
    cache.put('c', 3);

    cache.get('a');

    expect(cache.keys()).toEqual(['a', 'c', 'b']);
  });

  it('promotes a key to the front when overwritten', () => {
    const cache = new LRUCache(3);
    cache.put('a', 1);
    cache.put('b', 2);

    cache.put('a', 99);

    expect(cache.keys()).toEqual(['a', 'b']);
    expect(cache.get('a')).toBe(99);
  });

  it('evicts the least recently used entry past capacity', () => {
    const cache = new LRUCache(2);
    cache.put('a', 1);
    cache.put('b', 2);
    cache.put('c', 3);

    expect(cache.get('a')).toBe(-1);
    expect(cache.keys()).toEqual(['c', 'b']);
  });

  it('spares an entry that was recently read', () => {
    const cache = new LRUCache(2);
    cache.put('a', 1);
    cache.put('b', 2);
    cache.get('a');

    cache.put('c', 3);

    expect(cache.get('a')).toBe(1);
    expect(cache.get('b')).toBe(-1);
  });

  it('defaults to a capacity of 20', () => {
    const cache = new LRUCache(0);
    for (let i = 0; i < 21; i++) cache.put(`k${i}`, i);

    expect(cache.keys()).toHaveLength(20);
    expect(cache.get('k0')).toBe(-1);
  });

  it('exposes its backing store through toJSON', () => {
    const cache = new LRUCache(2);
    cache.put('a', 1);

    expect(Object.keys(cache.toJSON())).toEqual(['a']);
  });
});

describe('createKeysLocalStorageLRUCache', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('starts empty', () => {
    const manager = createKeysLocalStorageLRUCache('recent-files', 3);

    expect(manager.get()).toEqual([]);
  });

  it('records keys most-recent-first', () => {
    const manager = createKeysLocalStorageLRUCache('recent-files', 3);
    manager.put('a');
    manager.put('b');

    expect(manager.get()).toEqual(['b', 'a']);
  });

  it('persists the key order to localStorage on every put', () => {
    const manager = createKeysLocalStorageLRUCache('recent-files', 3);
    manager.put('a');
    manager.put('b');

    expect(JSON.parse(window.localStorage.getItem('recent-files')!)).toEqual(['b', 'a']);
  });

  it('looks up a single key', () => {
    const manager = createKeysLocalStorageLRUCache('recent-files', 3);
    manager.put('a');

    expect(manager.get('a')).toBe('a');
    expect(manager.get('missing')).toBe(-1);
  });

  it('restores the previous order from storage', () => {
    window.localStorage.setItem('recent-files', JSON.stringify(['b', 'a']));
    const manager = createKeysLocalStorageLRUCache('recent-files', 3);

    manager.syncFromStorage();

    expect(manager.get()).toEqual(['b', 'a']);
  });

  it('treats an empty storage slot as no history', () => {
    const manager = createKeysLocalStorageLRUCache('recent-files', 3);

    manager.syncFromStorage();

    expect(manager.get()).toEqual([]);
  });

  it('drops the oldest key past capacity', () => {
    const manager = createKeysLocalStorageLRUCache('recent-files', 2);
    manager.put('a');
    manager.put('b');
    manager.put('c');

    expect(manager.get()).toEqual(['c', 'b']);
  });
});
