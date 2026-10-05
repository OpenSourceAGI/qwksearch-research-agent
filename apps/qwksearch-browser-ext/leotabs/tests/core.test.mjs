
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  initialState,
  newCollection,
  snapshotTabs,
  validateCollections,
  safeURL,
  duplicateCandidates,
  validatePlan,
} from '../extension/lib/model.js';
import { operations } from '../extension/lib/operations.js';
import { parseImport, jsonExport, markdownExport, htmlExport } from '../extension/lib/portable.js';
import { organize, endpointOrigin } from '../extension/lib/integrations.js';
const baseTab = (id, extra = {}) => ({
  id,
  url: `https://example.org/${id}`,
  title: `Page ${id}`,
  windowId: 1,
  index: id,
  groupId: -1,
  pinned: false,
  active: false,
  status: 'complete',
  ...extra,
});
function fixture(tabs = [baseTab(1), baseTab(2), baseTab(3, { pinned: true })], beforeStashClose) {
  const state = initialState(),
    stores = { journal: new Map(), parked: new Map() },
    events = [],
    removed = [],
    created = [];
  let failWrite = false,
    failCreate = false,
    failGroup = false,
    changeBeforeClose = false;
  const db = {
    getState: async () => structuredClone(state),
    read: async (store, id) => structuredClone(stores[store].get(id)),
    write: async (store, value) => {
      events.push(['write', store, value.status]);
      if (failWrite) throw new Error('disk full');
      stores[store].set(value.id, structuredClone(value));
    },
    mutate: async (label, fn) => {
      if (failWrite) throw new Error('disk full');
      const before = structuredClone(state),
        draft = structuredClone(state),
        detail = fn(draft);
      Object.assign(state, draft, { revision: state.revision + 1 });
      const operation = {
        id: 'op' + stores.journal.size,
        label,
        before,
        revision: state.revision,
        ...detail,
      };
      await db.write('journal', operation);
      if (changeBeforeClose) tabs[0].url = 'https://example.org/changed';
      return { state, operation };
    },
  };
  const browser = {
    runtime: { getURL: (p) => 'chrome-extension://neo/' + p },
    tabs: {
      query: async (query = {}) =>
        structuredClone(
          tabs.filter(
            (t) =>
              (query.groupId === undefined || t.groupId === query.groupId) &&
              (query.windowId === undefined || t.windowId === query.windowId),
          ),
        ),
      get: async (id) => {
        const t = tabs.find((t) => t.id === id);
        if (!t) throw new Error('missing');
        return structuredClone(t);
      },
      remove: async (id) => {
        events.push(['close', id]);
        removed.push(id);
        tabs.splice(
          tabs.findIndex((t) => t.id === id),
          1,
        );
      },
      create: async (info) => {
        if (failCreate) throw new Error('cannot open');
        const t = baseTab(100 + created.length, info);
        if (info.url.includes('parked.html?')) {
          const record = stores.parked.get(new URL(info.url).searchParams.get('id'));
          t.title = record.title;
          t.favIconUrl = 'data:image/png;base64,cached';
        }
        created.push(t);
        tabs.push(t);
        return t;
      },
      discard: async (id) => events.push(['discard', id]),
      ungroup: async (id) => {
        events.push(['ungroup', id]);
        tabs.find((t) => t.id === id).groupId = -1;
      },
      group: async () => {
        if (failGroup) throw new Error('group denied');
        return 20;
      },
    },
    tabGroups: {
      query: async () => [{ id: 5, title: 'Research', color: 'green' }],
      update: async () => {},
    },
  };
  return {
    state,
    stores,
    events,
    removed,
    created,
    browser,
    ops: operations({ browser, db, beforeStashClose }),
    set: (key, value) => {
      if (key === 'write') failWrite = value;
      if (key === 'create') failCreate = value;
      if (key === 'group') failGroup = value;
      if (key === 'navigation') changeBeforeClose = value;
    },
    tabs,
  };
}
test('reject executable, data and extension URLs', () => {
  for (const u of ['javascript:alert(1)', 'data:text/html,hello', 'chrome-extension://x/a', 'nope'])
    assert.equal(safeURL(u), null);
  assert.equal(safeURL('https://example.com'), 'https://example.com/');
});
test('switch can append source to an existing collection before replacing tabs', async () => {
  const f = fixture();
  const source = newCollection('Current work');
  const destination = snapshotTabs([baseTab(55)]);
  f.state.collections.push(source, destination);
  await f.ops.switchCollection({
    tabIds: [1, 2],
    destinationId: destination.id,
    saveToId: source.id,
    windowId: 1,
  });
  assert.equal(f.state.collections.length, 2);
  assert.equal(f.state.collections.find((c) => c.id === source.id).links.length, 2);
  assert.deepEqual(f.removed, [1, 2]);
});
test('switch from an empty window opens destination without creating an empty source collection', async () => {
  const f = fixture([]);
  const c = snapshotTabs([baseTab(55)]);
  f.state.collections.push(c);
  const result = await f.ops.switchCollection({ tabIds: [], destinationId: c.id, windowId: 1 });
  assert.equal(result.created.length, 1);
  assert.equal(f.state.collections.length, 1);
});
test('snapshot preserves browser group names and order', () => {
  const c = snapshotTabs(
    [baseTab(2, { groupId: 5 }), baseTab(1, { groupId: 5 })],
    [{ id: 5, title: 'Research', color: 'green' }],
  );
  assert.equal(c.groups[0].name, 'Research');
  assert.deepEqual(
    c.links.map((l) => l.title),
    ['Page 1', 'Page 2'],
  );
  assert.equal(c.links[0].groupId, c.groups[0].id);
});

