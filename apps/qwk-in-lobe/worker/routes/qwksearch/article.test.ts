// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { extractionSettings } from '../../qwksearch/schema';

/**
 * A cached row and the drizzle chain the GET handler walks over it.
 *
 * Three selects reach this fake now: the article row (no field list, ends in
 * `.limit(1)`), the Q&A history (a field list, awaited directly), and the
 * signed-in user's extraction overrides — told apart from the article select by
 * the table it reads.
 */
let cachedRow: Record<string, unknown> | undefined;
let overridesRow: Record<string, unknown> | undefined;

const db = {
  insert: () => ({ values: async () => undefined }),
  select: (fields?: unknown) => ({
    from: (table: unknown) => ({
      where: () => {
        if (fields) return Promise.resolve([]);
        const rows = table === extractionSettings ? overridesRow : cachedRow;
        return { limit: async () => (rows ? [rows] : []) };
      },
    }),
  }),
  update: () => ({ set: () => ({ where: async () => undefined }) }),
};

/** The signed-in user, or `null` for an anonymous request. */
let userId: null | string = null;

vi.mock('../../qwksearch/db', () => ({ getQwkDB: () => db }));
vi.mock('../../qwksearch/session', () => ({
  getUserId: async () => userId,
  requireUserId: async () => userId,
  UnauthorizedError: class UnauthorizedError extends Error {},
  unauthorizedResponse: () => Response.json({ message: 'Authentication required' }, { status: 401 }),
}));

const { articleApp, restyleCite } = await import('./article');

/** Anonymous by default; `signedIn` adds the cookie the user layer looks for. */
const get = (query: string, signedIn = false) =>
  articleApp.request(
    `/api/doc/article?${query}`,
    signedIn ? { headers: { cookie: 'better-auth.session_token=abc' } } : undefined,
  );

const row = {
  author: 'Ada Lovelace',
  author_cite: 'Lovelace, A.',
  author_short: 'Lovelace',
  author_type: 'single',
  cite: 'Lovelace, A. (1990, Oct 1). <b>Notes</b>. <i>example.com</i>.',
  date: '1990-10-01',
  followUpQuestions: [],
  html: '<p>body</p>',
  source: 'example.com',
  title: 'Notes',
  url: 'https://example.com/notes',
  word_count: 2,
};

beforeEach(() => {
  cachedRow = { ...row };
  overridesRow = undefined;
  userId = null;
});

describe('restyleCite', () => {
  it('keeps the stored citation for APA', () => {
    expect(restyleCite({ ...row, url: row.url }, 'apa').cite).toBe(row.cite);
  });

  it('rebuilds the citation from the cached columns for another style', () => {
    const cite = restyleCite({ ...row, url: row.url }, 'mla').cite;
    expect(cite).toContain('Lovelace, A. "<b>Notes</b>."');
    expect(cite).toContain('1 Oct. 1990');
  });
});

describe('GET /api/doc/article', () => {
  it('serves the cached article with its stored citation by default', async () => {
    const body = (await (await get('url=https://example.com/notes')).json()) as {
      article: { cite: string };
      cached: boolean;
    };
    expect(body.cached).toBe(true);
    expect(body.article.cite).toBe(row.cite);
  });

  it('honours ?cite= on a cache hit rather than fragmenting the cache', async () => {
    const body = (await (await get('url=https://example.com/notes&cite=chicago')).json()) as {
      article: { cite: string };
    };
    expect(body.article.cite).toContain('October 1, 1990');
  });

  it('ignores an unrecognised ?cite= instead of failing the request', async () => {
    const res = await get('url=https://example.com/notes&cite=harvard');
    const body = (await res.json()) as { article: { cite: string } };
    expect(res.status).toBe(200);
    expect(body.article.cite).toBe(row.cite);
  });

  it('still refuses a url the chain cannot extract', async () => {
    expect((await get('url=https://www.google.com/search?q=x')).status).toBe(400);
  });

  it('requires a url', async () => {
    expect((await articleApp.request('/api/doc/article')).status).toBe(400);
  });
});

describe('GET /api/doc/article — the signed-in user layer', () => {
  const cite = (body: unknown) => (body as { article: { cite: string } }).article.cite;

  it('applies the citation style the user saved', async () => {
    userId = 'user_1';
    overridesRow = { overrides: { citationStyle: 'chicago' }, userId };

    const body = await (await get('url=https://example.com/notes', true)).json();
    expect(cite(body)).toContain('October 1, 1990');
  });

  it('lets an explicit ?cite= win over the saved preference', async () => {
    userId = 'user_1';
    overridesRow = { overrides: { citationStyle: 'chicago' }, userId };

    const body = await (await get('url=https://example.com/notes&cite=mla', true)).json();
    expect(cite(body)).toContain('1 Oct. 1990');
  });

  it('leaves an anonymous request on the operator configuration', async () => {
    // A row exists, but no cookie means no session lookup and no user layer.
    overridesRow = { overrides: { citationStyle: 'chicago' }, userId: 'user_1' };

    const body = await (await get('url=https://example.com/notes')).json();
    expect(cite(body)).toBe(row.cite);
  });

  it('serves the article on the operator configuration when the row is unreadable', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    userId = 'user_1';
    overridesRow = { overrides: '{not json', userId };

    const res = await get('url=https://example.com/notes', true);
    expect(res.status).toBe(200);
    expect(cite(await res.json())).toBe(row.cite);
  });
});
