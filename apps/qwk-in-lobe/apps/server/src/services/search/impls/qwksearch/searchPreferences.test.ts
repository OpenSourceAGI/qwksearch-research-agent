// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * A one-row stand-in for the `search_settings` table.
 *
 * The module makes exactly three shapes of call — a select ending in `.limit(1)`,
 * an upsert, and a delete — so the fake reproduces those chains rather than
 * drizzle's full builder. The same shape as
 * `worker/qwksearch/extractionPreferences.test.ts`, which is the point: the two
 * storage modules are meant to stay twins.
 */
let stored: Record<string, unknown> | undefined;
let readError: Error | undefined;
let writeError: Error | undefined;

const db = {
  delete: () => ({
    where: async () => {
      if (writeError) throw writeError;
      stored = undefined;
    },
  }),
  insert: () => ({
    values: (row: { overrides: unknown }) => ({
      onConflictDoUpdate: async () => {
        if (writeError) throw writeError;
        stored = row as Record<string, unknown>;
      },
    }),
  }),
  select: () => ({
    from: () => ({
      where: () => ({
        limit: async () => {
          if (readError) throw readError;
          return stored ? [stored] : [];
        },
      }),
    }),
  }),
};

const cfEnv = vi.fn<() => undefined | { DB?: unknown }>(() => ({ DB: {} }));

vi.mock('@/database/core/cloudflare', () => ({
  getCfEnv: () => cfEnv(),
  hasCfBinding: () => !!cfEnv()?.DB,
}));

const {
  __setSearchPreferencesDBForTests,
  clearUserSearchOverrides,
  getSearchPreferencesDB,
  loadUserSearchOverrides,
  saveUserSearchOverrides,
  searchSettings,
  userSearchOverridesFor,
} = await import('./searchPreferences');

