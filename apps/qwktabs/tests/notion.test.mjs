
import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareNotion, prepareNotionLibrary, notionStep, notionBatch, NOTION_VERSION } from '../extension/lib/notion.js';
import { journalSummary } from '../extension/lib/db.js';
import { newCollection } from '../extension/lib/model.js';
const parent = 'a'.repeat(32),
  page = 'b'.repeat(32);
function collection(count = 1) {
  const c = newCollection('Research');
  c.links = Array.from({ length: count }, (_, i) => ({
    id: String(i),
    title: 'Link ' + i,
    url: 'https://example.org/' + i,
    note: '',
    groupId: null,
  }));
  return c;
}
const ok = (value) => new Response(JSON.stringify(value), { status: 200 });

test('library export checkpoints each page, resumes a rejected second page and includes empty collections', async () => {
  const collections = [collection(101), collection(1), collection(0)];
  collections.forEach((c, i) => { c.name = 'Collection ' + i; });
  let job = prepareNotionLibrary(collections, parent), stored, rejectSecond = true;
  const created = [], requests = [];
  const options = {
    now: () => 1000000,
    save: async value => { stored = structuredClone(value); },
    fetcher: async (url, options) => {
      assert.equal(stored.status, 'sending');
      assert.equal(stored.pages.find(p => p.status !== 'complete').status, 'sending');
      requests.push(options.method);
      const body = JSON.parse(options.body);
      if (options.method === 'PATCH') return ok({ results: body.children });
      const name = body.properties.title.title[0].text.content;
      assert.equal(body.parent.page_id, parent);
      if (name === 'Collection 1' && rejectSecond) return new Response('', { status: 403 });
      created.push(name);
      return ok({ id: String(created.length).repeat(32), url: 'https://www.notion.so/' + String(created.length).repeat(32) });
    },
  };
  for (let i = 0; i < 3; i++) {
    job.retryAt = 0;
    job = await notionStep(job, 'fixture', options);
    if (job.pages) job.pages.forEach(p => { p.retryAt = 0; });
  }
  assert.equal(job.status, 'failed');
  assert.equal(job.pageCursor, 1);
  assert.equal(created.length, 1);
  job = structuredClone(stored); // Resume from the durable record after a worker restart.
  job.status = 'ready'; job.retryAt = 0; rejectSecond = false;
  while (job.status !== 'complete') {
    job.retryAt = 0;
    job.pages.forEach(p => { p.retryAt = 0; });
    job = await notionStep(job, 'fixture', options);
  }
  assert.deepEqual(created, ['Collection 0', 'Collection 1', 'Collection 2']);
  assert.deepEqual(requests, ['POST', 'PATCH', 'POST', 'POST', 'POST']);
  assert.equal(job.pageCursor, 3);
  assert.equal(job.cursor, job.total);
  const summary = journalSummary(job);
  assert(summary.pages.every(p => !('blocks' in p)));
  assert.equal(summary.pages.length, 3);
  assert(summary.pages.every(p => p.remoteURL));
});

test('library export validates all collections before scheduling any pages', () => {
  const invalid = collection(); invalid.links[0].url = 'file:///private';
  assert.throws(() => prepareNotionLibrary([collection(), invalid], parent), /web URLs/);
  assert.throws(() => prepareNotionLibrary([], parent), /No collections/);
});

