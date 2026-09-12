// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The route runs against the real `searchPreferences` and `searchSettings`
 * modules — only D1 and the session lookup are faked, so the validation the
 * route relies on is genuinely exercised.
 *
 * The search-side twin of `extractionSettings.test.ts`. The one structural
 * difference: the storage lives under `@/server/*` rather than `worker/`, so the
 * D1 fake is installed through that module's test hook instead of by mocking
 * `../../qwksearch/db`.
 */
let stored: Record<string, unknown> | undefined;

const db = {
  delete: () => ({
    where: async () => {
      stored = undefined;
    },
  }),
  insert: () => ({
    values: (row: Record<string, unknown>) => ({
      onConflictDoUpdate: async () => {
        stored = row;
      },
    }),
  }),
  select: () => ({
    from: () => ({ where: () => ({ limit: async () => (stored ? [stored] : []) }) }),
  }),
};

class UnauthorizedError extends Error {}
let userId: null | string = 'user_1';

vi.mock('../../qwksearch/session', () => ({
  getUserId: async () => userId,
  requireUserId: async () => {
    if (!userId) throw new UnauthorizedError();
    return userId;
  },
  UnauthorizedError,
  unauthorizedResponse: () =>
    Response.json({ message: 'Authentication required' }, { status: 401 }),
}));

const { __setSearchPreferencesDBForTests } =
  await import('@/server/services/search/impls/qwksearch/searchPreferences');
const { searchSettingsApp } = await import('./searchSettings');

const PATH = 'http://localhost/api/doc/search-settings';

const call = (init?: RequestInit) => searchSettingsApp.request(PATH, init);

const put = (body: unknown) =>
  call({
    body: typeof body === 'string' ? body : JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
    method: 'PUT',
  });

/** The three-part response every verb returns; see the route's module comment. */
interface SettingsResponse {
  effective: {
    categories: string[];
    configured: { apiKey: boolean; endpoint: boolean };
    language: string;
    maxCategories: number;
    publicInstances: boolean;
    resultLimit: null | number;
    safeSearch: boolean;
    timeRange: null | string;
  };
  options: {
    categories: string[];
    maxMaxCategories: number;
    maxResultLimit: number;
    minMaxCategories: number;
    minResultLimit: number;
    timeRanges: string[];
  };
  overrides: Record<string, unknown>;
}

const SEARCH_ENV = [
  'QWKSEARCH_API_KEY',
  'QWKSEARCH_SEARCH_CATEGORIES',
  'QWKSEARCH_SEARCH_LANGUAGE',
  'QWKSEARCH_SEARCH_MAX_CATEGORIES',
  'QWKSEARCH_SEARCH_SAFE',
  'QWKSEARCH_SEARCH_URL',
];

beforeEach(() => {
  stored = undefined;
  userId = 'user_1';
  __setSearchPreferencesDBForTests(db as never);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  for (const key of SEARCH_ENV) delete process.env[key];
});

describe('GET /api/doc/search-settings', () => {
  it('returns empty overrides and the shipped defaults for a new user', async () => {
    const response = await call();
    expect(response.status).toBe(200);

    const body = (await response.json()) as SettingsResponse;
    expect(body.overrides).toEqual({});
    expect(body.effective.categories).toEqual(['general']);
    expect(body.effective.language).toBe('en-US');
    expect(body.effective.maxCategories).toBe(3);
    expect(body.effective.timeRange).toBeNull();
  });

  it('folds the operator environment into what is in force', async () => {
    process.env.QWKSEARCH_SEARCH_LANGUAGE = 'de-DE';
    process.env.QWKSEARCH_SEARCH_MAX_CATEGORIES = '5';

    const body = (await (await call()).json()) as SettingsResponse;

    // Still nothing stored for the user — this is the layer below.
    expect(body.overrides).toEqual({});
    expect(body.effective.language).toBe('de-DE');
    expect(body.effective.maxCategories).toBe(5);
  });

  it('reduces the endpoint and the API key to presence flags', async () => {
    process.env.QWKSEARCH_API_KEY = 'sk-secret';
    process.env.QWKSEARCH_SEARCH_URL = 'https://internal.example/api/agent/search';

    const raw = await (await call()).text();

    expect(raw).not.toContain('sk-secret');
    expect(raw).not.toContain('internal.example');
    expect((JSON.parse(raw) as SettingsResponse).effective.configured).toEqual({
      apiKey: true,
      endpoint: true,
    });
  });

  it('ships the field metadata the pane builds its inputs from', async () => {
    const body = (await (await call()).json()) as SettingsResponse;

    expect(body.options.categories).toContain('general');
    expect(body.options.categories).toContain('social+media');
    expect(body.options.timeRanges).toEqual(['day', 'month', 'week', 'year']);
    expect(body.options.minMaxCategories).toBe(1);
    expect(body.options.maxMaxCategories).toBe(body.options.categories.length);
    expect(body.options.maxResultLimit).toBeGreaterThan(body.options.minResultLimit);
  });

  it('requires a session', async () => {
    userId = null;

    const response = await call();
    expect(response.status).toBe(401);
  });
});

describe('PUT /api/doc/search-settings', () => {
  it('stores the validated overrides and reports them as in force', async () => {
    const body = (await (
      await put({ categories: ['news', 'videos'], language: 'fr', safeSearch: true })
    ).json()) as SettingsResponse;

    expect(body.overrides).toEqual({
      categories: ['news', 'videos'],
      language: 'fr',
      safeSearch: true,
    });
    expect(body.effective.categories).toEqual(['news', 'videos']);
    expect(body.effective.safeSearch).toBe(true);
  });

  it('drops values that fail validation and says what it stored', async () => {
    const body = (await (
      await put({ categories: ['news', 'nonsense'], maxCategories: 999, timeRange: 'fortnight' })
    ).json()) as SettingsResponse;

    expect(body.overrides).toEqual({ categories: ['news'], maxCategories: 10 });
    expect(body.effective.timeRange).toBeNull();
  });

  it('refuses to store the endpoint or the API key', async () => {
    const body = (await (
      await put({ apiKey: 'sk-leaked', endpoint: 'https://attacker.example', safeSearch: true })
    ).json()) as SettingsResponse;

    expect(body.overrides).toEqual({ safeSearch: true });
    expect(JSON.stringify(stored)).not.toContain('attacker.example');
  });

  it('takes the user layer over the operator environment', async () => {
    process.env.QWKSEARCH_SEARCH_LANGUAGE = 'de-DE';

    const body = (await (await put({ language: 'fr-FR' })).json()) as SettingsResponse;

    expect(body.effective.language).toBe('fr-FR');
  });

  it('answers a malformed body with 400, not 500', async () => {
    const response = await put('{not json');

    expect(response.status).toBe(400);
  });

  it('requires a session', async () => {
    userId = null;

    expect((await put({ safeSearch: true })).status).toBe(401);
  });
});

describe('DELETE /api/doc/search-settings', () => {
  it('returns the user to the operator configuration', async () => {
    process.env.QWKSEARCH_SEARCH_LANGUAGE = 'de-DE';
    await put({ language: 'fr-FR' });

    const body = (await (await call({ method: 'DELETE' })).json()) as SettingsResponse;

    expect(body.overrides).toEqual({});
    expect(body.effective.language).toBe('de-DE');
    expect(stored).toBeUndefined();
  });

  it('requires a session', async () => {
    userId = null;

    expect((await call({ method: 'DELETE' })).status).toBe(401);
  });
});
