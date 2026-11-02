// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getServerDB: vi.fn(),
  makeSureUserExist: vi.fn(),
}));

vi.mock('@/database/core/db-adaptor', () => ({ getServerDB: mocks.getServerDB }));
vi.mock('@/database/models/user', () => ({
  UserModel: { makeSureUserExist: mocks.makeSureUserExist },
}));

describe('LocalUser', () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.getServerDB.mockReset().mockResolvedValue({ db: true });
    mocks.makeSureUserExist.mockReset().mockResolvedValue(undefined);
  });

  it('creates the local user row once and returns its id', async () => {
    const { getLocalUserId, LOCAL_USER_ID } = await import('./index');

    expect(await getLocalUserId()).toBe(LOCAL_USER_ID);
    expect(await getLocalUserId()).toBe(LOCAL_USER_ID);

    expect(mocks.makeSureUserExist).toHaveBeenCalledOnce();
    expect(mocks.makeSureUserExist).toHaveBeenCalledWith({ db: true }, LOCAL_USER_ID);
  });

  it('retries after a failed insert', async () => {
    const { getLocalUserId } = await import('./index');
    mocks.makeSureUserExist.mockRejectedValueOnce(new Error('db down'));

    await expect(getLocalUserId()).rejects.toThrow('db down');
    await expect(getLocalUserId()).resolves.toBe('qwk-local-user');
    expect(mocks.makeSureUserExist).toHaveBeenCalledTimes(2);
  });

  describe('with a request-user resolver (the Worker)', () => {
    it("runs as the resolver's user and makes that user's row once", async () => {
      const { getLocalUserId, setRequestUserResolver } = await import('./index');
      setRequestUserResolver(async () => 'guest_a');

      try {
        expect(await getLocalUserId()).toBe('guest_a');
        expect(await getLocalUserId()).toBe('guest_a');
        expect(mocks.makeSureUserExist).toHaveBeenCalledOnce();
        expect(mocks.makeSureUserExist).toHaveBeenCalledWith({ db: true }, 'guest_a');
      } finally {
        setRequestUserResolver(undefined);
      }
    });

    it('keeps users apart', async () => {
      const { getLocalUserId, setRequestUserResolver } = await import('./index');
      let current = 'guest_a';
      setRequestUserResolver(() => current);

      try {
        expect(await getLocalUserId()).toBe('guest_a');
        current = 'guest_b';
        expect(await getLocalUserId()).toBe('guest_b');
        expect(mocks.makeSureUserExist).toHaveBeenCalledTimes(2);
      } finally {
        setRequestUserResolver(undefined);
      }
    });

    it('falls back to the local user when the resolver has no visitor', async () => {
      const { getLocalUserId, LOCAL_USER_ID, setRequestUserResolver } = await import('./index');
      setRequestUserResolver(() => undefined);

      try {
        expect(await getLocalUserId()).toBe(LOCAL_USER_ID);
      } finally {
        setRequestUserResolver(undefined);
      }
    });
  });
});
