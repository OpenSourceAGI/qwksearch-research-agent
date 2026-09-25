import test from 'node:test';
import assert from 'node:assert/strict';
import { sessionManager } from '../extension/lib/sessions.js';
function fixture() {
  let id = 10,
    fail = false,
    storage = {};
  const tabs = [
    { id: 1, windowId: 1, index: 0, url: 'https://a.test', title: 'A', groupId: 3 },
    { id: 2, windowId: 1, index: 1, url: 'https://b.test', title: 'B', groupId: 3 },
    { id: 3, windowId: 1, index: 2, url: 'https://pin.test', pinned: true, groupId: -1 },
  ];
  const timeline = new Map();
  const settings={captureWebStore:false};
  const collections = [
    {
      id: 'b',
      name: 'B',
      links: [{ id: 'bl', url: 'https://destination.test/', title: 'Destination' }],
      groups: [],
    },
  ];
  const browser = {
    runtime: { getURL: (p) => 'chrome-extension://neo/' + p },
    storage: {
      session: {
        get: async () => storage,
        set: async (v) => Object.assign(storage, structuredClone(v)),
      },
    },
    tabs: {
      get: async (id) => {
        const t = tabs.find((t) => t.id === id);
        if (!t) throw Error('missing');
        return { ...t };
      },
      query: async (q) =>
        tabs.filter((t) => Object.entries(q).every(([k, v]) => t[k] === v)).map((t) => ({ ...t })),
      create: async (v) => {
        const t = { id: ++id, index: tabs.length, groupId: -1, ...v };
        tabs.push(t);
        return { ...t };
      },
      update: async (id, v) =>
        Object.assign(
          tabs.find((t) => t.id === id),
          v,
        ),
      remove: async (id) => {
        const i = tabs.findIndex((t) => t.id === id);
        if (i >= 0) tabs.splice(i, 1);
      },
      move: async (id, v) =>
        Object.assign(
          tabs.find((t) => t.id === id),
          v,
        ),
    },
    tabGroups: {
      query: async () => [{ id: 3, title: 'Research', color: 'green' }],
      move: async (g, v) =>
        tabs.filter((t) => t.groupId === g).forEach((t) => (t.windowId = v.windowId)),
    },
    windows: {
      create: async (v) => {
        const w = ++id;
        return { id: w, tabs: [await browser.tabs.create({ windowId: w, url: v.url })] };
      },
      update: async () => {},
    },
  };
  const db = {
    getState: async () => ({ collections,settings }),
    mutate: async (_, transform) => transform({ collections }),
    all: async () => [...timeline.values()],
    write: async (_, r) => {
      if (fail) throw Error('disk');
      timeline.set(r.id, structuredClone(r));
    },
    remove: async (_, id) => timeline.delete(id),
  };
  const ops = {
    live: async () => tabs.filter((t) => t.url.startsWith('https:')).map((t) => ({ ...t })),
    openLinks: async ({ collection, windowId }) => {
      for (const l of collection.links) await browser.tabs.create({ windowId, url: l.url });
      return { failed: [], groupFailures: [] };
    },
    close: async (ids) => {
      for (const id of ids) await browser.tabs.remove(id);
    },
  };
  return {
    manager: sessionManager({ browser, db, ops }),
    tabs,
    timeline,
    browser,
    fail: () => (fail = true),
    collections,
    settings,
    ops,
  };
}

test('global auto-update updates open sessions and preserves one writer for duplicate collection windows', async () => {
  const f = fixture();
  await f.browser.storage.session.set({ neoSessions: {
    active: { 2: { collectionId: 'b', tracking: false }, 1: { collectionId: 'b', tracking: true } }, parked: {},
  } });
  await f.browser.tabs.create({ windowId: 2, url: 'https://other-copy.test/', title: 'Other copy' });
  await f.manager.applyAutoUpdateToOpen(true);
  let active = (await f.manager.list()).active;
  assert.equal(active[1].tracking, true);
  assert.equal(active[2].tracking, false);
  assert(!f.collections[0].links.some(l => l.url === 'https://other-copy.test/'));
  await f.manager.applyAutoUpdateToOpen(false);
  active = (await f.manager.list()).active;
  assert(Object.values(active).every(x => x.tracking === false));
  const saved = JSON.stringify(f.collections[0].links);
  await f.browser.tabs.create({ windowId: 1, url: 'https://paused.test/', title: 'Paused' });
  await f.manager.capture(1);
  assert.equal(JSON.stringify(f.collections[0].links), saved);
});

