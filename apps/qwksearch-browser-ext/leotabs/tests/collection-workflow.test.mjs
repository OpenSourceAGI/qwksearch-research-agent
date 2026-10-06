import test from 'node:test';
import assert from 'node:assert/strict';
import {
  planCollectionUpdate,
  orderedCollections,
  collectionAge,
  updateSignature,
} from '../extension/lib/collection-workflow.js';
import { newCollection, snapshotTabs, validateCollections } from '../extension/lib/model.js';
const tab = (id, url, groupId = -1) => ({
  id,
  url,
  title: 'Browser title',
  groupId,
  index: id,
  windowId: 1,
});
test('collection updates add unique selected URLs while preserving curated content and groups', () => {
  const c = newCollection('Research');
  c.note = 'Keep this note';
  c.groups = [{ id: 'saved-group', name: 'Curated group', color: 'mint', collapsed: true }];
  c.links = [
    {
      id: 'old',
      url: 'https://example.com/a',
      title: 'Custom title',
      note: 'Link note',
      groupId: 'saved-group',
    },
  ];
  const snapshot = snapshotTabs(
    [
      tab(1, 'https://example.com/a', 4),
      tab(2, 'https://example.com/b', 4),
      tab(3, 'https://example.com/b', 4),
      tab(4, 'https://example.com/c', 5),
    ],
    [
      { id: 4, title: 'Browser group', color: 'blue' },
      { id: 5, title: 'Curated group', color: 'red' },
    ],
  );
  const before = structuredClone({ c, snapshot });
  const plan = planCollectionUpdate(c, snapshot);
  assert.equal(plan.additions.length, 2);
  assert.equal(plan.alreadySaved, 1);
  assert.equal(plan.additions[0].groupId, 'saved-group');
  assert.equal(plan.groups.length, 1);
  assert.equal(plan.groups[0].name, 'Curated group');
  assert.notEqual(plan.groups[0].id, 'saved-group');
  const selected = planCollectionUpdate(c, snapshot, ['https://example.com/b']);
  assert.equal(selected.additions.length, 1);
  assert.deepEqual(selected.groups, []);
  assert.deepEqual({ c, snapshot }, before);
  assert.deepEqual(planCollectionUpdate(c, snapshot, []).additions, []);
});
test('all saved and unsupported URLs produce no additions; intentional saved duplicates remain', () => {
  const c = newCollection();
  c.links = [
    { id: 'a', url: 'https://example.com/' },
    { id: 'b', url: 'https://example.com/' },
  ];
  const plan = planCollectionUpdate(c, {
    groups: [],
    links: [{ url: 'https://example.com/' }, { url: 'javascript:alert(1)' }],
  });
  assert.equal(plan.kept, 2);
  assert.equal(plan.additions.length, 0);
  assert.equal(c.links.length, 2);
});
test('pinned ordering is stable, nonmutating and survives collection validation', () => {
  const a = newCollection('A'),
    b = newCollection('B'),
    c = newCollection('C');
  b.pinned = true;
  c.pinned = true;
  const input = [a, b, c];
  assert.deepEqual(
    orderedCollections(input).map((x) => x.name),
    ['B', 'C', 'A'],
  );
  assert.deepEqual(
    input.map((x) => x.name),
    ['A', 'B', 'C'],
  );
  const imported = validateCollections(JSON.parse(JSON.stringify(input)));
  assert.equal(imported[1].pinned, true);
  assert.equal(imported[1].updatedAt, b.updatedAt);
  b.pinned = false;
  assert.deepEqual(
    orderedCollections(input).map((x) => x.name),
    ['C', 'A', 'B'],
  );
});
test('age describes saved-content date and review signature detects live changes', () => {
  assert.equal(collectionAge({ createdAt: 1000, updatedAt: 1000 }, 61000), 'Created 1m ago');
  assert.equal(collectionAge({ createdAt: 1000, updatedAt: 61000 }, 61001), 'Updated just now');
  const tabs = [tab(1, 'https://example.com/')],
    groups = [{ id: 4, title: 'Work', color: 'blue' }];
  const original = updateSignature(tabs, groups);
  tabs[0].url = 'https://example.com/changed';
  assert.notEqual(updateSignature(tabs, groups), original);
  tabs[0].url = 'https://example.com/';
  groups[0].title = 'Renamed';
  assert.notEqual(updateSignature(tabs, groups), original);
});

test('mirroring matches duplicate URLs separately, preserves notes and removes closed links', async () => {
  const { mirrorCollection } = await import('../extension/lib/collection-workflow.js');
  const c = {
    name: 'Work',
    note: 'Collection note',
    groups: [{ id: 'g', name: 'Old', color: 'blue' }],
    links: [
      { id: 'one', url: 'https://same/', title: 'Custom', note: 'Keep', groupId: 'g' },
      { id: 'two', url: 'https://same/', title: 'Second', note: 'Other', groupId: 'g' },
      { id: 'closed', url: 'https://closed/', groupId: null },
    ],
  };
  const next = mirrorCollection(c, {
    groups: [{ id: 'live', name: 'Renamed', color: 'red' }],
    links: [
      { id: 'a', url: 'https://same/', groupId: 'live' },
      { id: 'b', url: 'https://same/', groupId: 'live' },
    ],
  });
  assert.deepEqual(
    next.links.map((l) => l.id),
    ['one', 'two'],
  );
  assert.equal(next.links[0].note, 'Keep');
  assert.equal(next.groups[0].id, 'g');
  assert.equal(next.groups[0].name, 'Renamed');
  assert.equal(next.note, 'Collection note');
});

test('automatic titles update while manually renamed titles survive', async () => {
  const { mirrorCollection } = await import('../extension/lib/collection-workflow.js');
  const c = {
    groups: [],
    links: [
      { id: '1', url: 'https://one/', title: 'Loading', sourceTitle: 'Loading' },
      { id: '2', url: 'https://two/', title: 'My title', sourceTitle: 'Website' },
    ],
  };
  const result = mirrorCollection(c, {
    groups: [],
    links: [
      { id: 'a', url: 'https://one/', title: 'Loaded' },
      { id: 'b', url: 'https://two/', title: 'New website title' },
    ],
  });
  assert.equal(result.links[0].title, 'Loaded');
  assert.equal(result.links[1].title, 'My title');
});
