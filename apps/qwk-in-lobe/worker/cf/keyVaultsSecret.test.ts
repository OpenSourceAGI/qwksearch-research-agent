// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** A tiny in-memory stand-in for the statements keyVaultsSecret runs on D1. */
const createFakeD1 = () => {
  const rows = new Map<string, string>();
  const calls: string[] = [];
  const prepare = (sql: string) => {
    let params: unknown[] = [];
    const statement = {
      bind: (...args: unknown[]) => {
        params = args;
        return statement;
      },
      first: async () => {
        calls.push(sql);
        const value = rows.get(params[0] as string);
        return value === undefined ? null : { value };
      },
      run: async () => {
        calls.push(sql);
        if (/INSERT OR IGNORE/.test(sql) && !rows.has(params[0] as string))
          rows.set(params[0] as string, params[1] as string);
        return {};
      },
    };
    return statement;
  };
  return { calls, db: { prepare } as unknown as D1Database, rows };
};

const mocks = vi.hoisted(() => ({ env: undefined as Record<string, unknown> | undefined }));
vi.mock('./env', () => ({ getCfEnv: () => mocks.env }));

const { __resetKeyVaultsSecret, ensureKeyVaultsSecret, generateSecret, loadOrCreateSecret } =
  await import('./keyVaultsSecret');

const ENV_KEYS = ['KEY_VAULTS_SECRET', 'DATABASE_DRIVER', 'DATABASE_URL'] as const;
const saved: Record<string, string | undefined> = {};

describe('ensureKeyVaultsSecret', () => {
  beforeEach(() => {
    __resetKeyVaultsSecret();
    for (const key of ENV_KEYS) {
      saved[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  });

  it('generates a 32-byte secret once, stores it in D1 and publishes it on process.env', async () => {
    const fake = createFakeD1();
    mocks.env = { DB: fake.db };
    process.env.DATABASE_DRIVER = 'd1';

    await ensureKeyVaultsSecret();

    const secret = process.env.KEY_VAULTS_SECRET!;
    expect(Buffer.from(secret, 'base64')).toHaveLength(32);
    expect(fake.rows.get('KEY_VAULTS_SECRET')).toBe(secret);
  });

  it('reuses the secret another isolate already stored', async () => {
    const fake = createFakeD1();
    fake.rows.set('KEY_VAULTS_SECRET', 'existing-secret');
    mocks.env = { DB: fake.db };
    process.env.DATABASE_DRIVER = 'd1';

    await ensureKeyVaultsSecret();
    expect(process.env.KEY_VAULTS_SECRET).toBe('existing-secret');
  });

  it('leaves an operator-set secret alone and never touches D1', async () => {
    const fake = createFakeD1();
    mocks.env = { DB: fake.db };
    process.env.DATABASE_DRIVER = 'd1';
    process.env.KEY_VAULTS_SECRET = 'operator-secret';

    await ensureKeyVaultsSecret();
    expect(process.env.KEY_VAULTS_SECRET).toBe('operator-secret');
    expect(fake.calls).toHaveLength(0);
  });

  it('does nothing when LobeHub runs on Postgres', async () => {
    const fake = createFakeD1();
    mocks.env = { DB: fake.db };
    process.env.DATABASE_DRIVER = 'neon';
    process.env.DATABASE_URL = 'postgres://example';

    await ensureKeyVaultsSecret();
    expect(process.env.KEY_VAULTS_SECRET).toBeUndefined();
    expect(fake.calls).toHaveLength(0);
  });

  it('logs and retries on the next request when D1 fails', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const fake = createFakeD1();
    const failing = {
      prepare: () => {
        throw new Error('D1_ERROR: unavailable');
      },
    } as unknown as D1Database;
    mocks.env = { DB: failing };
    process.env.DATABASE_DRIVER = 'd1';

    await ensureKeyVaultsSecret();
    expect(process.env.KEY_VAULTS_SECRET).toBeUndefined();
    expect(error).toHaveBeenCalledWith(expect.stringContaining('D1_ERROR: unavailable'));

    mocks.env = { DB: fake.db };
    await ensureKeyVaultsSecret();
    expect(process.env.KEY_VAULTS_SECRET).toBe(fake.rows.get('KEY_VAULTS_SECRET'));
    error.mockRestore();
  });
});

describe('helpers', () => {
  it('generateSecret returns distinct 256-bit base64 keys', () => {
    const a = generateSecret();
    expect(Buffer.from(a, 'base64')).toHaveLength(32);
    expect(generateSecret()).not.toBe(a);
  });

  it('loadOrCreateSecret creates the table before writing', async () => {
    const fake = createFakeD1();
    await loadOrCreateSecret(fake.db, 'X');
    expect(fake.calls[0]).toMatch(/CREATE TABLE IF NOT EXISTS lobe_instance_secrets/);
  });
});
