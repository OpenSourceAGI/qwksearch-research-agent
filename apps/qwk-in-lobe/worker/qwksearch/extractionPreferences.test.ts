// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * A one-row stand-in for the `extraction_settings` table.
 *
 * The module makes exactly three shapes of call — a select ending in `.limit(1)`,
 * an upsert, and a delete — so the fake reproduces those chains rather than
 * drizzle's full builder.
 */
let stored: Record<string, unknown> | undefined;
let readError: Error | undefined;

const db = {
  delete: () => ({
    where: async () => {
      stored = undefined;
    },
  }),
  insert: () => ({
    values: (row: { overrides: unknown }) => ({
      onConflictDoUpdate: async () => {
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

const getUserId = vi.fn(async (_headers: Headers): Promise<null | string> => 'user_1');

vi.mock('./db', () => ({ getQwkDB: () => db }));
vi.mock('./session', () => ({ getUserId: (headers: Headers) => getUserId(headers) }));

const {
  clearUserExtractionOverrides,
  loadUserExtractionOverrides,
  saveUserExtractionOverrides,
  userExtractionOverridesForRequest,
} = await import('./extractionPreferences');

beforeEach(() => {
  stored = undefined;
  readError = undefined;
  getUserId.mockClear();
  getUserId.mockResolvedValue('user_1');
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('saveUserExtractionOverrides', () => {
  it('stores only the values that survive validation', async () => {
    const saved = await saveUserExtractionOverrides('user_1', {
      citationStyle: 'MLA',
      languages: 'pt-BR, klingon, ja',
      pdfProcessor: 'nonsense',
      scraperUrl: 'https://evil.example.com',
      timeoutSeconds: 900,
      useThirdPartyBackup: 'yes',
    });

    expect(saved).toEqual({
      citationStyle: 'mla',
      languages: ['pt-br', 'ja'],
      timeoutSeconds: 60,
      useThirdPartyBackup: true,
    });
    // A host the user tried to smuggle in never reaches storage.
    expect(saved).not.toHaveProperty('scraperUrl');
    expect(stored?.overrides).toEqual(saved);
  });

  it('accepts an empty body as "no overrides"', async () => {
    await expect(saveUserExtractionOverrides('user_1', {})).resolves.toEqual({});
  });

  it('replaces rather than merges, so a field can be cleared', async () => {
    await saveUserExtractionOverrides('user_1', { citationStyle: 'mla', timeoutSeconds: 30 });
    const saved = await saveUserExtractionOverrides('user_1', { timeoutSeconds: 30 });

    expect(saved).toEqual({ timeoutSeconds: 30 });
  });
});

describe('loadUserExtractionOverrides', () => {
  it('returns {} when the user has no row', async () => {
    await expect(loadUserExtractionOverrides('user_1')).resolves.toEqual({});
  });

  it('reads back what was stored', async () => {
    await saveUserExtractionOverrides('user_1', { citationStyle: 'chicago', tiers: 'qwksearch' });
    await expect(loadUserExtractionOverrides('user_1')).resolves.toEqual({
      citationStyle: 'chicago',
      tiers: ['qwksearch'],
    });
  });

  it('parses a row whose JSON column came back as a string', async () => {
    stored = { overrides: JSON.stringify({ citationStyle: 'mla' }), userId: 'user_1' };
    await expect(loadUserExtractionOverrides('user_1')).resolves.toEqual({ citationStyle: 'mla' });
  });

  it('re-validates on read, so a stale row cannot reach the chain', async () => {
    stored = { overrides: { citationStyle: 'harvard', scraperUrl: 'https://evil.example.com' } };
    await expect(loadUserExtractionOverrides('user_1')).resolves.toEqual({});
  });

  it('falls back to {} rather than throwing when the row is unreadable', async () => {
    stored = { overrides: '{not json' };
    await expect(loadUserExtractionOverrides('user_1')).resolves.toEqual({});
  });

  it('falls back to {} when the database itself fails', async () => {
    readError = new Error('D1 unavailable');
    await expect(loadUserExtractionOverrides('user_1')).resolves.toEqual({});
  });
});

describe('clearUserExtractionOverrides', () => {
  it('drops the row', async () => {
    await saveUserExtractionOverrides('user_1', { citationStyle: 'mla' });
    await clearUserExtractionOverrides('user_1');
    await expect(loadUserExtractionOverrides('user_1')).resolves.toEqual({});
  });
});

describe('userExtractionOverridesForRequest', () => {
  it('skips the session lookup entirely when the request carries no cookie', async () => {
    await expect(userExtractionOverridesForRequest(new Headers())).resolves.toEqual({});
    expect(getUserId).not.toHaveBeenCalled();
  });

  it('returns {} for a cookie that resolves to no session', async () => {
    getUserId.mockResolvedValue(null);
    const headers = new Headers({ cookie: 'other=1' });

    await expect(userExtractionOverridesForRequest(headers)).resolves.toEqual({});
    expect(getUserId).toHaveBeenCalled();
  });

  it('loads the signed-in user’s overrides', async () => {
    await saveUserExtractionOverrides('user_1', { citationStyle: 'mla' });
    const headers = new Headers({ cookie: 'better-auth.session_token=abc' });

    await expect(userExtractionOverridesForRequest(headers)).resolves.toEqual({
      citationStyle: 'mla',
    });
  });
});
