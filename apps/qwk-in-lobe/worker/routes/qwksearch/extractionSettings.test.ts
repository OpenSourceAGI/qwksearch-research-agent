// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The route runs against the real `extractionPreferences` and `extractSettings`
 * modules — only D1 and the session lookup are faked, so the validation the
 * route relies on is genuinely exercised.
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

vi.mock('../../qwksearch/db', () => ({ getQwkDB: () => db }));
vi.mock('../../qwksearch/session', () => ({
  getUserId: async () => userId,
  requireUserId: async () => {
    if (!userId) throw new UnauthorizedError();
    return userId;
  },
  UnauthorizedError,
  unauthorizedResponse: () => Response.json({ message: 'Authentication required' }, { status: 401 }),
}));

const { extractionSettingsApp } = await import('./extractionSettings');

const PATH = 'http://localhost/api/doc/extraction-settings';

const call = (init?: RequestInit) => extractionSettingsApp.request(PATH, init);

const put = (body: unknown) =>
  call({
    body: typeof body === 'string' ? body : JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
    method: 'PUT',
  });

/** The three-part response every verb returns; see the route's module comment. */
interface SettingsResponse {
  effective: {
    citationStyle: string;
    configured: Record<string, boolean>;
    languages: string[];
    tiers: string[];
    timeoutSeconds: number;
  };
  options: {
    citationStyles: string[];
    maxTimeoutSeconds: number;
    minTimeoutSeconds: number;
    pdfProcessors: string[];
  };
  overrides: Record<string, unknown>;
}

const settings = async (res: Response) => (await res.json()) as SettingsResponse;

beforeEach(() => {
  stored = undefined;
  userId = 'user_1';
  vi.spyOn(console, 'error').mockImplementation(() => {});
  for (const key of [
    'QWKSEARCH_CITATION_STYLE',
    'QWKSEARCH_EXTRACT_LANGUAGES',
    'QWKSEARCH_EXTRACT_TIMEOUT',
    'SCRAPER_API_KEY',
    'TAVILY_API_KEY',
    'QWKSEARCH_EXTRACT_PROXY',
  ])
    delete process.env[key];
});

describe('GET /api/doc/extraction-settings', () => {
  it('reports no overrides and the shipped defaults for a fresh user', async () => {
    const res = await call();
    expect(res.status).toBe(200);

    const json = await settings(res);
    expect(json.overrides).toEqual({});
    expect(json.effective.citationStyle).toBe('apa');
    expect(json.effective.languages).toEqual(['en']);
    expect(json.effective.tiers).toEqual(['qwksearch', 'scraper', 'tavily', 'crawler']);
  });

  it('folds the operator environment into `effective` but not into `overrides`', async () => {
    process.env.QWKSEARCH_CITATION_STYLE = 'chicago';
    process.env.QWKSEARCH_EXTRACT_TIMEOUT = '25';

    const json = await settings(await call());
    expect(json.effective.citationStyle).toBe('chicago');
    expect(json.effective.timeoutSeconds).toBe(25);
    expect(json.overrides).toEqual({});
  });

  it('shows operator hosts and keys as presence flags, never as values', async () => {
    process.env.TAVILY_API_KEY = 'tvly-secret';
    process.env.QWKSEARCH_EXTRACT_PROXY = 'https://user:pass@proxy.internal';

    const res = await call();
    const text = await res.text();
    expect(text).not.toContain('tvly-secret');
    expect(text).not.toContain('proxy.internal');

    const json = JSON.parse(text);
    expect(json.effective.configured).toEqual({
      pdfProcessorUrl: false,
      proxy: true,
      scraperApiKey: false,
      scraperUrl: true,
      tavilyApiKey: true,
    });
  });

  it('ships the enums the pane renders', async () => {
    const json = await settings(await call());
    expect(json.options.citationStyles).toEqual(['apa', 'chicago', 'mla']);
    expect(json.options.pdfProcessors).toEqual(['docling', 'frontend', 'hybrid']);
    expect(json.options).toMatchObject({ maxTimeoutSeconds: 60, minTimeoutSeconds: 1 });
  });

  it('401s an anonymous caller', async () => {
    userId = null;
    expect((await call()).status).toBe(401);
  });
});

describe('PUT /api/doc/extraction-settings', () => {
  it('stores the valid fields and echoes what was kept', async () => {
    const json = await settings(await put({ citationStyle: 'mla', languages: ['ja', 'en'] }));

    expect(json.overrides).toEqual({ citationStyle: 'mla', languages: ['ja', 'en'] });
    expect(json.effective.citationStyle).toBe('mla');
  });

  it('drops fields the user may not set', async () => {
    const json = await settings(
      await put({
        citationStyle: 'mla',
        scraperApiKey: 'stolen',
        scraperUrl: 'https://evil.example.com',
        tavilyApiKey: 'stolen',
      }),
    );

    expect(json.overrides).toEqual({ citationStyle: 'mla' });
    expect(json.effective).not.toHaveProperty('scraperUrl');
    expect(json.effective.configured.scraperApiKey).toBe(false);
  });

  it('beats the operator environment, which beats the shipped default', async () => {
    process.env.QWKSEARCH_CITATION_STYLE = 'chicago';
    const json = await settings(await put({ citationStyle: 'mla' }));
    expect(json.effective.citationStyle).toBe('mla');
  });

  it('clamps an out-of-range timeout rather than rejecting the whole body', async () => {
    const json = await settings(await put({ citationStyle: 'mla', timeoutSeconds: 9000 }));
    expect(json.overrides).toEqual({ citationStyle: 'mla', timeoutSeconds: 60 });
  });

  it('400s a body that is not JSON', async () => {
    const res = await put('not json');
    expect(res.status).toBe(400);
    expect(((await res.json()) as { message: string }).message).toContain('JSON');
  });

  it('401s an anonymous caller', async () => {
    userId = null;
    expect((await put({ citationStyle: 'mla' })).status).toBe(401);
  });
});

describe('DELETE /api/doc/extraction-settings', () => {
  it('returns the user to the operator configuration', async () => {
    await put({ citationStyle: 'mla' });
    process.env.QWKSEARCH_CITATION_STYLE = 'chicago';

    const json = await settings(await call({ method: 'DELETE' }));
    expect(json.overrides).toEqual({});
    expect(json.effective.citationStyle).toBe('chicago');
    expect(stored).toBeUndefined();
  });

  it('401s an anonymous caller', async () => {
    userId = null;
    expect((await call({ method: 'DELETE' })).status).toBe(401);
  });
});
