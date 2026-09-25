import test from 'node:test';
import assert from 'node:assert/strict';
import { editSavedSelection } from '../extension/lib/selection.js';
import { previewDimensions } from '../extension/lib/previews.js';

function fixture() {
  return [
    {
      id: 'a',
      groups: [
        { id: 'g', name: 'Research', collapsed: true },
        { id: 'empty', name: 'Empty' },
      ],
      links: [
        { id: 'one', title: 'One', url: 'https://a.test/', groupId: 'g', note: 'Keep this note' },
        { id: 'two', title: 'Two', url: 'https://b.test/', groupId: 'g' },
      ],
    },
    { id: 'b', groups: [{ id: 'g', name: 'Existing' }], links: [{ id: 'other', groupId: 'g' }] },
  ];
}
test('group and ungroup selected saved links preserve identities and remove only emptied populated groups', () => {
  const cs = fixture();
  editSavedSelection(cs, 'a', { kind: 'group-links', linkIds: ['one'], groupId: 'new' });
  assert.equal(cs[0].links[0].groupId, 'new');
  assert.equal(cs[0].links[1].groupId, 'g');
  editSavedSelection(cs, 'a', { kind: 'ungroup-links', linkIds: ['one'] });
  assert.equal(cs[0].links[0].groupId, null);
  assert.deepEqual(
    cs[0].groups.map((g) => g.id),
    ['g', 'empty'],
  );
  assert.equal(cs[0].links[0].note, 'Keep this note');
});
test('moving a partial group preserves remaining links and remaps destination group collisions', () => {
  const cs = fixture();
  editSavedSelection(cs, 'a', { kind: 'move-links', linkIds: ['one'], destinationId: 'b' });
  assert.deepEqual(
    cs[0].links.map((l) => l.id),
    ['two'],
  );
  const moved = cs[1].links.find((l) => l.id === 'one');
  assert.equal(moved.note, 'Keep this note');
  assert.notEqual(moved.groupId, 'g');
  assert.equal(cs[1].groups.find((g) => g.id === moved.groupId).name, 'Research');
  assert.equal(cs[1].links[0].groupId, 'g');
});
test('bulk remove is confined to its collection and prunes the emptied group', () => {
  const cs = fixture(),
    other = structuredClone(cs[1]);
  editSavedSelection(cs, 'a', { kind: 'delete-links', linkIds: ['one', 'two', 'other'] });
  assert.equal(cs[0].links.length, 0);
  assert.deepEqual(
    cs[0].groups.map((g) => g.id),
    ['empty'],
  );
  assert.deepEqual(cs[1], other);
});
test('invalid batch targets do not mutate saved links', () => {
  const cs = fixture(),
    before = structuredClone(cs);
  assert.throws(() =>
    editSavedSelection(cs, 'a', { kind: 'move-links', linkIds: ['one'], destinationId: 'missing' }),
  );
  assert.deepEqual(cs, before);
  assert.throws(() => editSavedSelection(cs, 'a', { kind: 'delete-links', linkIds: [] }));
});

test('copying selected links preserves originals, notes and group metadata with fresh IDs', () => {
  const cs = fixture(),
    original = structuredClone(cs[0]);
  editSavedSelection(cs, 'a', {
    kind: 'move-links',
    copy: true,
    linkIds: ['one', 'two'],
    destinationId: 'b',
  });
  assert.deepEqual(cs[0].links, original.links);
  assert.deepEqual(cs[0].groups, original.groups);
  const copied = cs[1].links.slice(1);
  assert.equal(copied.length, 2);
  assert(copied.every((l) => !original.links.some((x) => x.id === l.id)));
  assert.equal(copied[0].note, 'Keep this note');
  assert.equal(copied[0].groupId, copied[1].groupId);
  assert.equal(cs[1].groups.find((g) => g.id === copied[0].groupId).collapsed, true);
});

test('batch copy into a destination group obeys insertion order and can copy within a collection', () => {
  const cs = fixture();
  editSavedSelection(cs, 'a', {
    kind: 'move-links',
    copy: true,
    linkIds: ['two', 'one'],
    destinationId: 'b',
    groupId: 'g',
    beforeId: 'other',
  });
  assert.deepEqual(
    cs[1].links.slice(0, 2).map((l) => l.title),
    ['One', 'Two'],
  );
  assert(cs[1].links.every((l) => l.groupId === 'g'));
  editSavedSelection(cs, 'a', {
    kind: 'move-links',
    copy: true,
    linkIds: ['one'],
    destinationId: 'a',
    beforeId: 'two',
  });
  assert.equal(cs[0].links.length, 3);
  assert.equal(cs[0].links[1].title, 'One');
  assert.equal(new Set(cs[0].links.map((l) => l.id)).size, 3);
});
test('preview sizing preserves aspect ratio, caps pixels, and never enlarges small sources', () => {
  assert.deepEqual(previewDimensions(2400, 1528), { width: 960, height: 611 });
  assert.deepEqual(previewDimensions(1000, 2000), { width: 360, height: 720 });
  assert.deepEqual(previewDimensions(320, 200), { width: 320, height: 200 });
});