test('dropping one browser tab inserts a loose link at the chosen boundary without carrying its group', async () => {
  const f = fixture([baseTab(1, { groupId: 5 }), baseTab(2, { groupId: 5 })]);
  const destination = snapshotTabs([baseTab(10), baseTab(11)]);
  f.state.collections.push(destination);
  await f.ops.save({ tabIds: [1], destinationId: destination.id, drop: { group: false, beforeId: destination.links[1].id, groupId: null } });
  const saved = f.state.collections[0];
  assert.deepEqual(saved.links.map(l => l.title), ['Page 10', 'Page 1', 'Page 11']);
  assert.equal(saved.links[1].groupId, null);
  assert.equal(saved.groups.length, 0);
  assert.deepEqual(f.tabs.map(t => t.groupId), [5, 5]);
});

test('dropping selected browser tabs into an existing saved group uses that group and preserves their order', async () => {
  const f = fixture([baseTab(1, { groupId: 5 }), baseTab(2, { groupId: 5 })]);
  const destination = snapshotTabs([baseTab(10, { groupId: 5 }), baseTab(11, { groupId: 5 })], [{ id: 5, title: 'Destination' }]);
  f.state.collections.push(destination);
  await f.ops.save({ tabIds: [2, 1], destinationId: destination.id, drop: { group: false, beforeId: destination.links[1].id, groupId: destination.groups[0].id } });
  const saved = f.state.collections[0];
  assert.deepEqual(saved.links.map(l => l.title), ['Page 10', 'Page 1', 'Page 2', 'Page 11']);
  assert.equal(saved.groups.length, 1);
  assert(saved.links.every(l => l.groupId === saved.groups[0].id));
});

test('only an explicit whole-group drop carries the browser group and inserts before the chosen saved group', async () => {
  const f = fixture([baseTab(1, { groupId: 5 }), baseTab(2, { groupId: 5 })]);
  const destination = snapshotTabs([baseTab(10, { groupId: 5 })], [{ id: 5, title: 'Destination' }]);
  f.state.collections.push(destination);
  await f.ops.save({ tabIds: [1, 2], destinationId: destination.id, drop: { group: true, beforeId: destination.groups[0].id } });
  const saved = f.state.collections[0];
  assert.deepEqual(saved.groups.map(g => g.name), ['Research', 'Destination']);
  assert.deepEqual(saved.links.filter(l => l.groupId === saved.groups[0].id).map(l => l.title), ['Page 1', 'Page 2']);
});

