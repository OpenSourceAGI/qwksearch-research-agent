
import test from 'node:test';
import assert from 'node:assert/strict';
import { isOverlaySender, openSwitcher } from '../extension/lib/overlay.js';
test('overlay capability is bound to a specific tab document, expires, and rejects page frames', async () => {
  const session = { token: 'private', documentId: 'document-a', expires: Date.now() + 10000 };
  globalThis.chrome = { storage: { session: { get: async (key) => ({ 'overlay:4': session }) } } };
  const sender = { tab: { id: 4 }, frameId: 0, documentId: 'document-a' };
  assert(await isOverlaySender({ overlayToken: 'private' }, sender));
  assert.equal(await isOverlaySender({ overlayToken: 'wrong' }, sender), false);
  assert.equal(
    await isOverlaySender({ overlayToken: 'private' }, { ...sender, frameId: 1 }),
    false,
  );
  assert.equal(
    await isOverlaySender({ overlayToken: 'private' }, { ...sender, documentId: 'document-b' }),
    false,
  );
  assert.equal(
    await isOverlaySender({ overlayToken: 'private' }, { ...sender, tab: { id: 5 } }),
    false,
  );
  session.expires = 0;
  assert.equal(await isOverlaySender({ overlayToken: 'private' }, sender), false);
  delete globalThis.chrome;
});
test('rapid repeated shortcut actions serialize to one mount followed by close', async () => {
  let mounts = 0,
    mounted = false;
  globalThis.chrome = {
    tabs: { get: async () => ({ active: true, url: 'chrome://test' }) },
    storage: { session: { set: async () => {}, remove: async () => {} } },
    scripting: {
      executeScript: async (options) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        if (options.func) return [{ result: options.func(...options.args), documentId: 'doc' }];
        mounts++;
        mounted = true;
        globalThis.__neoCloseOverlay = () => {
          mounted = false;
          globalThis.__neoCloseOverlay = null;
        };
        return [];
      },
    },
  };
  await Promise.all([openSwitcher({ id: 4, windowId: 1 }), openSwitcher({ id: 4, windowId: 1 })]);
  assert.equal(mounts, 1);
  assert.equal(mounted, false);
  delete globalThis.chrome;
  delete globalThis.__neoOverlayContext;
  delete globalThis.__neoCloseOverlay;
});

test('Alt+Q closes a search-mode overlay without mounting a replacement', async () => {
  let closed = 0,
    mounts = 0;
  globalThis.__neoOverlayContext = { mode: 'search' };
  globalThis.__neoCloseOverlay = () => {
    closed++;
    globalThis.__neoCloseOverlay = null;
  };
  globalThis.chrome = {
    scripting: {
      executeScript: async (options) => {
        if (options.func) return [{ result: options.func(...options.args), documentId: 'doc' }];
        mounts++;
        return [];
      },
    },
  };
  try {
    await openSwitcher({ id: 12, windowId: 1 });
    assert.equal(closed, 1);
    assert.equal(mounts, 0);
  } finally {
    delete globalThis.chrome;
    delete globalThis.__neoOverlayContext;
    delete globalThis.__neoCloseOverlay;
  }
});

test('Alt+Q closes the owned fallback popup without affecting its source window', async () => {
  const removed = [];
  globalThis.chrome = {
    runtime: { getURL: (path) => 'chrome-extension://neo/' + path },
    windows: { get: async (id) => ({ id, type: 'popup' }), remove: async (id) => removed.push(id) },
  };
  try {
    await openSwitcher({
      id: 5,
      windowId: 9,
      url: 'chrome-extension://neo/quick.html?window=1&mode=switcher',
    });
    assert.deepEqual(removed, [9]);
  } finally {
    delete globalThis.chrome;
  }
});
