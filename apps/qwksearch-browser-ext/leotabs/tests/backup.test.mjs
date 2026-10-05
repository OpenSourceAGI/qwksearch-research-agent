
import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, newCollection, validatePlan } from '../extension/lib/model.js';
import {
  backupExport,
  jsonExport,
  parseImport,
  htmlExport,
  markdownExport,
} from '../extension/lib/portable.js';
import { organize } from '../extension/lib/integrations.js';

function example() {
  const c = newCollection('研究 [notes]');
  c.groups = [{ id: 'g', name: 'Reading *notes*', collapsed: true }];
  c.links = [
    {
      id: 'l',
      title: 'A [B]',
      url: 'https://example.org/(part)',
      note: 'check → compare',
      groupId: 'g',
    },
  ];
  return c;
}
test('library backup preserves preferences/timestamps with built-in rules and excludes secrets, previews and action IDs', () => {
  const s = initialState();
  s.collections = [example()];
  s.collections[0].createdAt = 12345;
  s.settings.theme = 'dark';
  s.settings.rules = [{ domain: 'example.org', group: 'Research' }];
  s.settings.aiKey = 'do-not-export';
  s.aiKey = 'do-not-export';
  const json = backupExport(s, [
    {
      id: 'old-op',
      at: 123,
      label: 'Stash',
      status: 'closing',
      tabs: [{ id: 5 }],
      before: { secret: 'do-not-export' },
    },
  ]);
  assert(!json.includes('do-not-export'));
  assert(!json.includes('old-op'));
  assert(!json.includes('"tabs"'));
  const read = parseImport(json);
  assert.equal(read.settings.theme, 'dark');
  assert.deepEqual(read.settings.rules, initialState().settings.rules);
  assert.equal(read.collections[0].createdAt, 12345);
  assert.equal(read.recovery[0].status, 'archived');
  assert(!read.recovery[0].before);
});
test('empty library backup roundtrips saved preferences', () => {
  const result = parseImport(backupExport(initialState()));
  assert.equal(result.collections.length, 0);
  assert(result.settings);
});
test('new LeoTabs exports and existing Neo backups preserve content and settings', () => {
  const state=initialState();
  state.collections=[example()];
  state.settings.theme='dark';
  const backup=JSON.parse(backupExport(state));
  const collections=JSON.parse(jsonExport(state.collections));
  assert.equal(backup.format,'leotabs-backup');
  assert.equal(collections.format,'leotabs-collections');
  for(const format of ['leotabs-backup','neo-backup']) {
    const result=parseImport(JSON.stringify({...backup,format}));
    assert.equal(result.settings.theme,'dark');
    assert.equal(result.collections[0].links[0].note,state.collections[0].links[0].note);
    assert.deepEqual(result.spaces,state.spaces);
    assert.throws(()=>parseImport(JSON.stringify({...backup,format,version:99})),/not supported/);
  }
  for(const format of ['leotabs-collections','neo-tabs']) {
    const result=parseImport(JSON.stringify({...collections,format}));
    assert.equal(result.collections[0].name,state.collections[0].name);
    assert.equal(result.collections[0].groups[0].name,state.collections[0].groups[0].name);
    assert.throws(()=>parseImport(JSON.stringify({...collections,format,version:99})),/not supported/);
  }
});
test('unknown JSON shape does not silently become empty Toby collections', () =>
  assert.throws(() => parseImport('{"collections":[{"name":"unsupported"}]}'), /Unrecognised/));
test('HTML roundtrip retains same-name groups and empty groups separately', () => {
  const c = example();
  c.groups.push(
    { id: 'g2', name: c.groups[0].name, collapsed: false },
    { id: 'empty', name: 'Empty', collapsed: false },
  );
  c.links.push({ ...c.links[0], id: 'l2', groupId: 'g2' });
  const result = parseImport(htmlExport([c])).collections[0];
  assert.equal(result.groups.length, 3);
  assert.notEqual(result.links[0].groupId, result.links[1].groupId);
  assert.equal(result.groups[2].name, 'Empty');
});
test('Markdown roundtrip preserves escaped names, Unicode and URL parentheses', () => {
  const c = example(),
    result = parseImport(markdownExport([c]), 'notes.md').collections[0];
  assert.equal(result.name, c.name);
  assert.equal(result.groups[0].name, c.groups[0].name);
  assert.equal(result.links[0].url, c.links[0].url);
  assert.equal(result.links[0].title, c.links[0].title);
  assert.equal(result.links[0].note, c.links[0].note);
});
test('AI subset excludes other links and cannot accept IDs outside reviewed scope', async () => {
  const c = example();
  c.links.push({ id: 'private', title: 'private-other-link', url: 'https://example.org/secret' });
  let body;
  const plan = await organize(
    c,
    'group',
    initialState().settings,
    'k',
    async (url, options) => {
      body = options.body;
      return {
        ok: true,
        text: async () =>
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [
                    { text: JSON.stringify({ groups: [{ name: 'Research', linkIds: ['l'] }] }) },
                  ],
                },
              },
            ],
          }),
      };
    },
    { linkIds: ['l'] },
  );
  assert(!body.includes('private-other-link'));
  assert.deepEqual(plan.scopeLinkIds, ['l']);
  assert.throws(
    () => validatePlan({ ...plan, groups: [{ name: 'Bad', linkIds: ['private'] }] }, c),
    /missing or repeated/,
  );
});
test('AI fingerprint rejects changes to notes or group context, retaining unchecked groups', () => {
  const c = example(),
    raw = { groups: [{ name: 'Research', linkIds: ['l'], accepted: false }] },
    before = validatePlan(raw, c);
  assert.equal(before.groups[0].accepted, false);
  c.note = 'A newer note';
  assert.notEqual(validatePlan(raw, c).fingerprint, before.fingerprint);
});
