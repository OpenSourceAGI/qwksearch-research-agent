import debug from 'debug';

import { getCfEnv } from '@/libs/cloudflare/env';

import {
  type BaseRedisProvider,
  type RedisKey,
  type RedisMSetArgument,
  type RedisPipeline,
  type RedisScanArgs,
  type RedisScanResult,
  type RedisSetResult,
  type RedisValue,
  type SetOptions,
} from './types';
import { normalizeMsetValues, normalizeRedisKey } from './utils';

const log = debug('lobe:redis:d1');

/**
 * The slice of the D1 binding this store uses. Declared here so the store type-checks outside the
 * Worker (Node dev server, vitest) without `@cloudflare/workers-types`.
 */
export interface D1StatementLike {
  all: <T = Record<string, unknown>>() => Promise<{ results?: T[] }>;
  bind: (...values: unknown[]) => D1StatementLike;
  first: <T = Record<string, unknown>>() => Promise<T | null>;
  run: () => Promise<unknown>;
}

export interface D1DatabaseLike {
  batch: (statements: D1StatementLike[]) => Promise<{ results?: unknown[] }[]>;
  prepare: (sql: string) => D1StatementLike;
}

export const D1_STRINGS_TABLE = 'lobe_kv';
export const D1_HASHES_TABLE = 'lobe_kv_hash';

/**
 * Same DDL as `migrations/d1/0007_kv_store.sql`. The store also runs it on first use, because the
 * `lobe-production` Worker keeps LobeHub's data on Postgres and never applies the D1 migrations.
 */