test('Web Store pages are ordinary automatically captured pages even with obsolete exclusion settings',async()=>{
  const f=fixture();
  const store=await f.browser.tabs.create({windowId:1,url:'https://chromewebstore.google.com/detail/example',title:'Store'});
  await f.browser.storage.session.set({neoSessions:{active:{1:{collectionId:'b',tracking:true}},parked:{}}});
  await f.manager.capture(1);
  assert(f.collections[0].links.some(l=>l.url===store.url));
  f.settings.captureWebStore=true;await f.manager.capture(1);
  assert(f.collections[0].links.some(l=>l.url===store.url));
  await f.manager.closeCurrent({collectionId:'b',windowId:1});
  assert(!f.tabs.some(t=>t.id===store.id));
  assert([...f.timeline.values()].some(r=>r.event==='close'));
});

test('stash pauses only affected active collections and later checkpoints cannot shrink them', async () => {
  const f=fixture();
  f.collections.push({id:'other',name:'Other',autoUpdate:true,links:[],groups:[]});
  await f.browser.storage.session.set({neoSessions:{active:{
    1:{collectionId:'b',tracking:true},2:{collectionId:'other',tracking:true},
  },parked:{}}});
  await f.manager.capture(1);
  const before=structuredClone(f.collections[0].links);
  await f.manager.pauseForStash([{id:1,windowId:1}]);
  const active=(await f.manager.list()).active;
  assert.equal(active[1].tracking,false);
  assert.equal(active[2].tracking,true);
  assert.equal(f.collections[0].autoUpdate,false);
  assert.equal(f.collections[1].autoUpdate,true);
  await f.browser.tabs.remove(1);
  await f.manager.capture(1);
  assert.deepEqual(f.collections[0].links,before);
  await f.browser.tabs.remove(2);
  await f.manager.capture(1);
  assert.deepEqual(f.collections[0].links,before);
});
test('switch saves source snapshot and returns in the same window with pins preserved', async () => {
  const f = fixture();
  f.browser.windows.create = async () => {
    throw Error('Swap must not create windows');
  };
  await f.manager.switchTo({ destinationId: 'b', windowId: 1 });
  const previous = (await f.manager.list(1)).retained[0];
  assert(!f.tabs.some((t) => t.id === 1));
  assert.equal(f.tabs.find((t) => t.id === 3).windowId, 1);
  assert.equal(previous.links.length, 2);
  await f.manager.switchTo({ destinationId: previous.id, windowId: 1 });
  assert(f.tabs.some((t) => t.windowId === 1 && t.url === 'https://a.test/'));
  assert(f.tabs.some((t) => t.windowId === 1 && t.url === 'https://b.test/'));
  assert.equal(f.collections.length, 1);
  assert.equal((await f.manager.hiddenWindows()).length, 0);
});

test('durable snapshot failure aborts before any tab moves or closes', async () => {
  const f = fixture();
  f.fail();
  await assert.rejects(f.manager.switchTo({ destinationId: 'b', windowId: 1 }), /disk/);
  assert.deepEqual(
    f.tabs.map((t) => t.id),
    [1, 2, 3],
  );
  assert(f.tabs.every((t) => t.windowId === 1));
});

test('close current collection preserves saved contents, pins and previous sessions without reopening', async () => {
  const f = fixture();
  await f.manager.switchTo({ destinationId: 'b', windowId: 1 });
  const previous = (await f.manager.list(1)).retained;
  await f.browser.tabs.create({ windowId: 1, url: 'https://added.test/', title: 'Added' });
  await f.manager.closeCurrent({ collectionId: 'b', windowId: 1 });
  assert.deepEqual(
    f.tabs.filter((t) => t.url.startsWith('https:')).map((t) => t.id),
    [3],
  );
  assert.equal((await f.manager.list(1)).active[1], undefined);
  assert.deepEqual((await f.manager.list(1)).retained, previous);
  assert.equal(f.collections[0].links.length, 2);
  await f.manager.capture(1);
  assert.equal(f.collections[0].links.length, 2, 'Closing must not autosave an empty collection');
  assert(
    [...f.timeline.values()].some(
      (r) => r.reason === 'Closed collection' && r.snapshot.links.length === 2,
    ),
  );
  await f.manager.switchTo({ destinationId: 'b', windowId: 1 });
  assert.equal(f.tabs.filter((t) => t.url.startsWith('https:') && !t.pinned).length, 2);
});

