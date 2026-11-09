// @vitest-environment node
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { D1DatabaseLike, D1StatementLike } from './d1';

const mocks = vi.hoisted(() => ({ env: undefined as Record<string, unknown> | undefined }));
vi.mock('@/libs/cloudflare/env', () => ({ getCfEnv: () => mocks.env }));

const { D1_KV_SCHEMA, D1RedisProvider, getD1RedisDatabase } = await import('./d1');
const { initializeRedisWithPrefix, isRedisEnabled, isRedisStoreEnabled, resetPrefixedRedisClient } =
  await import('./manager');

/** A D1 binding over an in-memory SQLite database; `batch` runs in a transaction, as D1's does. */
const createSqliteD1 = (): D1DatabaseLike & { sqlite: DatabaseSync } => {
  const sqlite = new DatabaseSync(':memory:');

  const statement = (sql: string, params: unknown[] = []): D1StatementLike => {
    const exec = () => sqlite.prepare(sql).all(...(params as never[])) as Record<string, unknown>[];
    return {
      all: async <T>() => ({ results: exec() as T[] }),
      bind: (...values) => statement(sql, values),
      first: async <T>() => (exec()[0] as T | undefined) ?? null,
      run: async () => ({ results: exec() }),
    };
  };

  return {
    batch: async (statements) => {
      sqlite.exec('BEGIN');
      try {
        const results = [];
        for (const stmt of statements) results.push(await stmt.all());
        sqlite.exec('COMMIT');
        return results;
      } catch (error) {
        sqlite.exec('ROLLBACK');
        throw error;
      }
    },
    prepare: (sql) => statement(sql),
    sqlite,
  };
};

let clock = 1_000_000;
const now = () => clock;

const createStore = async (prefix = 'test', db = createSqliteD1()) => {
  const store = new D1RedisProvider(db, { now, prefix });
  await store.initialize();
  return { db, store };
};

beforeEach(() => {
  clock = 1_000_000;
});

