import test from 'node:test';
import assert from 'node:assert/strict';
import { createFaviconCache } from '../extension/lib/favicons.js';

test('generic or failed native cache lookups never replace a previously saved site icon', async () => {
  let clock = 1_000_000,
    response = null,
    calls = 0;
  const saved = { id: 'https://site.test/', data: 'known-site-icon', at: 1 };
  const cache = createFaviconCache({
    now: () => clock,
    read: async () => saved,
    write: async () => {
      throw Error('Must not overwrite good cache');
    },
    fetchIcon: async () => {
      calls++;
      if (response instanceof Error) throw response;
      return response;
    },
  });
  assert.equal(await cache.resolve(saved.id), 'known-site-icon');
  clock += 61_000;
  response = Error('Edge cache temporarily unavailable');
  assert.equal(await cache.resolve(saved.id), 'known-site-icon');
  assert.equal(calls, 2);
});
test('missing icon retries and stores the real icon when native cache becomes ready', async () => {
  let clock = 1_000_000,
    response = null,
    saved,
    calls = 0;
  const cache = createFaviconCache({
    now: () => clock,
    read: async () => saved,
    write: async (r) => {
      saved = r;
    },
    fetchIcon: async () => {
      calls++;
      return response;
    },
  });
  assert.equal(await cache.resolve('https://site.test/'), null);
  response = 'real-icon';
  clock += 1001;
  assert.equal(await cache.resolve('https://site.test/'), 'real-icon');
  assert.equal(saved.data, 'real-icon');
  await cache.resolve('https://site.test/');
  assert.equal(calls, 2);
});
test('concurrent icon requests share one local-cache lookup', async () => {
  let calls = 0;
  const cache = createFaviconCache({
    read: async () => undefined,
    write: async () => {},
    fetchIcon: async () => {
      calls++;
      return 'icon';
    },
  });
  assert.deepEqual(
    await Promise.all([cache.resolve('u'), cache.resolve('u'), cache.resolve('u')]),
    ['icon', 'icon', 'icon'],
  );
  assert.equal(calls, 1);
});
test('fresh persisted icons survive a new page/cache instance without another native request', async () => {
  const cache = createFaviconCache({
    now: () => 100,
    read: async () => ({ data: 'icon', at: 90 }),
    write: async () => {},
    fetchIcon: async () => {
      throw Error('unexpected native request');
    },
  });
  assert.equal(await cache.resolve('u'), 'icon');
});