export const D1_KV_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS ${D1_STRINGS_TABLE} (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL,
  expires_at INTEGER
)`,
  `CREATE INDEX IF NOT EXISTS ${D1_STRINGS_TABLE}_expires_at ON ${D1_STRINGS_TABLE} (expires_at)`,
  `CREATE TABLE IF NOT EXISTS ${D1_HASHES_TABLE} (
  key TEXT NOT NULL,
  field TEXT NOT NULL,
  value TEXT NOT NULL,
  expires_at INTEGER,
  PRIMARY KEY (key, field)
)`,
  `CREATE INDEX IF NOT EXISTS ${D1_HASHES_TABLE}_expires_at ON ${D1_HASHES_TABLE} (expires_at)`,
];

/** Expired rows are filtered on every read and swept from the tables at most this often. */
const SWEEP_INTERVAL_MS = 60_000;
/** D1 allows 100 bound parameters per statement; leave room for the fixed ones. */
const MAX_KEYS_PER_STATEMENT = 90;
const DEFAULT_SCAN_COUNT = 10;
const SCAN_CURSOR_PREFIX = 'k:';

const live = (table: string) => `(${table}.expires_at IS NULL OR ${table}.expires_at > ?)`;

const chunk = <T>(items: T[], size = MAX_KEYS_PER_STATEMENT): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
};

const placeholders = (count: number) => Array.from({ length: count }, () => '?').join(', ');

const toText = (value: RedisValue | RedisKey): string =>
  typeof value === 'number' ? String(value) : normalizeRedisKey(value);

/** Escapes GLOB metacharacters so a key prefix is matched literally. */
const escapeGlob = (value: string) => value.replaceAll(/[*?[]/g, (char) => `[${char}]`);

export interface D1RedisProviderOptions {
  /** Clock in milliseconds; injectable for tests. */
  now?: () => number;
  prefix?: string;
}

/**
 * The `@/libs/redis` client interface backed by a Cloudflare D1 database.
 *
 * Replaces the Upstash HTTP Redis provider the Worker deployment was going to need: on Workers
 * `ioredis` cannot open a TCP socket, so without this every Redis-backed cache and guard ran on
 * per-isolate memory. D1 is used rather than KV because callers rely on Redis' atomic primitives
 * (`SET NX`, `INCR`), which KV's eventually consistent, last-write-wins model cannot provide; every
 * multi-statement operation here runs as one D1 batch, which D1 executes as a transaction.
 *
 * Semantics follow Redis for everything callers use, with these limits:
 * - strings and hashes live in separate tables, so a key is not checked for a type clash;
 * - `eval` (Lua) is not supported and throws;
 * - `SCAN … MATCH` uses SQLite `GLOB`, which has no backslash escapes;
 * - `INCR`/`DECR` treat a non-integer value as 0 instead of erroring.
 */
export class D1RedisProvider implements BaseRedisProvider {
  private readonly prefix: string;
  private readonly now: () => number;
  private lastSweep = 0;

  constructor(
    private readonly db: D1DatabaseLike,
    options: D1RedisProviderOptions = {},
  ) {
    this.prefix = options.prefix ? `${options.prefix}:` : '';
    this.now = options.now ?? Date.now;
  }

  async initialize() {
    await this.db.batch(D1_KV_SCHEMA.map((sql) => this.db.prepare(sql)));
    await this.sweep(true);
    log('D1 key/value store ready with prefix "%s"', this.prefix);
  }

  async disconnect() {}

  // ---------------------------------------------------------------- helpers

  private k(key: RedisKey) {
    return `${this.prefix}${normalizeRedisKey(key)}`;
  }

  private stripPrefix(key: string) {
    return this.prefix && key.startsWith(this.prefix) ? key.slice(this.prefix.length) : key;
  }

  private stmt(sql: string, ...values: unknown[]) {
    return this.db.prepare(sql).bind(...values);
  }

  private async rows<T>(sql: string, ...values: unknown[]): Promise<T[]> {
    const { results } = await this.stmt(sql, ...values).all<T>();
    return results ?? [];
  }

  /** Deletes expired rows; throttled so it costs at most one write per minute per isolate. */
  private async sweep(force = false) {
    const now = this.now();
    if (!force && now - this.lastSweep < SWEEP_INTERVAL_MS) return;
    this.lastSweep = now;

    try {
      await this.db.batch([
        this.stmt(`DELETE FROM ${D1_STRINGS_TABLE} WHERE expires_at <= ?`, now),
        this.stmt(`DELETE FROM ${D1_HASHES_TABLE} WHERE expires_at <= ?`, now),
      ]);
    } catch (error) {
      log('sweep failed: %O', error);
    }
  }

  private resolveExpiry(options: SetOptions | undefined, now: number): number | null | 'keep' {
    if (!options) return null;
    if (options.ex !== undefined) return now + options.ex * 1000;
    if (options.px !== undefined) return now + options.px;
    if (options.exat !== undefined) return options.exat * 1000;
    if (options.pxat !== undefined) return options.pxat;
    if (options.keepTtl) return 'keep';
    return null;
  }

  // ---------------------------------------------------------------- strings

  async get(key: RedisKey): Promise<string | null> {
    const row = await this.stmt(
      `SELECT value FROM ${D1_STRINGS_TABLE} WHERE key = ? AND ${live(D1_STRINGS_TABLE)}`,
      this.k(key),
      this.now(),
    ).first<{ value: string }>();

    return row?.value ?? null;
  }

  async set(key: RedisKey, value: RedisValue, options?: SetOptions): Promise<RedisSetResult> {
    const now = this.now();
    const k = this.k(key);
    const v = toText(value);
    const expiry = this.resolveExpiry(options, now);
    const T = D1_STRINGS_TABLE;

    // With KEEPTTL a live key keeps its expiry; otherwise the new one replaces it.
    const expiresAt = expiry === 'keep' ? null : expiry;
    const updatedExpiry =
      expiry === 'keep'
        ? `CASE WHEN ${live(T)} THEN ${T}.expires_at ELSE NULL END`
        : 'excluded.expires_at';
    const updatedExpiryArgs = expiry === 'keep' ? [now] : [];

    let write: D1StatementLike;
    if (options?.xx) {
      write = this.stmt(
        `UPDATE ${T} SET value = ?, expires_at = ${expiry === 'keep' ? 'expires_at' : '?'}
         WHERE key = ? AND ${live(T)} RETURNING key`,
        v,
        ...(expiry === 'keep' ? [] : [expiresAt]),
        k,
        now,
      );
    } else {
      // NX only overwrites a row that has already expired.
      const guard = options?.nx ? `WHERE ${T}.expires_at IS NOT NULL AND ${T}.expires_at <= ?` : '';
      write = this.stmt(
        `INSERT INTO ${T} (key, value, expires_at) VALUES (?, ?, ?)
         ON CONFLICT (key) DO UPDATE SET value = excluded.value, expires_at = ${updatedExpiry}
         ${guard} RETURNING key`,
        k,
        v,
        expiresAt,
        ...updatedExpiryArgs,
        ...(options?.nx ? [now] : []),
      );
    }

    const [previous, written] = await this.db.batch([
      this.stmt(`SELECT value FROM ${T} WHERE key = ? AND ${live(T)}`, k, now),
      write,
    ]);
    await this.sweep();

    const didWrite = (written?.results?.length ?? 0) > 0;
    if (options?.get) {
      const old = (previous?.results?.[0] as { value: string } | undefined)?.value;
      return old ?? null;
    }

    return didWrite ? 'OK' : null;
  }

  async setex(key: RedisKey, seconds: number, value: RedisValue): Promise<'OK'> {
    await this.set(key, value, { ex: seconds });
    return 'OK';
  }

  async mget(...keys: RedisKey[]): Promise<(string | null)[]> {
    if (keys.length === 0) return [];
    const ks = keys.map((key) => this.k(key));
    const now = this.now();
    const found = new Map<string, string>();

    for (const part of chunk([...new Set(ks)])) {
      const rows = await this.rows<{ key: string; value: string }>(
        `SELECT key, value FROM ${D1_STRINGS_TABLE}
         WHERE key IN (${placeholders(part.length)}) AND ${live(D1_STRINGS_TABLE)}`,
        ...part,
        now,
      );
      for (const row of rows) found.set(row.key, row.value);
    }

    return ks.map((key) => found.get(key) ?? null);
  }

  async mset(values: RedisMSetArgument): Promise<'OK'> {
    const entries = Object.entries(normalizeMsetValues(values));
    if (entries.length === 0) return 'OK';

    await this.db.batch(
      entries.map(([key, value]) =>
        this.stmt(
          `INSERT INTO ${D1_STRINGS_TABLE} (key, value, expires_at) VALUES (?, ?, NULL)
           ON CONFLICT (key) DO UPDATE SET value = excluded.value, expires_at = NULL`,
          this.k(key),
          toText(value),
        ),
      ),
    );

    return 'OK';
  }

  private async incrBy(key: RedisKey, delta: number): Promise<number> {
    const T = D1_STRINGS_TABLE;
    const now = this.now();
    const row = await this.stmt(
      `INSERT INTO ${T} (key, value, expires_at) VALUES (?, ?, NULL)
       ON CONFLICT (key) DO UPDATE SET
         value = CASE WHEN ${live(T)} THEN CAST(CAST(${T}.value AS INTEGER) + CAST(? AS INTEGER) AS TEXT) ELSE excluded.value END,
         expires_at = CASE WHEN ${live(T)} THEN ${T}.expires_at ELSE NULL END
       RETURNING value`,
      this.k(key),
      String(delta),
      now,
      delta,
      now,
    ).first<{ value: string }>();

    return Number(row?.value ?? delta);
  }

  async incr(key: RedisKey): Promise<number> {
    return this.incrBy(key, 1);
  }

  async decr(key: RedisKey): Promise<number> {
    return this.incrBy(key, -1);
  }

  // ---------------------------------------------------------------- keys

  async del(...keys: RedisKey[]): Promise<number> {
    if (keys.length === 0) return 0;
    const now = this.now();
    let deleted = 0;

    for (const part of chunk([...new Set(keys.map((key) => this.k(key)))])) {
      const list = placeholders(part.length);
      const [counted] = await this.db.batch([
        this.stmt(
          `SELECT COUNT(*) AS n FROM (
             SELECT key FROM ${D1_STRINGS_TABLE} WHERE key IN (${list}) AND ${live(D1_STRINGS_TABLE)}
             UNION
             SELECT key FROM ${D1_HASHES_TABLE} WHERE key IN (${list}) AND ${live(D1_HASHES_TABLE)}
           )`,
          ...part,
          now,
          ...part,
          now,
        ),
        this.stmt(`DELETE FROM ${D1_STRINGS_TABLE} WHERE key IN (${list})`, ...part),
        this.stmt(`DELETE FROM ${D1_HASHES_TABLE} WHERE key IN (${list})`, ...part),
      ]);
      deleted += Number((counted?.results?.[0] as { n: number } | undefined)?.n ?? 0);
    }

    return deleted;
  }

  async exists(...keys: RedisKey[]): Promise<number> {
    if (keys.length === 0) return 0;
    const now = this.now();
    const present = new Set<string>();

    for (const part of chunk([...new Set(keys.map((key) => this.k(key)))])) {
      const list = placeholders(part.length);
      const rows = await this.rows<{ key: string }>(
        `SELECT key FROM ${D1_STRINGS_TABLE} WHERE key IN (${list}) AND ${live(D1_STRINGS_TABLE)}
         UNION
         SELECT key FROM ${D1_HASHES_TABLE} WHERE key IN (${list}) AND ${live(D1_HASHES_TABLE)}`,
        ...part,
        now,
        ...part,
        now,
      );
      for (const row of rows) present.add(row.key);
    }

    // Like Redis, a key named twice counts twice.
    return keys.filter((key) => present.has(this.k(key))).length;
  }

  async expire(key: RedisKey, seconds: number): Promise<number> {
    if (seconds <= 0) return this.del(key);

    const now = this.now();
    const k = this.k(key);
    const expiresAt = now + seconds * 1000;
    const [strings, hashes] = await this.db.batch([
      this.stmt(
        `UPDATE ${D1_STRINGS_TABLE} SET expires_at = ? WHERE key = ? AND ${live(D1_STRINGS_TABLE)} RETURNING key`,
        expiresAt,
        k,
        now,
      ),
      this.stmt(
        `UPDATE ${D1_HASHES_TABLE} SET expires_at = ? WHERE key = ? AND ${live(D1_HASHES_TABLE)} RETURNING key`,
        expiresAt,
        k,
        now,
      ),
    ]);

    return (strings?.results?.length ?? 0) + (hashes?.results?.length ?? 0) > 0 ? 1 : 0;
  }

  async ttl(key: RedisKey): Promise<number> {
    const now = this.now();
    const k = this.k(key);
    const row = await this.stmt(
      `SELECT expires_at FROM ${D1_STRINGS_TABLE} WHERE key = ? AND ${live(D1_STRINGS_TABLE)}
       UNION ALL
       SELECT expires_at FROM ${D1_HASHES_TABLE} WHERE key = ? AND ${live(D1_HASHES_TABLE)}
       LIMIT 1`,
      k,
      now,
      k,
      now,
    ).first<{ expires_at: number | null }>();

    if (!row) return -2;
    if (row.expires_at === null || row.expires_at === undefined) return -1;
    return Math.max(0, Math.round((Number(row.expires_at) - now) / 1000));
  }

  async scan(cursor: string, ...args: RedisScanArgs): Promise<RedisScanResult> {
    let match: string | undefined;
    let count = DEFAULT_SCAN_COUNT;
    for (let i = 0; i < args.length; i += 2) {
      if (args[i] === 'MATCH') match = String(args[i + 1]);
      if (args[i] === 'COUNT') count = Math.max(1, Number(args[i + 1]) || DEFAULT_SCAN_COUNT);
    }

    const after = cursor.startsWith(SCAN_CURSOR_PREFIX)
      ? cursor.slice(SCAN_CURSOR_PREFIX.length)
      : '';
    const pattern = `${escapeGlob(this.prefix)}${match ?? '*'}`;
    const now = this.now();

    const rows = await this.rows<{ key: string }>(
      `SELECT key FROM (
         SELECT key FROM ${D1_STRINGS_TABLE} WHERE ${live(D1_STRINGS_TABLE)}
         UNION
         SELECT key FROM ${D1_HASHES_TABLE} WHERE ${live(D1_HASHES_TABLE)}
       ) WHERE key > ? AND key GLOB ? ORDER BY key LIMIT ?`,
      now,
      now,
      after,
      pattern,
      count,
    );

    const keys = rows.map((row) => row.key);
    const next = keys.length < count ? '0' : `${SCAN_CURSOR_PREFIX}${keys.at(-1)}`;

    return [next, keys.map((key) => this.stripPrefix(key))];
  }

  // ---------------------------------------------------------------- hashes

  async hget(key: RedisKey, field: RedisKey): Promise<string | null> {
    const row = await this.stmt(
      `SELECT value FROM ${D1_HASHES_TABLE} WHERE key = ? AND field = ? AND ${live(D1_HASHES_TABLE)}`,
      this.k(key),
      normalizeRedisKey(field),
      this.now(),
    ).first<{ value: string }>();

    return row?.value ?? null;
  }

  async hset(key: RedisKey, field: RedisKey, value: RedisValue): Promise<number> {
    const H = D1_HASHES_TABLE;
    const now = this.now();
    const k = this.k(key);
    const f = normalizeRedisKey(field);

    const [existing] = await this.db.batch([
      this.stmt(
        `SELECT 1 AS found FROM ${H} WHERE key = ? AND field = ? AND ${live(H)}`,
        k,
        f,
        now,
      ),
      // Fields of an expired hash are dropped so the new field does not revive them.
      this.stmt(
        `DELETE FROM ${H} WHERE key = ? AND expires_at IS NOT NULL AND expires_at <= ?`,
        k,
        now,
      ),
      // A new field inherits the hash's TTL, as it does in Redis.
      this.stmt(
        `INSERT INTO ${H} (key, field, value, expires_at)
         VALUES (?, ?, ?, (SELECT expires_at FROM ${H} WHERE key = ? LIMIT 1))
         ON CONFLICT (key, field) DO UPDATE SET value = excluded.value`,
        k,
        f,
        toText(value),
        k,
      ),
    ]);
    await this.sweep();

    return (existing?.results?.length ?? 0) > 0 ? 0 : 1;
  }

  async hdel(key: RedisKey, ...fields: RedisKey[]): Promise<number> {
    if (fields.length === 0) return 0;
    const now = this.now();
    let removed = 0;

    for (const part of chunk([...new Set(fields.map((field) => normalizeRedisKey(field)))])) {
      const rows = await this.rows(
        `DELETE FROM ${D1_HASHES_TABLE}
         WHERE key = ? AND field IN (${placeholders(part.length)}) AND ${live(D1_HASHES_TABLE)}
         RETURNING field`,
        this.k(key),
        ...part,
        now,
      );
      removed += rows.length;
    }

    return removed;
  }

  async hgetall(key: RedisKey): Promise<Record<string, string>> {
    const rows = await this.rows<{ field: string; value: string }>(
      `SELECT field, value FROM ${D1_HASHES_TABLE} WHERE key = ? AND ${live(D1_HASHES_TABLE)}`,
      this.k(key),
      this.now(),
    );

    return Object.fromEntries(rows.map((row) => [row.field, row.value]));
  }

  // ---------------------------------------------------------------- misc

  async eval<T = unknown>(_script: string, _numkeys: number, ..._args: RedisValue[]): Promise<T> {
    throw new Error('eval (Lua scripts) is not supported by the D1 key/value store');
  }

  /**
   * Commands are buffered and run in order on `exec()`. Each one is its own D1 round-trip (each is
   * atomic on its own), so a pipeline is not a transaction — the same guarantee Redis gives.
   */
  pipeline(): RedisPipeline {
    const queue: Array<() => Promise<unknown>> = [];
    const add = (run: () => Promise<unknown>) => {
      queue.push(run);
      return pipe;
    };

    const pipe: RedisPipeline = {
      decr: (key) => add(() => this.decr(key)),
      del: (...keys) => add(() => this.del(...keys)),
      exec: async () => {
        const results: [Error | null, unknown][] = [];
        for (const run of queue.splice(0)) {
          try {
            results.push([null, await run()]);
          } catch (error) {
            results.push([error as Error, null]);
          }
        }
        return results;
      },
      expire: (key, seconds) => add(() => this.expire(key, seconds)),
      get: (key) => add(() => this.get(key)),
      hdel: (key, ...fields) => add(() => this.hdel(key, ...fields)),
      hget: (key, field) => add(() => this.hget(key, field)),
      hgetall: (key) => add(() => this.hgetall(key)),
      hset: (key, field, value) => add(() => this.hset(key, field, value)),
      incr: (key) => add(() => this.incr(key)),
      set: (key, value, options) => add(() => this.set(key, value, options)),
      setex: (key, seconds, value) => add(() => this.setex(key, seconds, value)),
    };

    return pipe;
  }
}

/** Set to any value to keep the Worker on in-memory fallbacks even though `DB` is bound. */
export const isD1RedisDisabledByEnv = () => !!process.env.DISABLE_D1_REDIS;

/**
 * The D1 database the store should use, or `null` outside a Worker, when the `DB` binding is
 * missing, or when `DISABLE_D1_REDIS` is set.
 */
export const getD1RedisDatabase = (): D1DatabaseLike | null => {
  if (isD1RedisDisabledByEnv()) return null;
  return (getCfEnv()?.DB as D1DatabaseLike | undefined) ?? null;
};