test('close rejects stale or other-window collection buttons', async () => {
  const f = fixture();
  await f.manager.switchTo({ destinationId: 'b', windowId: 1 });
  const before = structuredClone(f.tabs);
  await assert.rejects(
    f.manager.closeCurrent({ collectionId: 'old', windowId: 1 }),
    /no longer active/,
  );
  await assert.rejects(
    f.manager.closeCurrent({ collectionId: 'b', windowId: 2 }),
    /no longer active/,
  );
  assert.deepEqual(f.tabs, before);
});

test('failed close snapshot leaves active association and tabs untouched', async () => {
  const f = fixture();
  await f.manager.switchTo({ destinationId: 'b', windowId: 1 });
  const before = structuredClone(f.tabs);
  f.fail();
  await assert.rejects(f.manager.closeCurrent({ collectionId: 'b', windowId: 1 }), /disk/);
  assert.deepEqual(f.tabs, before);
  assert.equal((await f.manager.list(1)).active[1].collectionId, 'b');
});

test('incomplete close remains retryable and pauses autosave to protect full saved contents', async () => {
  const f = fixture();
  await f.manager.switchTo({ destinationId: 'b', windowId: 1 });
  f.ops.close = async (ids) => ({ skipped: ids });
  await assert.rejects(f.manager.closeCurrent({ collectionId: 'b', windowId: 1 }), /couldn.t close/);
  assert.equal((await f.manager.list(1)).active[1].collectionId, 'b');
  assert.equal(f.collections[0].autoUpdate, false);
  assert.equal(f.collections[0].links.length, 1);
});

test('closing sole collection tabs keeps the same window alive with the library', async () => {
  const f = fixture();
  await f.browser.tabs.remove(3);
  await f.manager.switchTo({ destinationId: 'b', windowId: 1 });
  await f.manager.closeCurrent({ collectionId: 'b', windowId: 1 });
  assert.equal(f.tabs.length, 1);
  assert.equal(f.tabs[0].url, 'chrome-extension://neo/app.html');
  assert.equal(f.tabs[0].windowId, 1);
});
test('save unchecked closes source but retains a recoverable dated group snapshot', async () => {
  const f = fixture();
  await f.manager.switchTo({ destinationId: 'b', windowId: 1, saveCurrent: false });
  assert(!f.tabs.some((t) => t.id === 1));
  assert(f.tabs.some((t) => t.id === 3));
  assert(
    [...f.timeline.values()].some(
      (r) => r.snapshot.links.length === 2 && r.snapshot.groups[0].name === 'Research',
    ),
  );
  assert.equal((await f.manager.list(1)).retained.length, 0);
});
test('destination failure keeps all source tabs', async () => {
  const f = fixture();
  f.ops.openLinks = async () => ({ failed: ['bad'], groupFailures: [] });
  await assert.rejects(f.manager.switchTo({ destinationId: 'b', windowId: 1 }), /couldn.t open/);
  assert(f.tabs.filter((t) => t.id <= 3).every((t) => t.windowId === 1));
});
test('unchanged checkpoints deduplicate and retention is bounded', async () => {
  const f = fixture();
  await f.manager.capture(1);
  await f.manager.capture(1);
  assert.equal(f.timeline.size, 1);
  for (let i = 0; i < 202; i++) await f.manager.capture(1, { force: true });
  assert.equal(f.timeline.size, 200);
});

test('switching multiple collections never creates a holding window', async () => {
  const f = fixture();
  f.browser.windows.create = async () => {
    throw Error('Unexpected window');
  };
  f.collections.push({
    id: 'c',
    name: 'C',
    groups: [],
    links: [{ id: 'cl', url: 'https://c.test/' }],
  });
  await f.manager.switchTo({ destinationId: 'b', windowId: 1 });
  await f.manager.switchTo({ destinationId: 'c', windowId: 1 });
  await f.manager.switchTo({ destinationId: 'b', windowId: 1 });
  assert(f.tabs.some((t) => t.windowId === 1 && t.url === 'https://destination.test/'));
  assert((await f.manager.hiddenWindows()).length === 0);
});

