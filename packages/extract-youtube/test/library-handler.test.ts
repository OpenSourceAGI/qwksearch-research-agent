import { DatabaseSync } from 'node:sqlite';

import {
  applyLibraryQuery,
  bearerTokenAuth,
  createD1LibraryStore,
  createLocalLibraryClient,
  createMemoryLibraryStore,
  createVideoLibraryHandler,
  librarySchemaSql,
  normalizeLibraryVideo,
  type CustomFieldDef,
  type D1DatabaseLike,
  type D1StatementLike,
  type LibraryQuery,
  type VideoLibraryStore,
} from '../src/library';

const A = 'aaaaaaaaaaa';
const B = 'bbbbbbbbbbb';
const C = 'ccccccccccc';
const FIELDS: CustomFieldDef[] = [{ key: 'speaker', label: 'Speaker', type: 'text', searchable: true }];

/** D1's API over node:sqlite — the same shape a Worker's `env.DB` has. */
function d1(db: DatabaseSync): D1DatabaseLike {
  const statement = (sql: string, values: unknown[] = []): D1StatementLike => ({
    bind: (...next: unknown[]) => statement(sql, next),
    all: async <T>() => ({ results: db.prepare(sql).all(...(values as never[])) as T[] }),
    first: async <T>() => (db.prepare(sql).get(...(values as never[])) as T | undefined) ?? null,
    run: async () => db.prepare(sql).run(...(values as never[])),
  });
  return {
    prepare: (sql) => statement(sql),
    batch: async (statements) => {
      for (const item of statements) await item.run();
      return [];
    },
  };
}

const seed = [
  { videoId: A, title: 'Alpha talk', channel: 'Zed', publishedAt: '2022-01-01', viewCount: 5, category: 'Talks', custom: { speaker: 'Ada' } },
  { videoId: B, title: 'Bravo Q&A', channel: 'amy', publishedAt: '2024-01-01', viewCount: 50, description: `after https://youtu.be/${A}` },
  { videoId: C, title: 'charlie', channel: 'Bob', publishedAt: '', viewCount: 50, hidden: true },
];

const NOW = new Date('2026-01-01T00:00:00.000Z');
const seedRows = seed.map((row) => normalizeLibraryVideo(row, FIELDS, NOW));

async function stores(): Promise<[string, VideoLibraryStore][]> {
  const memory = createMemoryLibraryStore({ seed: seedRows, customFields: FIELDS });
  const sqlite = createD1LibraryStore(d1(new DatabaseSync(':memory:')), { tablePrefix: 'test_' });
  await sqlite.ensureSchema();
  await sqlite.ensureSchema(); // idempotent
  for (const row of seedRows) await sqlite.insert(row);
  return [
    ['memory', memory],
    ['d1', sqlite],
  ];
}

describe('D1 store matches the reference query semantics', () => {
  const queries: LibraryQuery[] = [
    {},
    { includeHidden: true },
    { includeHidden: true, dir: 'asc' },
    { sort: 'views' },
    { sort: 'title', dir: 'asc', includeHidden: true },
    { sort: 'channel', dir: 'asc' },
    { q: 'ada' },
    { q: 'bravo' },
    { q: '100%_' },
    { ids: [] },
    { ids: [A, C], includeHidden: true },
    { category: 'Talks' },
    { limit: 1, page: 2 },
  ];

  it.each(queries.map((query) => [JSON.stringify(query), query]))('%s', async (_label, query) => {
    const [[, memory], [, sqlite]] = await stores();
    const expected = applyLibraryQuery(await memory.all(), query as LibraryQuery);
    const actual = await sqlite.list(query as LibraryQuery);
    expect(actual.videos.map((row) => row.videoId)).toEqual(expected.videos.map((row) => row.videoId));
    expect({ ...actual, videos: [] }).toEqual({ ...expected, videos: [] });
  });

  it('round-trips every column', async () => {
    const [[, memory], [, sqlite]] = await stores();
    expect(await sqlite.get(A)).toEqual(await memory.get(A));
    expect(await sqlite.get('zzzzzzzzzzz')).toBeNull();
  });

  it('answers stacks, categories and exclusions', async () => {
    const [, [, sqlite]] = await stores();
    await sqlite.update(A, { stackKey: A, stackPosition: 0 });
    await sqlite.updateMany([{ videoId: B, fields: { stackKey: A, stackPosition: 1 } }]);
    const stacks = await sqlite.getStacks([A, 'none']);
    expect(stacks[A].map((row) => row.videoId)).toEqual([A, B]);
    expect(await sqlite.categories()).toEqual(['Talks']);
    await sqlite.addExclusion({ videoId: C, deletedBy: null, deletedAt: '2026-01-01T00:00:00Z' });
    await sqlite.addExclusion({ videoId: C, deletedBy: 'me', deletedAt: '2026-01-02T00:00:00Z' });
    expect(await sqlite.listExclusions()).toEqual([{ videoId: C, deletedBy: 'me', deletedAt: '2026-01-02T00:00:00Z' }]);
    expect([...(await sqlite.excludedIds([A, C]))]).toEqual([C]);
    expect(await sqlite.remove(C)).toBe(true);
    expect(await sqlite.remove(C)).toBe(false);
  });

  it('refuses a table prefix that is not an identifier', () => {
    expect(() => librarySchemaSql('x; DROP TABLE y')).toThrow('Invalid D1 table prefix');
  });
});

