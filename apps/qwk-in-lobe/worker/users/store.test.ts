// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const onConflictDoUpdate = vi.fn();
  const values = vi.fn(() => ({ onConflictDoUpdate }));
  const insert = vi.fn(() => ({ values }));
  return { env: { DB: {} } as Record<string, unknown> | undefined, insert, onConflictDoUpdate, values };
});

vi.mock('../cf/env', () => ({ getCfEnv: () => mocks.env }));
vi.mock('../qwksearch/db', () => ({ getQwkDB: () => ({ insert: mocks.insert }) }));

const { __resetRecordedUsers, recordUser } = await import('./store');

const HOUR = 60 * 60 * 1000;

describe('recordUser', () => {
  beforeEach(() => {
    __resetRecordedUsers();
    mocks.env = { DB: {} };
    mocks.insert.mockClear();
    mocks.values.mockClear();
    mocks.onConflictDoUpdate.mockReset().mockResolvedValue(undefined);
  });

  it('upserts the user as a guest, then at most once an hour', async () => {
    await recordUser('guest_a', 0);
    await recordUser('guest_a', HOUR / 2);
    expect(mocks.insert).toHaveBeenCalledOnce();
    expect(mocks.values).toHaveBeenCalledWith({ id: 'guest_a', kind: 'guest' });

    await recordUser('guest_a', HOUR + 1);
    expect(mocks.insert).toHaveBeenCalledTimes(2);
  });

  it('swallows a failed write and retries on the next request', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.onConflictDoUpdate.mockRejectedValueOnce(new Error('D1_ERROR: no such table: lobe_users'));

    await expect(recordUser('guest_b', 0)).resolves.toBeUndefined();
    expect(error.mock.calls[0]?.[0]).toContain('0004_lobe_users.sql');

    await recordUser('guest_b', 1);
    expect(mocks.insert).toHaveBeenCalledTimes(2);
    error.mockRestore();
  });

  it('does nothing without a D1 binding', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.env = {};

    await recordUser('guest_c', 0);
    await recordUser('guest_d', 0);
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledOnce();
    error.mockRestore();
  });
});