test('library lost response persists uncertainty and never advances to another page', async () => {
  let calls = 0, stored;
  const options = {
    save: async value => { stored = structuredClone(value); },
    fetcher: async () => { calls++; throw Error('lost response'); },
  };
  const job = await notionStep(prepareNotionLibrary([collection(), collection()], parent), 'fixture', options);
  assert.equal(stored.status, 'uncertain');
  assert.equal(stored.pages[0].status, 'uncertain');
  assert.equal(stored.pages[1].status, 'ready');
  await assert.rejects(notionStep(job, 'fixture', options), /Export not confirmed/);
  assert.equal(calls, 1);
});
test('Notion sends 251 links in three bounded batches with durable checkpoints', async () => {
  let job = prepareNotion(collection(251), parent),
    stored,
    calls = [];
  const save = async (value) => {
    stored = structuredClone(value);
  };
  const fetcher = async (url, options) => {
    assert.equal(stored.status, 'sending');
    assert(stored.pending);
    assert(!JSON.stringify(stored).includes('test-secret'));
    assert.equal(options.headers['Notion-Version'], NOTION_VERSION);
    const body = JSON.parse(options.body);
    calls.push({ url, method: options.method, count: body.children.length });
    return options.method === 'POST'
      ? ok({ id: page, url: 'https://app.notion.com/p/' + page })
      : ok({ results: body.children });
  };
  while (job.status !== 'complete')
    job = await notionStep(job, 'test-secret', { save, fetcher, now: () => Date.now() + 100000 });
  assert.deepEqual(
    calls.map((c) => c.count),
    [100, 100, 51],
  );
  assert.deepEqual(
    calls.map((c) => c.method),
    ['POST', 'PATCH', 'PATCH'],
  );
  assert(calls[1].url.includes(page));
  assert.equal(stored.cursor, 251);
});
test('Notion batches also stay below byte limit with long Unicode notes', () => {
  const c = collection(100);
  c.links.forEach((l) => (l.note = '研究'.repeat(5000)));
  const job = prepareNotion(c, parent),
    batch = notionBatch(job);
  assert(batch.length < 100);
  assert(new TextEncoder().encode(JSON.stringify(batch)).length <= 400000);
});
test('Notion validates local URLs and parent before any remote operation', () => {
  assert.throws(() => prepareNotion(collection(), '-'.repeat(32)), /Notion page ID/);
  const c = collection();
  c.links[0].url = 'file:///C:/private.txt';
  assert.throws(() => prepareNotion(c, parent), /web URLs/);
});
test('Notion database failure prevents first HTTP write', async () => {
  let calls = 0;
  await assert.rejects(
    notionStep(prepareNotion(collection(), parent), 'k', {
      save: async () => {
        throw Error('disk full');
      },
      fetcher: async () => calls++,
    }),
    /disk full/,
  );
  assert.equal(calls, 0);
});
test('lost POST response becomes uncertain and cannot create a duplicate page', async () => {
  let calls = 0;
  const save = async () => {},
    fetcher = async () => {
      calls++;
      throw Error('connection lost');
    };
  const job = await notionStep(prepareNotion(collection(), parent), 'k', { save, fetcher });
  assert.equal(job.status, 'uncertain');
  await assert.rejects(notionStep(job, 'k', { save, fetcher }), /Export not confirmed/);
  assert.equal(calls, 1);
});
test('worker restart with persisted sending state never replays it', async () => {
  const job = prepareNotion(collection(), parent);
  job.status = 'sending';
  job.pending = { start: 0, count: 1 };
  let calls = 0;
  await assert.rejects(
    notionStep(job, 'k', { save: async () => {}, fetcher: async () => calls++ }),
    /Export not confirmed/,
  );
  assert.equal(calls, 0);
});
test('Notion rate limits respect Retry-After and cap automatic retries', async () => {
  let job = prepareNotion(collection(), parent),
    now = 1000,
    calls = 0;
  const options = {
    save: async () => {},
    now: () => now,
    fetcher: async () => {
      calls++;
      return new Response('', { status: 429, headers: { 'Retry-After': '15' } });
    },
  };
  job = await notionStep(job, 'k', options);
  assert.equal(job.status, 'waiting');
  assert(job.retryAt >= now + 15000);
  await notionStep(job, 'k', options);
  assert.equal(calls, 1);
  now = job.retryAt;
  job = await notionStep(job, 'k', options);
  now = job.retryAt;
  job = await notionStep(job, 'k', options);
  assert.equal(calls, 3);
  assert.equal(job.status, 'failed');
});
test('Notion acknowledges prior batches before a rejected append, allowing safe continuation', async () => {
  let job = prepareNotion(collection(101), parent);
  const save = async () => {};
  job = await notionStep(job, 'k', { save, fetcher: async () => ok({ id: page }), now: () => 0 });
  job = await notionStep(job, 'k', {
    save,
    fetcher: async () => new Response('', { status: 403 }),
    now: () => 1000,
  });
  assert.equal(job.status, 'partial');
  assert.equal(job.cursor, 100);
  assert.equal(job.pending, null);
  job = await notionStep(job, 'k', {
    save,
    fetcher: async (url, options) => {
      assert.equal(JSON.parse(options.body).children[0].bookmark.url, 'https://example.org/100');
      return ok({ results: [{}] });
    },
    now: () => 2000,
  });
  assert.equal(job.status, 'complete');
});
test('Notion does not retry server errors or malformed success responses', async () => {
  for (const response of [new Response('', { status: 503 }), ok({ id: 'bad' })]) {
    const job = await notionStep(prepareNotion(collection(), parent), 'k', {
      save: async () => {},
      fetcher: async () => response,
    });
    assert.equal(job.status, 'uncertain');
  }
});