describe('D1RedisProvider', () => {
  it('matches migrations/d1/0007_kv_store.sql', () => {
    const migration = readFileSync(
      path.resolve(__dirname, '../../../migrations/d1/0007_kv_store.sql'),
      'utf8',
    );
    const normalize = (sql: string) => sql.replaceAll(/\s+/g, ' ').trim();
    for (const statement of D1_KV_SCHEMA) {
      expect(normalize(migration)).toContain(normalize(statement));
    }
  });

  it('set -> get -> del roundtrip, scoped by prefix', async () => {
    const { db, store } = await createStore('a');
    const other = new D1RedisProvider(db, { now, prefix: 'b' });

    expect(await store.set('key', 'value')).toBe('OK');
    expect(await store.get('key')).toBe('value');
    expect(await other.get('key')).toBeNull();
    expect(db.sqlite.prepare('SELECT key FROM lobe_kv').all()).toEqual([{ key: 'a:key' }]);

    expect(await store.del('key', 'missing')).toBe(1);
    expect(await store.get('key')).toBeNull();
  });

  it('stores numbers and buffers as strings', async () => {
    const { store } = await createStore();
    await store.set(Buffer.from('buf'), 42);
    expect(await store.get('buf')).toBe('42');
  });

  it('expires keys and reports ttl like Redis', async () => {
    const { store } = await createStore();
    await store.set('k', 'v', { ex: 10 });
    await store.set('forever', 'v');

    expect(await store.ttl('k')).toBe(10);
    expect(await store.ttl('forever')).toBe(-1);
    expect(await store.ttl('missing')).toBe(-2);

    clock += 10_000;
    expect(await store.get('k')).toBeNull();
    expect(await store.ttl('k')).toBe(-2);
    expect(await store.exists('k', 'forever')).toBe(1);
  });

  it('supports px, exat and pxat expiries', async () => {
    const { store } = await createStore();
    await store.set('px', 'v', { px: 1500 });
    await store.set('exat', 'v', { exat: clock / 1000 + 5 });
    await store.set('pxat', 'v', { pxat: clock + 7000 });

    expect(await store.ttl('px')).toBe(2);
    expect(await store.ttl('exat')).toBe(5);
    expect(await store.ttl('pxat')).toBe(7);
  });

  it('SET NX only claims a free or expired key', async () => {
    const { store } = await createStore();
    expect(await store.set('lock', 'a', { ex: 5, nx: true })).toBe('OK');
    expect(await store.set('lock', 'b', { ex: 5, nx: true })).toBeNull();
    expect(await store.get('lock')).toBe('a');

    clock += 5000;
    expect(await store.set('lock', 'b', { ex: 5, nx: true })).toBe('OK');
    expect(await store.get('lock')).toBe('b');
  });

  it('SET XX only overwrites a live key', async () => {
    const { store } = await createStore();
    expect(await store.set('k', 'v', { xx: true })).toBeNull();
    expect(await store.get('k')).toBeNull();

    await store.set('k', 'v1');
    expect(await store.set('k', 'v2', { xx: true })).toBe('OK');
    expect(await store.get('k')).toBe('v2');
  });

  it('SET GET returns the previous value and KEEPTTL keeps the expiry', async () => {
    const { store } = await createStore();
    expect(await store.set('k', 'v1', { ex: 30, get: true })).toBeNull();
    expect(await store.set('k', 'v2', { get: true, keepTtl: true })).toBe('v1');
    expect(await store.get('k')).toBe('v2');
    expect(await store.ttl('k')).toBe(30);

    await store.set('k', 'v3');
    expect(await store.ttl('k')).toBe(-1);
  });

  it('setex sets a value with an expiry', async () => {
    const { store } = await createStore();
    expect(await store.setex('k', 20, 'v')).toBe('OK');
    expect(await store.ttl('k')).toBe(20);
  });

  it('incr and decr count atomically and keep the ttl', async () => {
    const { store } = await createStore();
    expect(await store.incr('n')).toBe(1);
    expect(await store.incr('n')).toBe(2);
    expect(await store.decr('n')).toBe(1);
    expect(await store.decr('fresh')).toBe(-1);

    await store.expire('n', 60);
    expect(await store.incr('n')).toBe(2);
    expect(await store.ttl('n')).toBe(60);

    clock += 60_000;
    expect(await store.incr('n')).toBe(1);
    expect(await store.ttl('n')).toBe(-1);
  });

  it('counts concurrent increments without losing any', async () => {
    const { store } = await createStore();
    await Promise.all(Array.from({ length: 25 }, () => store.incr('hits')));
    expect(await store.get('hits')).toBe('25');
  });

  it('mget keeps the order of the requested keys', async () => {
    const { store } = await createStore();
    expect(await store.mset({ a: '1', b: 2 })).toBe('OK');
    await store.mset(new Map([['c', '3']]));

    expect(await store.mget('b', 'missing', 'a', 'c', 'a')).toEqual(['2', null, '1', '3', '1']);
    expect(await store.mget()).toEqual([]);
  });

  it('handles more keys than one statement can bind', async () => {
    const { store } = await createStore();
    const keys = Array.from({ length: 250 }, (_, i) => `k${i}`);
    await store.mset(Object.fromEntries(keys.map((key) => [key, key])));

    expect(await store.mget(...keys)).toEqual(keys);
    expect(await store.exists(...keys)).toBe(250);
    expect(await store.del(...keys)).toBe(250);
  });

  it('stores hashes with field-level reads and key-level ttl', async () => {
    const { store } = await createStore();
    expect(await store.hset('h', 'a', '1')).toBe(1);
    expect(await store.hset('h', 'a', '2')).toBe(0);
    expect(await store.hset('h', 'b', 3)).toBe(1);

    expect(await store.hget('h', 'a')).toBe('2');
    expect(await store.hget('h', 'missing')).toBeNull();
    expect(await store.hgetall('h')).toEqual({ a: '2', b: '3' });
    expect(await store.exists('h')).toBe(1);

    expect(await store.expire('h', 10)).toBe(1);
    expect(await store.ttl('h')).toBe(10);
    // A new field joins the hash's existing expiry.
    await store.hset('h', 'c', '4');
    clock += 10_000;
    expect(await store.hgetall('h')).toEqual({});

    // Writing to an expired hash starts a fresh one without the old fields.
    expect(await store.hset('h', 'd', '5')).toBe(1);
    expect(await store.hgetall('h')).toEqual({ d: '5' });
    expect(await store.ttl('h')).toBe(-1);

    expect(await store.hdel('h', 'd', 'missing')).toBe(1);
    expect(await store.hgetall('h')).toEqual({});
  });

  it('del removes hashes too', async () => {
    const { store } = await createStore();
    await store.hset('h', 'a', '1');
    expect(await store.del('h')).toBe(1);
    expect(await store.hgetall('h')).toEqual({});
  });

  it('expire returns 0 for a missing key and deletes on a non-positive ttl', async () => {
    const { store } = await createStore();
    expect(await store.expire('missing', 10)).toBe(0);

    await store.set('k', 'v');
    expect(await store.expire('k', 0)).toBe(1);
    expect(await store.get('k')).toBeNull();
  });

  it('scan pages through matching live keys without the prefix', async () => {
    const { db, store } = await createStore('p');
    const other = new D1RedisProvider(db, { now, prefix: 'q' });
    await other.set('guard:other', 'x');

    for (let i = 0; i < 5; i++) await store.set(`guard:${i}`, 'v');
    await store.hset('guard:hash', 'f', 'v');
    await store.set('guard:expired', 'v', { ex: 1 });
    await store.set('unrelated', 'v');
    clock += 1000;

    const seen: string[] = [];
    let cursor = '0';
    let pages = 0;
    do {
      const [next, keys] = await store.scan(cursor, 'MATCH', 'guard:*', 'COUNT', 2);
      seen.push(...keys);
      cursor = next;
      pages++;
    } while (cursor !== '0');

    expect(seen.sort()).toEqual([
      'guard:0',
      'guard:1',
      'guard:2',
      'guard:3',
      'guard:4',
      'guard:hash',
    ]);
    expect(pages).toBe(4);

    const [, all] = await store.scan('0', 'COUNT', 100);
    expect(all).toContain('unrelated');
    expect(all).not.toContain('guard:other');
  });

  it('runs pipelined commands in order and reports each result', async () => {
    const { store } = await createStore();
    const results = await store
      .pipeline()
      .set('k', 'v')
      .get('k')
      .incr('n')
      .hset('h', 'f', 'v')
      .hgetall('h')
      .expire('k', 5)
      .del('k')
      .exec();

    expect(results).toEqual([
      [null, 'OK'],
      [null, 'v'],
      [null, 1],
      [null, 1],
      [null, { f: 'v' }],
      [null, 1],
      [null, 1],
    ]);
  });

  it('sweeps expired rows from the tables', async () => {
    const { db, store } = await createStore();
    await store.set('k', 'v', { ex: 1 });
    clock += 120_000;
    await store.set('other', 'v');

    expect(db.sqlite.prepare('SELECT key FROM lobe_kv').all()).toEqual([{ key: 'test:other' }]);
  });

  it('does not support Lua scripts', async () => {
    const { store } = await createStore();
    await expect(store.eval('return 1', 0)).rejects.toThrow(/not supported/);
  });
});

