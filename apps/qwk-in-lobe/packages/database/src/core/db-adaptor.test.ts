import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { LobeChatDatabase } from '../type';

const getDBInstance = vi.hoisted(() => vi.fn());

vi.mock('./web-server', () => ({ getDBInstance }));

/** Re-evaluate the module so each test starts before the instance is cached. */
const loadAdaptor = async () => {
  vi.resetModules();
  return import('./db-adaptor');
};

const createFakeDB = () => ({
  marker: 'real instance',
  select() {
    return this.marker;
  },
});

describe('serverDB', () => {
  beforeEach(() => {
    getDBInstance.mockReset();
    getDBInstance.mockImplementation(() => createFakeDB() as unknown as LobeChatDatabase);
  });

  it('does not build a database just because a module imported it', async () => {
    await loadAdaptor();

    expect(getDBInstance).not.toHaveBeenCalled();
  });

  it('builds the instance once, on first use, and caches it', async () => {
    const { serverDB } = await loadAdaptor();

    expect(serverDB.select()).toBe('real instance');
    expect((serverDB as unknown as { marker: string }).marker).toBe('real instance');
    expect(getDBInstance).toHaveBeenCalledTimes(1);
  });

  it('shares that one instance with getServerDB()', async () => {
    const { getServerDB, serverDB } = await loadAdaptor();

    const first = await getServerDB();

    expect(serverDB.select()).toBe('real instance');
    expect(await getServerDB()).toBe(first);
    expect(getDBInstance).toHaveBeenCalledTimes(1);
  });

  it('reports the failure on use rather than on import', async () => {
    const error = new Error('`KEY_VAULTS_SECRET` is not set');
    getDBInstance.mockImplementation(() => {
      throw error;
    });
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Importing is what `next build` does to collect a route's page data.
    const { getServerDB, serverDB } = await loadAdaptor();

    expect(() => serverDB.select).toThrow(error);
    await expect(getServerDB()).rejects.toThrow(error);

    consoleError.mockRestore();
  });
});
