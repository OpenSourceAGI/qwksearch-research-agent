
import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, newCollection, migrate, validateSpaces, moveSpace } from '../extension/lib/model.js';
import { backupExport, parseImport } from '../extension/lib/portable.js';

test('legacy library gains a default space without changing collection or link IDs', () => {
  const old = initialState();
  delete old.spaces;
  const c = newCollection('Existing work');
  delete c.spaceId;
  old.collections.push(c);
  const next = migrate(old);
  assert.equal(next.collections[0].id, c.id);
  assert.equal(next.collections[0].spaceId, next.spaces[0].id);
  assert(!old.spaces);
});
test('spaces and collection membership survive backup and validation', () => {
  const state = initialState();
  state.spaces.push({ id: 'study', name: 'Study' });
  state.collections.push({ ...newCollection('Capstone'), spaceId: 'study' });
  const imported = parseImport(backupExport(state));
  assert.deepEqual(imported.spaces, state.spaces);
  assert.equal(imported.collections[0].spaceId, 'study');
  assert.equal(migrate(state).collections[0].spaceId, 'study');
});
test('invalid spaces fail rather than merging or losing memberships', () => {
  assert.throws(() => validateSpaces([{ id: 'a' }, { id: 'a' }]));
  assert.throws(() => validateSpaces([]));
});

test('spaces move in both directions and to the end without changing collection membership', () => {
  const state = initialState();
  state.spaces.push({ id: 'game', name: 'Game' }, { id: 'coding', name: 'Coding' });
  state.collections.push({ ...newCollection('Work'), spaceId: 'coding' });
  const collections = structuredClone(state.collections);
  moveSpace(state.spaces, 'coding', 'main');
  assert.deepEqual(state.spaces.map(s => s.id), ['coding', 'main', 'game']);
  moveSpace(state.spaces, 'coding', 'game');
  assert.deepEqual(state.spaces.map(s => s.id), ['main', 'coding', 'game']);
  moveSpace(state.spaces, 'main');
  assert.deepEqual(state.spaces.map(s => s.id), ['coding', 'game', 'main']);
  assert.deepEqual(migrate(state).spaces, state.spaces);
  assert.deepEqual(parseImport(backupExport(state)).spaces, state.spaces);
  assert.deepEqual(state.collections, collections);
});

test('self drops, single spaces and stale reorder targets preserve the saved list', () => {
  const spaces = [{ id: 'main', name: 'My space' }];
  moveSpace(spaces, 'main', 'main');
  moveSpace(spaces, 'main');
  const before = structuredClone(spaces);
  assert.throws(() => moveSpace(spaces, 'missing'), /Space not found/);
  assert.throws(() => moveSpace(spaces, 'main', 'deleted'), /Destination space not found/);
  assert.deepEqual(spaces, before);
});

test('collection folding survives backup import without changing saved content', () => {
  const state = initialState();
  const c = {
    ...newCollection('Folded work'),
    collapsed: true,
    links: [
      { id: 'link', url: 'https://example.org/', title: 'Example', groupId: null, note: 'Keep' },
    ],
  };
  state.collections.push(c);
  const restored = parseImport(backupExport(state)).collections[0];
  assert.equal(restored.collapsed, true);
  assert.notEqual(restored.id, c.id); // Import creates a separate copy.
  assert.equal(restored.name, c.name);
  assert.equal(restored.links[0].url, c.links[0].url);
  assert.equal(restored.links[0].note, 'Keep');
});