describe('Redis manager on Cloudflare D1', () => {
  const disabledConfig = { enabled: false, prefix: 'lobechat', tls: false, url: '' };
  const saved = process.env.DISABLE_D1_REDIS;

  afterEach(async () => {
    mocks.env = undefined;
    if (saved === undefined) delete process.env.DISABLE_D1_REDIS;
    else process.env.DISABLE_D1_REDIS = saved;
    await resetPrefixedRedisClient();
  });

  it('has no store outside a Worker', async () => {
    expect(getD1RedisDatabase()).toBeNull();
    expect(isRedisStoreEnabled(disabledConfig)).toBe(false);
    expect(await initializeRedisWithPrefix(disabledConfig, 'none')).toBeNull();
  });

  it('uses the D1 `DB` binding when no Redis server is configured', async () => {
    const db = createSqliteD1();
    mocks.env = { DB: db };

    expect(isRedisEnabled(disabledConfig)).toBe(false);
    expect(isRedisStoreEnabled(disabledConfig)).toBe(true);

    const store = await initializeRedisWithPrefix(disabledConfig, 'aiGeneration');
    expect(store).toBeInstanceOf(D1RedisProvider);
    await store!.set('k', 'v');
    expect(db.sqlite.prepare('SELECT key FROM lobe_kv').all()).toEqual([{ key: 'aiGeneration:k' }]);
  });

  it('can be switched off with DISABLE_D1_REDIS', () => {
    mocks.env = { DB: createSqliteD1() };
    process.env.DISABLE_D1_REDIS = '1';

    expect(getD1RedisDatabase()).toBeNull();
    expect(isRedisStoreEnabled(disabledConfig)).toBe(false);
  });
});