test('a loose-tab drop into a new collection suppresses automatic grouping', async () => {
  const f = fixture([baseTab(1, { groupId: 5 })]);
  await f.ops.save({ tabIds: [1], drop: { group: false } });
  assert.equal(f.state.collections[0].groups.length, 0);
  assert.equal(f.state.collections[0].links[0].groupId, null);
});

test('a browser group saves its members between loose links in the chosen order', async () => {
  const f=fixture([baseTab(1,{groupId:5}),baseTab(2,{groupId:5})]);
  const destination=snapshotTabs([baseTab(10),baseTab(11)]);
  f.state.collections.push(destination);
  await f.ops.save({tabIds:[1,2],destinationId:destination.id,drop:{group:true,beforeId:destination.links[1].id}});
  const saved=f.state.collections[0];
  assert.deepEqual(saved.links.map(l=>l.title),['Page 10','Page 1','Page 2','Page 11']);
  assert.equal(saved.itemOrder[1],`group:${saved.groups[0].id}`);
  assert.deepEqual(saved.links.map(l=>l.groupId),[null,saved.groups[0].id,saved.groups[0].id,null]);
});

test('dropping into a tracked collection pauses mirroring and reveals the destination', async () => {
  const f = fixture([baseTab(1)]);
  const destination = { ...newCollection('Tracked'), autoUpdate:true, collapsed:true };
  f.state.collections.push(destination);
  await f.ops.save({tabIds:[1],destinationId:destination.id,drop:{group:false,pauseAutoUpdate:true}});
  assert.equal(f.state.collections[0].autoUpdate,false);
  assert.equal(f.state.collections[0].autoUpdatePausedReason,'Saved list edited');
  assert.equal(f.state.collections[0].collapsed,false);
});

test('a stale insertion target rejects the save without changing the collection or closing tabs', async () => {
  const f = fixture([baseTab(1)]);
  f.state.collections.push(newCollection('Destination'));
  const before=structuredClone(f.state);
  await assert.rejects(f.ops.save({tabIds:[1],destinationId:before.collections[0].id,drop:{group:false,beforeId:'removed'}}),/drop target changed/);
  assert.deepEqual(f.state,before);
  assert.equal(f.removed.length,0);
});
test('failed durable save closes nothing', async () => {
  const f = fixture();
  f.set('write', true);
  await assert.rejects(f.ops.save({ close: true }), /disk full/);
  assert.deepEqual(f.removed, []);
});
test('save commits recovery before first close, protects pinned tabs', async () => {
  const f = fixture();
  const op = await f.ops.save({ close: true });
  assert.equal(f.state.collections[0].links.length, 2);
  assert.deepEqual(f.removed, [1, 2]);
  assert.equal(f.events[0][0], 'write');
  assert.equal(op.status, 'complete');
  assert.deepEqual(f.stores.journal.get(op.id).closed, [1, 2]);
});
test('save-only leaves all live tabs unchanged', async () => {
  const f = fixture();
  await f.ops.save({ close: false });
  assert.equal(f.tabs.length, 3);
  assert.equal(f.state.collections.length, 1);
});

test('deliberate save retains Web Store resources',async()=>{
  const f=fixture([baseTab(1,{url:'https://chromewebstore.google.com/detail/example'})]);
  await f.ops.save({close:false});assert.equal(f.state.collections[0].links[0].url,'https://chromewebstore.google.com/detail/example');
});

