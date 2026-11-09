// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const MIGRATIONS_DIR = path.resolve(__dirname, '../../migrations/d1');

// Vite's `?raw` suffix is a bundler feature; in the test, read the files.
vi.mock('../../migrations/d1/0001_qwksearch_tables.sql?raw', () => ({
  default: readFileSync(path.join(MIGRATIONS_DIR, '0001_qwksearch_tables.sql'), 'utf8'),
}));
vi.mock('../../migrations/d1/0002_extraction_settings.sql?raw', () => ({
  default: readFileSync(path.join(MIGRATIONS_DIR, '0002_extraction_settings.sql'), 'utf8'),
}));
vi.mock('../../migrations/d1/0003_search_settings.sql?raw', () => ({
  default: readFileSync(path.join(MIGRATIONS_DIR, '0003_search_settings.sql'), 'utf8'),
}));
vi.mock('../../migrations/d1/0004_lobe_users.sql?raw', () => ({
  default: readFileSync(path.join(MIGRATIONS_DIR, '0004_lobe_users.sql'), 'utf8'),
}));
vi.mock('../../migrations/d1/0005_lobehub_tables.sql?raw', () => ({
  default: readFileSync(path.join(MIGRATIONS_DIR, '0005_lobehub_tables.sql'), 'utf8'),
}));
vi.mock('../../migrations/d1/0006_instance_secrets.sql?raw', () => ({
  default: readFileSync(path.join(MIGRATIONS_DIR, '0006_instance_secrets.sql'), 'utf8'),
}));
vi.mock('../../migrations/d1/0007_kv_store.sql?raw', () => ({
  default: readFileSync(path.join(MIGRATIONS_DIR, '0007_kv_store.sql'), 'utf8'),
}));

const mocks = vi.hoisted(() => ({ env: undefined as Record<string, unknown> | undefined }));
vi.mock('./env', () => ({ getCfEnv: () => mocks.env }));

const { __resetD1Schema, applyMigrations, D1_MIGRATIONS, ensureD1Schema, splitStatements } =
  await import('./d1Schema');

/** Records what reaches D1; `failBatch` makes the next batch throw. */
const createFakeD1 = (applied: string[] = []) => {
  const executed: string[] = [];
  const recorded = new Set(applied);
  let failBatch = false;
  const prepare = (sql: string) => {
    let params: unknown[] = [];
    const statement = {
      all: async () => ({ results: [...recorded].map((name) => ({ name })) }),
      bind: (...args: unknown[]) => {
        params = args;
        return statement;
      },
      run: async () => {
        if (/INSERT OR IGNORE INTO lobe_schema_migrations/.test(sql))
          recorded.add(params[0] as string);
        return {};
      },
      sql,
    };
    return statement;
  };
  const db = {
    batch: async (statements: { sql: string }[]) => {
      if (failBatch) {
        failBatch = false;
        throw new Error('D1_ERROR: overloaded');
      }
      executed.push(...statements.map((s) => s.sql));
      return [];
    },
    prepare,
  } as unknown as D1Database;
  return {
    db,
    executed,
    failNextBatch: () => {
      failBatch = true;
    },
    recorded,
  };
};

describe('D1_MIGRATIONS', () => {
  it('lists every file in migrations/d1, in order', () => {
    const files = readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort()
      .map((f) => f.replace(/\.sql$/, ''));
    expect(D1_MIGRATIONS.map((m) => m.name)).toEqual(files);
  });

  it('holds only idempotent CREATE … IF NOT EXISTS statements', () => {
    for (const { name, sql } of D1_MIGRATIONS) {
      const statements = splitStatements(sql);
      expect(statements.length, name).toBeGreaterThan(0);
      for (const statement of statements) {
        expect(statement, name).toMatch(/^CREATE\s+(?:UNIQUE\s+)?(?:TABLE|INDEX)\s+IF NOT EXISTS/i);
      }
    }
  });

  it('creates the users table LobeHub writes first', () => {
    const all = D1_MIGRATIONS.flatMap((m) => splitStatements(m.sql));
    expect(all.some((s) => s.startsWith('CREATE TABLE IF NOT EXISTS "users"'))).toBe(true);
  });
});

describe('splitStatements', () => {
  it('drops comment lines and splits at line-ending semicolons', () => {
    expect(
      splitStatements(
        `-- a; comment;\nCREATE TABLE a (x TEXT DEFAULT 'a;b');\n\nCREATE INDEX i ON a (x);`,
      ),
    ).toEqual([`CREATE TABLE a (x TEXT DEFAULT 'a;b')`, 'CREATE INDEX i ON a (x)']);
  });
});

describe('applyMigrations', () => {
  it('applies every migration on an empty database and records it', async () => {
    const fake = createFakeD1();
    const ran = await applyMigrations(fake.db);

    expect(ran).toEqual(D1_MIGRATIONS.map((m) => m.name));
    expect(fake.executed.length).toBe(
      D1_MIGRATIONS.reduce((n, m) => n + splitStatements(m.sql).length, 0),
    );
    expect([...fake.recorded]).toEqual(D1_MIGRATIONS.map((m) => m.name));
  });

  it('skips the migrations already recorded', async () => {
    const fake = createFakeD1(D1_MIGRATIONS.slice(0, -1).map((m) => m.name));
    const last = D1_MIGRATIONS.at(-1)!;
    expect(await applyMigrations(fake.db)).toEqual([last.name]);
    expect(fake.executed).toHaveLength(splitStatements(last.sql).length);
  });
});

describe('ensureD1Schema', () => {
  const saved = process.env.DATABASE_DRIVER;

  beforeEach(() => {
    __resetD1Schema();
    process.env.DATABASE_DRIVER = 'd1';
  });
  afterEach(() => {
    if (saved === undefined) delete process.env.DATABASE_DRIVER;
    else process.env.DATABASE_DRIVER = saved;
  });

  it('runs once per isolate', async () => {
    const fake = createFakeD1();
    mocks.env = { DB: fake.db };
    const log = vi.spyOn(console, 'info').mockImplementation(() => {});

    await ensureD1Schema();
    const count = fake.executed.length;
    await ensureD1Schema();
    expect(fake.executed.length).toBe(count);
    log.mockRestore();
  });

  it('does nothing when LobeHub runs on Postgres', async () => {
    const fake = createFakeD1();
    mocks.env = { DB: fake.db };
    process.env.DATABASE_DRIVER = 'neon';

    await ensureD1Schema();
    expect(fake.executed).toHaveLength(0);
  });

  it('logs a failure and retries on the next request', async () => {
    const fake = createFakeD1();
    mocks.env = { DB: fake.db };
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const log = vi.spyOn(console, 'info').mockImplementation(() => {});
    fake.failNextBatch();

    await ensureD1Schema();
    expect(error).toHaveBeenCalledWith(expect.stringContaining('D1_ERROR: overloaded'));
    expect(fake.recorded.size).toBe(0);

    await ensureD1Schema();
    expect([...fake.recorded]).toEqual(D1_MIGRATIONS.map((m) => m.name));
    error.mockRestore();
    log.mockRestore();
  });
});
