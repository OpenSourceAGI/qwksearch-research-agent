import { describe, expect, it, vi } from 'vitest';

vi.mock('@/envs/app', () => ({ appEnv: { APP_URL: 'https://qwksearch.com' } }));
vi.mock('@/envs/auth', () => ({ authEnv: {} }));
vi.mock('@/envs/redis', () => ({ getRedisConfig: () => ({ enabled: false }) }));
vi.mock('@/libs/redis', () => ({ initializeRedis: vi.fn(), isRedisEnabled: () => false }));
vi.mock('@/utils/env', () => ({ isDev: false }));

const { createKVSecondaryStorage } = await import('./config');

const fakeKV = () => {
  const store = new Map<string, { ttl?: number; value: string }>();
  return {
    delete: vi.fn(async (key: string) => {
      store.delete(key);
    }),
    get: vi.fn(async (key: string) => store.get(key)?.value ?? null),
    put: vi.fn(async (key: string, value: string, options?: { expirationTtl?: number }) => {
      store.set(key, { ttl: options?.expirationTtl, value });
    }),
    store,
  };
};

describe('createKVSecondaryStorage', () => {
  it('namespaces keys and round-trips values', async () => {
    const kv = fakeKV();
    const storage = createKVSecondaryStorage(kv);

    await storage.set('session:1', '{"a":1}');
    expect(kv.store.has('better-auth:session:1')).toBe(true);
    expect(await storage.get('session:1')).toBe('{"a":1}');

    await storage.delete('session:1');
    expect(await storage.get('session:1')).toBeNull();
  });

  it('clamps ttl to the KV minimum of 60 seconds', async () => {
    const kv = fakeKV();
    const storage = createKVSecondaryStorage(kv);

    await storage.set('short', 'v', 5);
    expect(kv.store.get('better-auth:short')?.ttl).toBe(60);

    await storage.set('long', 'v', 3600);
    expect(kv.store.get('better-auth:long')?.ttl).toBe(3600);
  });
});