test('stash pauses tracking after durable save and before removing any tab; save-only never pauses', async () => {
  const f=fixture(undefined, async tabs=>{
    assert.equal(f.state.collections.at(-1).links.length,2);
    assert.equal(f.removed.length,0);
    assert.deepEqual(tabs.map(t=>t.id),[1,2]);
    f.events.push(['pause']);
  });
  await f.ops.save({close:false});
  assert(!f.events.some(e=>e[0]==='pause'));
  await f.ops.save({close:true});
  assert(f.events.findIndex(e=>e[0]==='pause')<f.events.findIndex(e=>e[0]==='close'));
});

test('failed stash save never pauses; failed pause preserves both saved copy and live tabs', async () => {
  let pauses=0;
  const f=fixture(undefined,async()=>{pauses++;throw Error('pause failed');});
  f.set('write',true);
  await assert.rejects(f.ops.save({close:true}),/disk full/);
  assert.equal(pauses,0);
  f.set('write',false);
  await assert.rejects(f.ops.save({close:true}),/pause failed/);
  assert.equal(f.state.collections[0].links.length,2);
  assert.deepEqual(f.removed,[]);
});

test('utility-only stash also pauses before closing', async () => {
  let paused=false;
  const f=fixture([baseTab(1,{url:'chrome://newtab/'})],async()=>{
    assert.equal(f.removed.length,0);
    assert.equal(f.stores.journal.size,1);
    paused=true;
  });
  await f.ops.save({close:true});
  assert(paused);
  assert.deepEqual(f.removed,[1]);
  assert.equal(f.state.collections.length,0);
});
test('navigation after snapshot prevents closure of changed instance', async () => {
  const f = fixture();
  f.set('navigation', true);
  const op = await f.ops.save({ close: true });
  assert.deepEqual(f.removed, [2]);
  assert.deepEqual(op.skipped, [1]);
  assert.deepEqual(op.skipReasons, [{ tabId: 1, reason: 'navigated' }]);
  assert.deepEqual(f.stores.journal.get(op.id).skipReasons, op.skipReasons);
});

test('close records why a captured tab became unsafe without removing it', async () => {
  for (const [change, reason] of [
    [{ pendingUrl: 'https://example.org/loading' }, 'navigated'],
    [{ windowId: 2 }, 'moved'],
    [{ pinned: true }, 'pinned'],
    [{ incognito: true }, 'private'],
  ]) {
    const f = fixture([baseTab(1), baseTab(2)]), get = f.browser.tabs.get;
    f.browser.tabs.get = async id => ({ ...await get(id), ...(id === 1 ? change : {}) });
    const op = await f.ops.close([1, 2]);
    assert.deepEqual(op.closed, [2]);
    assert.deepEqual(op.skipped, [1]);
    assert.deepEqual(op.skipReasons, [{ tabId: 1, reason }]);
    assert.deepEqual(f.removed, [2]);
  }
});

test('a failed tab lookup records uncertainty rather than claiming the tab was closed', async () => {
  const f = fixture([baseTab(1)]);
  f.browser.tabs.get = async () => { throw Error('private browser diagnostic'); };
  const op = await f.ops.close([1]);
  assert.deepEqual(op.closed, []);
  assert.deepEqual(op.skipReasons, [{ tabId: 1, reason: 'unavailable' }]);
  assert.deepEqual(f.removed, []);
});
test('explicit close retains a recovery snapshot without adding clutter to library', async () => {
  const f = fixture();
  const op = await f.ops.close([1, 3]);
  assert.deepEqual(f.removed, [1]);
  assert.equal(op.snapshot.links.length, 1);
  assert.equal(f.state.collections.length, 0);
});

test('close ungroups outgoing tabs after durable recovery and retains original group metadata', async () => {
  const f = fixture([baseTab(1, { groupId: 5 }), baseTab(2, { groupId: 5 })]);
  const op = await f.ops.close([1, 2]);
  assert.deepEqual(
    f.events.filter((e) => e[0] !== 'write'),
    [
      ['ungroup', 1],
      ['close', 1],
      ['ungroup', 2],
      ['close', 2],
    ],
  );
  assert.equal(f.events[0][0], 'write');
  assert.equal(op.snapshot.groups[0].name, 'Research');
  assert.equal(op.snapshot.groups[0].color, 'green');
  assert(op.tabs.every((t) => t.groupId === 5));
  assert(op.snapshot.links.every((l) => l.groupId === op.snapshot.groups[0].id));
});

