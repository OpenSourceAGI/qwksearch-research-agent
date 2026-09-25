
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseQuery, searchResources } from '../extension/lib/search.js';
import { initialState, newCollection } from '../extension/lib/model.js';
const design = {
  ...newCollection('Product design'),
  id: 'design',
  note: 'Compare click selection',
  links: [
    {
      id: 'link',
      title: 'Interaction patterns',
      url: 'https://example.org/interaction',
      note: 'Check keyboard accessibility',
      groupId: 'collapsed',
    },
    {
      id: 'draft',
      title: 'Draft paper',
      url: 'https://example.org/draft',
      note: '',
      groupId: null,
    },
  ],
};
const collection = { ...newCollection('Product'), id: 'product' };
const data = {
  state: { ...initialState(), collections: [design, collection] },
  tabs: [
    {
      id: 1,
      title: 'Interaction patterns',
      url: 'https://example.org/interaction',
      windowId: 1,
      lastAccessed: 100,
    },
    {
      id: 2,
      title: 'Unrelated live tab',
      url: 'https://other.org/',
      windowId: 1,
      lastAccessed: 200,
    },
  ],
  recent: [{ sessionId: 'session1', url: 'https://example.org/draft', title: 'Draft paper' }],
  closed: [
    { id: 'op:3', url: 'https://example.org/old', title: 'Earlier draft', collectionId: 'design' },
  ],
};

test('multi-word context uses longest matching name', () => {
  const parsed = parseQuery('@Product design keyboard', data.state.collections);
  assert.equal(parsed.context.id, 'design');
  assert.equal(parsed.query, 'keyboard');
});
test('quoted context works with slash actions', () => {
  const parsed = parseQuery('/open @"Product design"', data.state.collections);
  assert.equal(parsed.command, 'open');
  assert.equal(parsed.context.id, 'design');
});
test('an exact @collection without query is a context choice, not navigation', () => {
  const parsed = parseQuery('@Product design', data.state.collections);
  assert.equal(parsed.mode, 'contexts');
  assert.equal(parsed.contextPartial, 'Product design');
});
test('URLs, email and filesystem paths are literal search', () => {
  for (const value of [
    'https://example.org/@thing',
    'person@example.org',
    '/usr/bin/tool',
    'C:\\My files\\notes',
  ]) {
    const parsed = parseQuery(value, data.state.collections);
    assert.equal(parsed.mode, 'search');
    assert.equal(parsed.query, value);
  }
});
test('duplicate context names require a stable-ID choice', () => {
  const collections = [design, { ...design, id: 'other' }];
  assert.equal(parseQuery('@Product design', collections).mode, 'contexts');
  assert.equal(parseQuery('keyboard', collections, 'other').context.id, 'other');
});
test('scope chip survives collection rename', () => {
  const parsed = parseQuery('keyboard', [{ ...design, name: 'UX work' }], 'design');
  assert.equal(parsed.context.name, 'UX work');
});
test('scoped search contains only saved links, including collapsed links and notes', () => {
  const rows = searchResources(data, 'keyboard', 'design', 1);
  assert(rows.some((r) => r.id === 'link'));
  const all = searchResources(data, '', 'design', 1);
  assert(all.length > 0);
  assert(all.every((r) => r.type === 'link' && r.collectionId === 'design'));
  assert.equal(new Set(all.map((r) => r.key)).size, all.length);
});
test('idle broad search stays short and open-tab-only', () => {
  const rows = searchResources(data, '', null, 1);
  assert(rows.every((r) => r.type === 'tab'));
  assert.equal(rows[0].id, 2);
});
test('closed records are searchable broadly but do not leak into collection scope', () => {
  assert(searchResources(data, 'draft', 'design', 1).every((r) => r.type === 'link'));
  const rows = searchResources(data, 'draft', null, 1);
  assert(rows.some((r) => r.type === 'closed' && r.verb === 'Restore'));
  assert(rows.some((r) => r.type === 'session'));
  assert.equal(
    searchResources(data, 'Interaction', null, 1).find((r) => r.type === 'link').verb,
    'Open new tab',
  );
});
