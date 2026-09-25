import test from 'node:test';
import assert from 'node:assert/strict';
import { settleParked, repairParkedTabs } from '../extension/lib/parked.js';
const url = 'chrome-extension://neo/parked.html?id=old';
const ready = {
  id: 1,
  url,
  title: 'Original page',
  favIconUrl: 'data:image/png;base64,cached',
  status: 'complete',
  active: false,
};
test('waits for metadata without immediately discarding the local placeholder', async () => {
  let step = 0,
    discarded = 0;
  const browser = {
    tabs: {
      get: async () =>
        step === 0
          ? { ...ready, title: 'Parked page', favIconUrl: '' }
          : step === 1
            ? { ...ready, favIconUrl: '' }
            : ready,
      discard: async () => {
        discarded++;
        assert.equal(step, 2);
        return { ...ready, id: 10, discarded: true };
      },
    },
  };
  const result = await settleParked(browser, ready, url, 'Original page', async () => step++);
  assert.equal(discarded, 0);
  assert.equal(step, 2);
  assert.equal(result.id, 1);
});
test('metadata timeout keeps placeholder alive; activation and navigation end the wait', async () => {
  for (const patch of [
    { title: 'Parked page', favIconUrl: '' },
    { active: true },
    { url: 'https://elsewhere.test/' },
  ]) {
    let discarded = false;
    const browser = {
      tabs: {
        get: async () => ({ ...ready, ...patch }),
        discard: async () => {
          discarded = true;
        },
      },
    };
    await settleParked(browser, ready, url, 'Original page', async () => {});
    assert.equal(discarded, false);
  }
});
test('upgrade repairs only inactive owned placeholders and never active or missing records', async () => {
  const tabs = [
    { ...ready, title: 'Parked page', favIconUrl: '' },
    { ...ready, id: 2, active: true },
    { ...ready, id: 3, url: 'https://example.test/' },
    { ...ready, id: 4, url: url.replace('old', 'missing') },
    { ...ready, id: 5, discarded: true },
    { ...ready, id: 6, discarded: false },
  ];
  const reloaded = [],
    discarded = [];
  const browser = {
    runtime: { getURL: (p) => 'chrome-extension://neo/' + p },
    tabs: {
      query: async () => tabs,
      get: async (id) => tabs.find((t) => t.id === id),
      reload: async (id) => {
        reloaded.push(id);
        Object.assign(
          tabs.find((t) => t.id === id),
          { ...ready, id, discarded: false },
        );
      },
      discard: async (id) => {
        discarded.push(id);
        return ready;
      },
    },
  };
  await repairParkedTabs(browser, {
    read: async (_, id) =>
      id === 'old' ? { url: 'https://example.test/', title: 'Original page' } : null,
  });
  assert.deepEqual(reloaded, [1, 5]);
  assert.deepEqual(discarded, []);
});

test('discard replacement IDs preserve retained collection tab ownership', async () => {
  const { sessionManager } = await import('../extension/lib/sessions.js');
  let value = {
    neoSessions: {
      active: {},
      parked: { one: { tabIds: [1, 2], markerId: 3 }, two: { tabIds: [8], markerId: 9 } },
    },
  };
  const browser = {
    runtime: { getURL: (p) => p },
    storage: {
      session: {
        get: async () => structuredClone(value),
        set: async (v) => {
          value = v;
        },
      },
    },
  };
  const sessions = sessionManager({ browser, db: {}, ops: {} });
  await sessions.replaceTab(2, 12);
  await sessions.replaceTab(3, 13);
  assert.deepEqual(value.neoSessions.parked.one, { tabIds: [1, 12], markerId: 13 });
  assert.deepEqual(value.neoSessions.parked.two, { tabIds: [8], markerId: 9 });
});

test('later worker wakes leave healthy browser-discarded placeholders asleep', async () => {
  let reloads = 0;
  const tab = { ...ready, discarded: true };
  await repairParkedTabs(
    {
      runtime: { getURL: (p) => 'chrome-extension://neo/' + p },
      tabs: { query: async () => [tab], get: async () => tab, reload: async () => reloads++ },
    },
    { read: async () => ({ url: 'https://example.test/', title: ready.title }) },
    { repairDiscarded: false },
  );
  assert.equal(reloads, 0);
});