test('partial close only ungroups selected tabs and preserves remaining group members', async () => {
  const f = fixture([baseTab(1, { groupId: 5 }), baseTab(2, { groupId: 5 })]);
  await f.ops.close([1]);
  assert.deepEqual(
    f.tabs.map((t) => [t.id, t.groupId]),
    [[2, 5]],
  );
});

test('failed recovery write never ungroups or closes tabs', async () => {
  const f = fixture([baseTab(1, { groupId: 5 })]);
  f.set('write', true);
  await assert.rejects(f.ops.close([1]), /disk full/);
  assert.equal(f.tabs[0].groupId, 5);
  assert(!f.events.some((e) => e[0] === 'ungroup' || e[0] === 'close'));
});

test('regrouping after capture protects the changed tab from cleanup', async () => {
  const f = fixture([baseTab(1, { groupId: 5 })]);
  const get = f.browser.tabs.get;
  f.browser.tabs.get = async (id) => {
    f.tabs[0].groupId = 9;
    return get(id);
  };
  const op = await f.ops.close([1]);
  assert.deepEqual(op.skipped, [1]);
  assert.deepEqual(op.skipReasons, [{ tabId: 1, reason: 'regrouped' }]);
  assert(!f.events.some((e) => e[0] === 'ungroup' || e[0] === 'close'));
});

test('cleanup rejection leaves grouped tab open for retry', async () => {
  const f = fixture([baseTab(1, { groupId: 5 })]);
  f.browser.tabs.ungroup = async () => {
    throw Error('Tab strip is being dragged');
  };
  const op = await f.ops.close([1]);
  assert.deepEqual(op.skipped, [1]);
  assert.deepEqual(op.skipReasons, [{ tabId: 1, reason: 'ungroup-failed' }]);
  assert.equal(f.tabs[0].groupId, 5);
  assert.equal(f.removed.length, 0);
});

test('failed close recreates deleted group for surviving tab', async () => {
  const f = fixture([baseTab(1, { groupId: 5 })]);
  f.browser.tabs.remove = async () => {
    throw Error('close refused');
  };
  f.browser.tabGroups.query = async () =>
    f.tabs[0].groupId === 5 ? [{ id: 5, title: 'Research', color: 'green', collapsed: true }] : [];
  f.browser.tabs.group = async (info) => {
    f.tabs[0].groupId = 20;
    return 20;
  };
  let repaired;
  f.browser.tabGroups.update = async (id, info) => {
    repaired = { id, ...info };
  };
  const op = await f.ops.close([1]);
  assert.deepEqual(op.skipped, [1]);
  assert.deepEqual(op.skipReasons, [{ tabId: 1, reason: 'close-failed' }]);
  assert.equal(f.tabs[0].groupId, 20);
  assert.deepEqual(repaired, { id: 20, title: 'Research', color: 'green', collapsed: true });
});