test('active collection mirrors added and closed tabs, including zero tabs', async () => {
  const f = fixture();
  await f.manager.switchTo({ destinationId: 'b', windowId: 1 });
  const extra = await f.browser.tabs.create({
    windowId: 1,
    url: 'https://new.test/',
    title: 'New',
    groupId: -1,
  });
  await f.manager.capture(1);
  assert.deepEqual(f.collections[0].links.map((l) => l.url).sort(), [
    'https://destination.test/',
    'https://new.test/',
  ]);
  for (const t of [...f.tabs].filter(
    (t) => t.windowId === 1 && !t.pinned && t.url.startsWith('https:'),
  ))
    await f.browser.tabs.remove(t.id);
  await f.manager.capture(1);
  assert.equal(f.collections[0].links.length, 0);
  assert(
    [...f.timeline.values()].some((r) => r.collectionId === 'b' && r.snapshot.links.length === 0),
  );
});

test('saved collection wins over an older partial timeline when switching', async () => {
  const f = fixture();
  f.timeline.set('old', {
    id: 'old',
    at: Date.now(),
    collectionId: 'b',
    snapshot: { links: [{ url: 'https://stale.test' }], groups: [] },
  });
  await f.manager.switchTo({ destinationId: 'b', windowId: 1 });
  assert(f.tabs.some((t) => t.windowId === 1 && t.url === 'https://destination.test/'));
  assert(!f.tabs.some((t) => t.url === 'https://stale.test'));
});

test('paused collection keeps saved links despite changes to open tabs', async () => {
  const f = fixture();
  f.collections[0].autoUpdate = false;
  await f.manager.switchTo({ destinationId: 'b', windowId: 1 });
  await f.browser.tabs.create({ windowId: 1, url: 'https://new.test/', groupId: -1 });
  await f.manager.capture(1);
  assert.equal(f.collections[0].links.length, 1);
});
test('pausing saves the last live changes before stopping updates',async()=>{
 const f=fixture();await f.manager.switchTo({destinationId:'b',windowId:1});
 await f.browser.tabs.create({windowId:1,url:'https://last-change.test/',title:'Last change',groupId:-1});
 await f.manager.setAutoUpdate({collectionId:'b',windowId:1,enabled:false});
 assert(f.collections[0].links.some(l=>l.url==='https://last-change.test/'));
 await f.browser.tabs.create({windowId:1,url:'https://after-pause.test/',groupId:-1});await f.manager.capture(1);
 assert(!f.collections[0].links.some(l=>l.url==='https://after-pause.test/'));
});

test('switching to an empty collection keeps the same browser window alive', async () => {
  const f = fixture();
  f.collections[0].links = [];
  await f.browser.tabs.remove(3);
  await f.manager.switchTo({ destinationId: 'b', windowId: 1 });
  assert(f.tabs.some((t) => t.windowId === 1 && t.url === 'chrome-extension://neo/app.html'));
  assert.equal(f.collections[0].links.length, 0);
});

for(const outgoing of ['keep','update'])test('explicit switch '+outgoing+' respects paused source and always saves recovery',async()=>{
 const f=fixture();const source={id:'a',name:'Paused work',autoUpdate:false,links:[{id:'old',url:'https://old.test/',title:'Old'}],groups:[],note:'Keep note'};f.collections.push(source);
 await f.browser.storage.session.set({neoSessions:{active:{1:{collectionId:'a',tracking:false}},parked:{}}});
 await f.manager.switchTo({destinationId:'b',windowId:1,outgoing,expectedSourceId:'a'});
 assert.equal(source.autoUpdate,false);assert.equal(source.note,'Keep note');
 assert.equal(source.links.some(l=>l.url==='https://a.test/'),outgoing==='update');
 assert.equal(source.links.some(l=>l.url==='https://old.test/'),outgoing==='keep');
 assert.equal(f.collections.length,2);
 assert([...f.timeline.values()].some(r=>r.snapshot.links.some(l=>l.url==='https://a.test/')));
});
test('stale switch source is rejected before changing tabs',async()=>{
 const f=fixture();const before=structuredClone(f.tabs);
 await assert.rejects(f.manager.switchTo({destinationId:'b',windowId:1,outgoing:'update',expectedSourceId:'gone'}),/active collection changed/);
 assert.deepEqual(f.tabs,before);
});