describe('HTTP handler', () => {
  const make = (authorize = bearerTokenAuth('secret')) =>
    createVideoLibraryHandler({ store: createMemoryLibraryStore({ seed, customFields: FIELDS }), authorize, customFields: FIELDS, onError: () => undefined });
  const req = (method: string, path: string, body?: unknown, token?: string) =>
    new Request(`https://host${path}`, {
      method,
      headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
    });

  it('ignores paths outside its base path', async () => {
    expect(await make().handle(req('GET', '/other'))).toBeNull();
    expect((await make().fetch(req('GET', '/other'))).status).toBe(404);
  });

  it('serves public reads and hides hidden videos from the public', async () => {
    const handler = make();
    const list = await (await handler.fetch(req('GET', '/api/library/videos'))).json();
    expect(list.total).toBe(2);
    const sneaky = await (await handler.fetch(req('GET', '/api/library/videos?includeHidden=true'))).json();
    expect(sneaky.total).toBe(2);
    const admin = await (await handler.fetch(req('GET', '/api/library/videos?includeHidden=true', undefined, 'secret'))).json();
    expect(admin.total).toBe(3);
    expect((await handler.fetch(req('GET', `/api/library/videos/${C}`))).status).toBe(404);
    expect((await handler.fetch(req('GET', `/api/library/videos/${C}`, undefined, 'secret'))).status).toBe(200);
    expect(await (await handler.fetch(req('GET', '/api/library/fields'))).json()).toEqual({ fields: FIELDS });
    expect(await (await handler.fetch(req('GET', '/api/library/session'))).json()).toEqual({ admin: false });
  });

  it('refuses admin routes without the token, and with no authorize at all', async () => {
    const handler = make();
    expect((await handler.fetch(req('POST', '/api/library/videos', { videoId: 'eeeeeeeeeee', title: 'x' }))).status).toBe(403);
    expect((await handler.fetch(req('POST', '/api/library/videos', { videoId: 'eeeeeeeeeee', title: 'x' }, 'wrong'))).status).toBe(403);
    expect((await handler.fetch(req('DELETE', `/api/library/videos/${A}`))).status).toBe(403);
    expect((await handler.fetch(req('POST', '/api/library/resync'))).status).toBe(403);
    const readOnly = createVideoLibraryHandler({ store: createMemoryLibraryStore() });
    expect((await readOnly.fetch(req('POST', '/api/library/videos', { videoId: 'eeeeeeeeeee', title: 'x' }, 'secret'))).status).toBe(403);
    expect(await bearerTokenAuth('')(req('GET', '/', undefined, ''))).toBe(false);
  });

  it('creates, edits and deletes with the token', async () => {
    const handler = make();
    const created = await handler.fetch(req('POST', '/api/library/videos', { videoId: 'eeeeeeeeeee', title: 'New', custom: { speaker: 'Bo' } }, 'secret'));
    expect(created.status).toBe(201);
    expect((await created.json()).video.custom).toEqual({ speaker: 'Bo' });
    expect((await handler.fetch(req('POST', '/api/library/videos', { videoId: 'eeeeeeeeeee', title: 'New' }, 'secret'))).status).toBe(409);
    expect((await handler.fetch(req('POST', '/api/library/videos', { videoId: 'bad', title: 'New' }, 'secret'))).status).toBe(400);
    expect((await handler.fetch(req('POST', '/api/library/videos', '{nope', 'secret'))).status).toBe(400);

    const edited = await handler.fetch(req('PATCH', `/api/library/videos/${A}`, { title: 'Renamed' }, 'secret'));
    expect((await edited.json()).video.title).toBe('Renamed');
    expect((await handler.fetch(req('PATCH', '/api/library/videos/zzzzzzzzzzz', { title: 'x' }, 'secret'))).status).toBe(404);

    expect((await handler.fetch(req('DELETE', `/api/library/videos/${A}`, undefined, 'secret'))).status).toBe(200);
    const exclusions = await (await handler.fetch(req('GET', '/api/library/exclusions', undefined, 'secret'))).json();
    expect(exclusions.exclusions[0]).toMatchObject({ videoId: A, deletedBy: 'admin' });
  });

  it('reports resync as not configured without an API key', async () => {
    const response = await make().fetch(req('POST', '/api/library/resync', undefined, 'secret'));
    expect(response.status).toBe(501);
  });

  it('turns an unexpected store error into a JSON 500', async () => {
    const store = createMemoryLibraryStore();
    store.list = async () => {
      throw new Error('db down');
    };
    const handler = createVideoLibraryHandler({ store, onError: () => undefined });
    const response = await handler.fetch(req('GET', '/api/library/videos'));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'Internal error' });
  });
});

describe('local client', () => {
  it('drives the real routes in-process', async () => {
    const client = createLocalLibraryClient({ store: createMemoryLibraryStore({ seed, customFields: FIELDS }), customFields: FIELDS });
    expect((await client.session()).admin).toBe(true);
    expect((await client.list({ sort: 'views' })).videos.map((row) => row.videoId)).toEqual([B, A]);
    // The seed already links B to A, so linking F to B joins that stack: the
    // oldest member (A) keys it and the undated newcomer sorts last.
    const created = await client.create('fffffffffff', { title: 'Via client', description: `see https://youtu.be/${B}` });
    expect(created.stackKey).toBe(A);
    expect((await client.stacks([A]))[A].map((row) => row.videoId)).toEqual([A, B, 'fffffffffff']);
    await expect(client.create('fffffffffff', { title: 'dupe' })).rejects.toMatchObject({ status: 409 });
    expect(await client.categories()).toEqual(['Talks']);
    const imported = await client.importVideos([{ videoId: 'ggggggggggg', title: 'Imported' }]);
    expect(imported.inserted).toBe(1);
    const marked = await client.update(A, { availability: 'removed' });
    expect((await client.unavailable()).map((row) => row.videoId)).toEqual([marked.videoId]);
    expect((await client.markAvailable(A)).availability).toBe('available');
  });
});