test('navigation during ungroup prevents closing changed page and restores its group', async () => {
  const f = fixture([baseTab(1, { groupId: 5 }), baseTab(2, { groupId: 5 })]);
  f.browser.tabs.ungroup = async () => {
    f.tabs[0].groupId = -1;
    f.tabs[0].url = 'https://example.org/new-navigation';
  };
  f.browser.tabs.group = async (info) => {
    f.tabs[0].groupId = info.groupId;
    return info.groupId;
  };
  const op = await f.ops.close([1]);
  assert.deepEqual(op.skipped, [1]);
  assert.deepEqual(op.skipReasons, [{ tabId: 1, reason: 'navigated' }]);
  assert.equal(f.tabs[0].groupId, 5);
  assert.equal(f.removed.length, 0);
});
test('deferred resume creates only extension pages and persists each destination first', async () => {
  const f = fixture([]);
  const c = snapshotTabs([baseTab(1), baseTab(2)]);
  const result = await f.ops.openLinks({ collection: c, windowId: 1, deferred: true });
  assert.equal(result.created.length, 2);
  assert(f.created.every((t) => t.url.startsWith('chrome-extension://neo/parked.html?id=')));
  assert.equal(f.stores.parked.size, 2);
  assert.equal(f.events[0][1], 'parked');
});
test('explicit immediate resume opens selected website only', async () => {
  const f = fixture([]),
    c = snapshotTabs([baseTab(1), baseTab(2)]);
  await f.ops.openLinks({ collection: c, linkIds: [c.links[1].id], windowId: 1, deferred: false });
  assert.equal(f.created.length, 1);
  assert.equal(f.created[0].url, 'https://example.org/2');
});
test('unambiguous live target is reused', async () => {
  const f = fixture();
  const result = await f.ops.openLinks({ collection: snapshotTabs([baseTab(1)]), windowId: 1 });
  assert.deepEqual(result.reused, [1]);
  assert.equal(f.created.length, 0);
});
test('multiple same-URL live instances are not chosen arbitrarily', async () => {
  const f = fixture([baseTab(1), baseTab(2, { url: 'https://example.org/1' })]);
  const result = await f.ops.openLinks({ collection: snapshotTabs([baseTab(1)]), windowId: 1 });
  assert.equal(result.reused.length, 0);
  assert.equal(result.created.length, 1);
});
test('failed destination open preserves every source tab during switch', async () => {
  const f = fixture();
  const c = snapshotTabs([baseTab(9)]);
  f.state.collections.push(c);
  f.set('create', true);
  const op = await f.ops.switchCollection({ tabIds: [1, 2], destinationId: c.id, windowId: 1 });
  assert.equal(op.status, 'partial');
  assert.equal(f.removed.length, 0);
  assert.equal(f.state.collections.length, 2);
});
test('reused destination source remains open during switch', async () => {
  const f = fixture();
  const c = snapshotTabs([baseTab(1)]);
  f.state.collections.push(c);
  await f.ops.switchCollection({ tabIds: [1, 2], destinationId: c.id, windowId: 1 });
  assert.deepEqual(f.removed, [2]);
});
test('duplicate review protects pinned and active representative', () => {
  const tabs = [
    baseTab(1),
    baseTab(2, { url: 'https://example.org/1', active: true }),
    baseTab(3, { url: 'https://example.org/1', pinned: true }),
  ];
  assert.deepEqual(duplicateCandidates(tabs), [2, 1]);
});
test('JSON roundtrip preserves structure and notes but generates new IDs', () => {
  const c = snapshotTabs([baseTab(1, { groupId: 5 })], [{ id: 5, title: 'Group' }]);
  c.note = 'Next step';
  c.links[0].note = 'Read section 3';
  const r = parseImport(jsonExport([c]));
  assert.equal(r.collections[0].note, c.note);
  assert.equal(r.collections[0].links[0].note, c.links[0].note);
  assert.notEqual(r.collections[0].id, c.id);
  assert.equal(r.collections[0].links[0].groupId, r.collections[0].groups[0].id);
});
test('HTML import decodes safe titles and ignores executable URL', () => {
  const r = parseImport(
    '<DL><p><DT><H3>Research &amp; ideas</H3><DL><DT><A HREF="https://example.org/?a=1&amp;b=2">A &lt; B</A><DD>A note<DT><A HREF="javascript:alert(1)">bad</A></DL></DL>',
  );
  assert.equal(r.links, 1);
  assert.equal(r.skipped, 1);
  assert.equal(r.collections[0].links[0].title, 'A < B');
  assert.equal(r.collections[0].links[0].note, 'A note');
});
test('HTML exports escape every title and URL attribute', () => {
  const c = newCollection('<img src=x>');
  c.links = [{ id: 'x', title: '"<script>', url: 'https://example.org/?a="b"', note: 'a & b' }];
  const html = htmlExport([c]);
  assert(!html.includes('<script>'));
  assert(html.includes('&lt;img'));
  assert(html.includes('&quot;'));
});
test('Markdown roundtrip retains groups and link notes', () => {
  const c = snapshotTabs([baseTab(1, { groupId: 5 })], [{ id: 5, title: 'Research' }]);
  c.note = 'Next steps';
  c.links[0].note = 'Compare methods';
  const result = parseImport(markdownExport([c]), 'test.md');
  assert.equal(result.links, 1);
  assert.equal(result.collections[0].groups[0].name, 'Research');
  assert.equal(result.collections[0].links[0].note, 'Compare methods');
});
test('OneTab text imports titled URLs', () => {
  const r = parseImport(
    'https://example.org/ | Example\nhttps://example.org/2 | Second',
    'tabs.txt',
  );
  assert.equal(r.links, 2);
  assert.equal(r.collections[0].links[0].title, 'Example');
});
test('saving utility tabs gives a direct error without changing the library or closing tabs', async () => {
  const f = fixture([baseTab(1, {url:'chrome://newtab/'})]);
  const before = structuredClone(f.state);
  await assert.rejects(f.ops.save({tabIds:[1]}), {message:"Can't save utility tabs"});
  assert.deepEqual(f.state, before);
  assert.deepEqual(f.removed, []);
});

