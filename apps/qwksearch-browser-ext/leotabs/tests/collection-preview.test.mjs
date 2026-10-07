
import test from 'node:test';
import assert from 'node:assert/strict';
import { collectionPreview } from '../extension/ui/collection-preview.js';
const links = n => Array.from({ length: n }, (_, id) => ({ id }));
const group = (n, collapsed = false) => ({ group: {}, links: links(n), collapsed });
const rows = p => p.links.length + p.groups.reduce((sum, g) => sum + 1 + g.links.length, 0);

test('one row budget covers ungrouped links and all groups', () => {
  const preview = collectionPreview(links(10), [group(2), group(4), group(2), group(2)], 8);
  assert.equal(rows(preview), 8);
  assert.equal(preview.hiddenTabs, 12);
  assert.equal(preview.groups.length, 0);
  assert.equal(preview.hiddenGroups, 4);
});
test('many expanded, folded and empty groups all have a bounded preview', () => {
  for (const groups of [Array.from({length:30}, () => group(2)), Array.from({length:30}, () => group(2, true)), Array.from({length:30}, () => group(0))]) {
    const preview = collectionPreview([], groups, 8);
    assert(rows(preview) <= 8);
    assert(preview.hasMore);
    assert(preview.hiddenGroups > 0);
  }
});
test('a cutoff does not strand a group heading or skip ahead to later groups', () => {
  const preview = collectionPreview(links(7), [group(2), group(0)], 8);
  assert.equal(rows(preview), 7);
  assert.equal(preview.groups.length, 0);
  assert.equal(preview.hiddenTabs, 2);
  assert.equal(preview.hiddenGroups, 2);
});
test('expansion follows the same order and collapsed members do not consume rows', () => {
  const groups = [group(40, true), group(12)];
  const small = collectionPreview(links(2), groups, 8);
  assert.equal(rows(small), 8);
  assert.equal(small.hiddenTabs, 8);
  const full = collectionPreview(links(2), groups, 88);
  assert.equal(full.hasMore, false);
  assert.equal(full.groups[0].links.length, 0);
  assert.equal(full.groups[1].links.length, 12);
});
test('large detail views use a shared budget and preserve source data', () => {
  const groups = [group(100), group(100)], before = structuredClone(groups);
  const preview = collectionPreview(links(100), groups, 80);
  assert.equal(rows(preview), 80);
  assert.equal(preview.hiddenTabs, 220);
  assert.deepEqual(groups, before);
});