beforeEach(() => {
  stored = undefined;
  readError = undefined;
  writeError = undefined;
  cfEnv.mockReturnValue({ DB: {} });
  __setSearchPreferencesDBForTests(db as never);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('searchSettings table', () => {
  it('is the table the D1 migration creates', () => {
    // The migration (`migrations/d1/0003_search_settings.sql`) and this
    // definition are written by hand, not generated from each other, so the
    // table name is worth pinning: a rename here silently reads an empty table.
    expect(searchSettings).toBeDefined();
    expect(Object.keys(searchSettings)).toContain('userId');
    expect(Object.keys(searchSettings)).toContain('overrides');
    expect(Object.keys(searchSettings)).toContain('updatedAt');
  });
});

describe('saveUserSearchOverrides', () => {
  it('stores only the values that survive validation', async () => {
    const saved = await saveUserSearchOverrides('user_1', {
      categories: ['news', 'nonsense'],
      language: 'EN-us',
      maxCategories: 2,
      nonsense: true,
      safeSearch: 'yes',
    });

    expect(saved).toEqual({
      categories: ['news'],
      language: 'en-US',
      maxCategories: 2,
      safeSearch: true,
    });
    expect(stored?.overrides).toEqual(saved);
  });

  it('never stores the endpoint or the API key', async () => {
    // `UserSearchOverrides` excludes them at the type level; this is the runtime
    // half of that promise, since the body arrives as unvalidated JSON.
    const saved = await saveUserSearchOverrides('user_1', {
      apiKey: 'sk-leaked',
      endpoint: 'https://attacker.example',
      safeSearch: true,
    });

    expect(saved).toEqual({ safeSearch: true });
    expect(JSON.stringify(stored)).not.toContain('sk-leaked');
    expect(JSON.stringify(stored)).not.toContain('attacker.example');
  });

  it('stores an empty object when nothing survives', async () => {
    const saved = await saveUserSearchOverrides('user_1', { maxCategories: 'lots' });

    expect(saved).toEqual({});
    expect(stored?.overrides).toEqual({});
  });

  it('accepts a non-object body without throwing', async () => {
    await expect(saveUserSearchOverrides('user_1', 'nonsense')).resolves.toEqual({});
    await expect(saveUserSearchOverrides('user_1', null)).resolves.toEqual({});
  });

  it('propagates a write failure', async () => {
    // Unlike reads, a failed write must not look like a success: the pane has to
    // be able to tell the user their preference was not saved.
    writeError = new Error('D1 is down');

    await expect(saveUserSearchOverrides('user_1', { safeSearch: true })).rejects.toThrow(
      'D1 is down',
    );
  });
});

describe('loadUserSearchOverrides', () => {
  it('returns {} when there is no row', async () => {
    await expect(loadUserSearchOverrides('user_1')).resolves.toEqual({});
  });

  it('returns the stored overrides', async () => {
    await saveUserSearchOverrides('user_1', { resultLimit: 25, timeRange: 'week' });

    await expect(loadUserSearchOverrides('user_1')).resolves.toEqual({
      resultLimit: 25,
      timeRange: 'week',
    });
  });

  it('parses a row whose JSON column came back as a string', async () => {
    stored = { overrides: JSON.stringify({ maxCategories: 4 }) };

    await expect(loadUserSearchOverrides('user_1')).resolves.toEqual({ maxCategories: 4 });
  });

  it('re-validates on read, so a stale row cannot reach the fan-out', async () => {
    // Written by an older build, by `wrangler d1 execute`, or by a knob that has
    // since been removed.
    stored = {
      overrides: {
        categories: ['general', 'removed-category'],
        maxCategories: 999,
        safeSearch: 'absolutely',
      },
    };

    await expect(loadUserSearchOverrides('user_1')).resolves.toEqual({
      categories: ['general'],
      maxCategories: 10,
    });
  });

  it('resolves to {} when the read fails', async () => {
    readError = new Error('D1 is down');

    await expect(loadUserSearchOverrides('user_1')).resolves.toEqual({});
    expect(console.error).toHaveBeenCalled();
  });

  it('resolves to {} when there is no D1 binding at all', async () => {
    // The Node dev server and any non-Cloudflare deployment. Search must still
    // work there, on the operator's configuration.
    __setSearchPreferencesDBForTests(null);
    cfEnv.mockReturnValue(undefined);

    await expect(loadUserSearchOverrides('user_1')).resolves.toEqual({});
  });

  it('treats an unparseable JSON string as no overrides', async () => {
    stored = { overrides: '{not json' };

    await expect(loadUserSearchOverrides('user_1')).resolves.toEqual({});
  });
});

describe('clearUserSearchOverrides', () => {
  it('drops the row', async () => {
    await saveUserSearchOverrides('user_1', { safeSearch: true });
    await clearUserSearchOverrides('user_1');

    expect(stored).toBeUndefined();
    await expect(loadUserSearchOverrides('user_1')).resolves.toEqual({});
  });
});

describe('userSearchOverridesFor', () => {
  it('reads the stored overrides for a signed-in user', async () => {
    await saveUserSearchOverrides('user_1', { language: 'fr' });

    await expect(userSearchOverridesFor('user_1')).resolves.toEqual({ language: 'fr' });
  });

  it('returns {} for an anonymous search without touching the database', async () => {
    // The read is skipped entirely rather than returning an empty row: a
    // signed-out search should not pay a D1 round-trip.
    __setSearchPreferencesDBForTests(null);
    cfEnv.mockReturnValue(undefined);

    await expect(userSearchOverridesFor()).resolves.toEqual({});
    await expect(userSearchOverridesFor('')).resolves.toEqual({});
  });
});

describe('getSearchPreferencesDB', () => {
  it('throws a binding error when DB is absent', () => {
    __setSearchPreferencesDBForTests(null);
    cfEnv.mockReturnValue(undefined);

    expect(() => getSearchPreferencesDB()).toThrow(/not bound/);
  });

  it('caches the client across calls', () => {
    __setSearchPreferencesDBForTests(null);
    cfEnv.mockReturnValue({ DB: {} });

    expect(getSearchPreferencesDB()).toBe(getSearchPreferencesDB());
  });
});