test('backup future schema rejects instead of resetting', () =>
  assert.throws(
    () => parseImport('{"format":"neo-tabs","version":99,"collections":[]}'),
    /not supported/,
  ));
test('AI rejects unknown and duplicate link IDs', () => {
  const c = snapshotTabs([baseTab(1)]);
  assert.throws(
    () => validatePlan({ groups: [{ name: 'X', linkIds: ['unknown'] }] }, c),
    /missing or repeated/,
  );
  assert.throws(
    () => validatePlan({ groups: [{ name: 'X', linkIds: [c.links[0].id, c.links[0].id] }] }, c),
    /missing or repeated/,
  );
});
test('Gemini adapter sends only bounded selected link metadata and validates result', async () => {
  const c = snapshotTabs([baseTab(1)]);
  let call;
  const plan = await organize(
    c,
    'group',
    initialState().settings,
    'test-key',
    async (url, options) => {
      call = { url, options };
      return {
        ok: true,
        text: async () =>
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        groups: [{ name: 'Reading', linkIds: [c.links[0].id] }],
                        note: 'Draft',
                      }),
                    },
                  ],
                },
              },
            ],
          }),
      };
    },
  );
  assert.equal(plan.groups[0].name, 'Reading');
  assert(call.options.body.includes(c.links[0].id));
  assert.equal(call.options.headers['x-goog-api-key'], 'test-key');
  assert.equal(call.options.redirect, 'error');
});
test('credential endpoints reject embedded credentials and insecure remote HTTP', () => {
  for (const v of [
    'http://example.org/v1',
    'https://user:pass@example.org/v1',
    'https://example.org/v1?key=x',
  ])
    assert.throws(() => endpointOrigin(v));
  assert.equal(
    endpointOrigin('http://localhost:11434/v1/chat/completions'),
    'http://localhost:11434',
  );
});

test('HTML roundtrip retains collection-level continuation note', () => {
  const c = snapshotTabs([baseTab(1)]);
  c.note = 'Return here & compare';
  const r = parseImport(htmlExport([c]));
  assert.equal(r.collections[0].note, c.note);
});
test('deferred open preserves tab IDs without immediately discarding placeholders', async () => {
  const f = fixture([]);
  let discarded = false;
  f.browser.tabs.discard = async () => {
    discarded = true;
  };
  const result = await f.ops.openLinks({ collection: snapshotTabs([baseTab(1)]), windowId: 1 });
  assert.equal(result.created[0], 100);
  assert.equal(discarded, false);
});

test('duplicate review compares the stored destination of parked tabs', () => {
  const tabs = [
    baseTab(1, {
      url: 'chrome-extension://neo/parked.html?id=a',
      resourceUrl: 'https://example.org/same',
    }),
    baseTab(2, {
      url: 'chrome-extension://neo/parked.html?id=b',
      resourceUrl: 'https://example.org/same',
    }),
  ];
  assert.equal(duplicateCandidates(tabs).length, 1);
});
test('pre-cancelled resume creates no tabs', async () => {
  const f = fixture([]),
    controller = new AbortController();
  controller.abort();
  const result = await f.ops.openLinks({
    collection: snapshotTabs([baseTab(1)]),
    windowId: 1,
    signal: controller.signal,
  });
  assert.equal(result.cancelled, true);
  assert.equal(f.created.length, 0);
});
test('cancelled switch preserves source pages and a recoverable snapshot', async () => {
  const f = fixture(),
    controller = new AbortController(),
    destination = snapshotTabs([baseTab(10), baseTab(11)]);
  f.state.collections.push(destination);
  const create = f.browser.tabs.create;
  f.browser.tabs.create = async (options) => {
    const tab = await create(options);
    controller.abort();
    return tab;
  };
  const result = await f.ops.switchCollection({
    tabIds: [1, 2],
    destinationId: destination.id,
    windowId: 1,
    signal: controller.signal,
  });
  assert.equal(result.status, 'partial');
  assert.equal(result.cancelled, true);
  assert.equal(f.removed.length, 0);
  assert(result.snapshot.links.length);
});

test('switch without saving closes source with Undo but adds no library collection', async () => {
  const f = fixture();
  const destination = snapshotTabs([baseTab(55)]);
  f.state.collections.push(destination);
  const before = structuredClone(f.state);
  const op = await f.ops.switchCollection({
    tabIds: [1, 2, 3],
    destinationId: destination.id,
    windowId: 1,
    saveCurrent: false,
  });
  assert.deepEqual(f.state, before);
  assert.deepEqual(f.removed, [1, 2]);
  assert.equal(op.status, 'complete');
  assert.equal(op.snapshot.links.length, 2);
  assert.equal(op.before, undefined);
  assert(
    f.events.findIndex((e) => e[1] === 'journal') < f.events.findIndex((e) => e[0] === 'close'),
  );
  const undo = await f.ops.undo(op.id, 1);
  assert.equal(undo.restored.created.length, 2);
  assert.deepEqual(f.state, before);
});

test('switch saves current tabs into an automatic new collection by default', async () => {
  const f = fixture();
  const destination = snapshotTabs([baseTab(55)]);
  f.state.collections.push(destination);
  await f.ops.switchCollection({ tabIds: [1, 2], destinationId: destination.id, windowId: 1 });
  assert.equal(f.state.collections.length, 2);
  assert.deepEqual(
    f.state.collections[1].links.map((l) => l.url),
    ['https://example.org/1', 'https://example.org/2'],
  );
  assert.deepEqual(f.removed, [1, 2]);
});

for (const failure of ['create', 'group', 'write']) {
  test(`switch without saving preserves source on ${failure} failure`, async () => {
    const f = fixture();
    const destination = snapshotTabs(
      [baseTab(55, { groupId: 5 })],
      [{ id: 5, title: 'Test', color: 'green' }],
    );
    f.state.collections.push(destination);
    f.set(failure, true);
    const run = f.ops.switchCollection({
      tabIds: [1, 2],
      destinationId: destination.id,
      windowId: 1,
      saveCurrent: false,
    });
    if (failure === 'write') await assert.rejects(run, /disk full/);
    else assert.equal((await run).status, 'partial');
    assert.deepEqual(f.removed, []);
    assert.equal(f.state.collections.length, 1);
  });
}
