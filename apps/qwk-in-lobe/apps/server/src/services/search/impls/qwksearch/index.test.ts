// @vitest-environment node
import {
  DEFAULT_SEARCH_CATEGORIES,
  parseSearchProviders,
  QWKSEARCH_SEARCH_CATEGORIES,
  resolveSearchCategories,
  WebBrowsingManifest,
} from '@lobechat/builtin-tool-web-browsing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { mergeResults, normalizeCategories, QwkSearchImpl } from './index';

const createMockResponse = (body: object, ok = true, status = 200) =>
  ({
    ok,
    status,
    json: vi.fn().mockResolvedValue(body),
    text: vi.fn().mockResolvedValue(JSON.stringify(body)),
  }) as unknown as Response;

const requestedUrls = () =>
  vi.mocked(fetch).mock.calls.map(([input]) => new URL(input as URL | string));

describe('normalizeCategories', () => {
  it('defaults to general when nothing is asked for', () => {
    expect(normalizeCategories()).toEqual(['general']);
    expect(normalizeCategories([])).toEqual(['general']);
  });

  it('maps QwkSearch registry names onto the endpoint vocabulary', () => {
    expect(normalizeCategories(['academic', 'social', 'tech'])).toEqual([
      'science',
      'social+media',
      'it',
    ]);
  });

  it('deduplicates aliases that collapse onto the same category', () => {
    expect(normalizeCategories(['videos', 'video', 'Videos'])).toEqual(['videos']);
  });

  it('falls back to general when every category is unknown', () => {
    expect(normalizeCategories(['nonsense', 'also-nonsense'])).toEqual(['general']);
  });

  it('drops unknown categories but keeps the recognized ones', () => {
    expect(normalizeCategories(['nonsense', 'news'])).toEqual(['news']);
  });

  it('caps the fan-out at three categories', () => {
    expect(normalizeCategories(['general', 'news', 'images', 'videos', 'science'])).toHaveLength(3);
  });

  it('passes through every category the tool manifest advertises', () => {
    // The guard against drift between the two halves of the seam: anything the
    // manifest offers the model but this drops silently becomes `general`,
    // which is exactly the empty-page failure the enum exists to prevent.
    for (const category of QWKSEARCH_SEARCH_CATEGORIES) {
      expect(normalizeCategories([category]), category).toEqual([category]);
    }
  });
});

describe('searchCategories (tool manifest seam)', () => {
  it('parses SEARCH_PROVIDERS the same way SearchService does', () => {
    expect(parseSearchProviders('tavily,brave')).toEqual(['tavily', 'brave']);
    expect(parseSearchProviders('tavily，brave')).toEqual(['tavily', 'brave']);
    expect(parseSearchProviders('  qwksearch  ')).toEqual(['qwksearch']);
    expect(parseSearchProviders('')).toEqual([]);
  });

  it('widens the advertised enum only when qwksearch is the sole provider', () => {
    expect(resolveSearchCategories('qwksearch')).toEqual(QWKSEARCH_SEARCH_CATEGORIES);
    expect(resolveSearchCategories('QwkSearch')).toEqual(QWKSEARCH_SEARCH_CATEGORIES);

    // A second provider would be asked for categories it cannot serve.
    expect(resolveSearchCategories('qwksearch,brave')).toEqual(DEFAULT_SEARCH_CATEGORIES);
    expect(resolveSearchCategories('tavily')).toEqual(DEFAULT_SEARCH_CATEGORIES);
    expect(resolveSearchCategories('')).toEqual(DEFAULT_SEARCH_CATEGORIES);
  });

  it('never drops a category LobeHub already offered', () => {
    for (const category of DEFAULT_SEARCH_CATEGORIES) {
      expect(QWKSEARCH_SEARCH_CATEGORIES, category).toContain(category);
    }
  });

  it('reads SEARCH_PROVIDERS when called with no argument', () => {
    const original = process.env.SEARCH_PROVIDERS;
    try {
      process.env.SEARCH_PROVIDERS = 'qwksearch';
      expect(resolveSearchCategories()).toEqual(QWKSEARCH_SEARCH_CATEGORIES);

      process.env.SEARCH_PROVIDERS = 'brave';
      expect(resolveSearchCategories()).toEqual(DEFAULT_SEARCH_CATEGORIES);
    } finally {
      if (original === undefined) delete process.env.SEARCH_PROVIDERS;
      else process.env.SEARCH_PROVIDERS = original;
    }
  });

  it('falls back to the defaults where there is no process at all', () => {
    // The manifest is imported by the SPA too, where reading `process.env`
    // directly would throw rather than yield undefined.
    const globals = globalThis as { process?: unknown };
    const saved = globals.process;
    try {
      delete globals.process;
      expect(resolveSearchCategories()).toEqual(DEFAULT_SEARCH_CATEGORIES);
    } finally {
      globals.process = saved;
    }
  });

  it('is what the manifest actually hands the model', () => {
    const search = WebBrowsingManifest.api.find((api) => api.name === 'search');
    const properties = search?.parameters?.properties as Record<
      string,
      { items?: { enum?: string[] } }
    >;

    // Resolved at module evaluation, so this is whatever the env said then.
    expect(properties?.searchCategories?.items?.enum).toEqual(
      resolveSearchCategories(process.env.SEARCH_PROVIDERS ?? ''),
    );
  });
});

describe('mergeResults', () => {
  const result = (url: string, score: number, engines: string[], content = 'c') => ({
    content,
    engines,
    parsedUrl: 'example.com',
    score,
    title: url,
    url,
  });

  it('unions engines and keeps the highest score for a duplicated url', () => {
    const merged = mergeResults([
      [result('https://a.com', 0.4, ['google'])],
      [result('https://a.com', 0.9, ['bing'])],
    ]);

    expect(merged).toHaveLength(1);
    expect(merged[0].score).toBe(0.9);
    expect(merged[0].engines.sort()).toEqual(['bing', 'google']);
  });

  it('backfills a missing snippet from the duplicate copy', () => {
    const merged = mergeResults([
      [result('https://a.com', 0.9, ['google'], '')],
      [result('https://a.com', 0.1, ['bing'], 'the snippet')],
    ]);

    expect(merged[0].content).toBe('the snippet');
  });

  it('sorts by descending score', () => {
    const merged = mergeResults([
      [result('https://a.com', 0.2, ['g']), result('https://b.com', 0.8, ['g'])],
    ]);

    expect(merged.map((r) => r.url)).toEqual(['https://b.com', 'https://a.com']);
  });

  it('does not mutate the input lists when merging', () => {
    const first = [result('https://a.com', 0.4, ['google'])];
    mergeResults([first, [result('https://a.com', 0.9, ['bing'])]]);

    expect(first[0].engines).toEqual(['google']);
    expect(first[0].score).toBe(0.4);
  });
});

describe('QwkSearchImpl', () => {
  let impl: QwkSearchImpl;

  beforeEach(() => {
    impl = new QwkSearchImpl();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.QWKSEARCH_SEARCH_URL;
    delete process.env.QWKSEARCH_API_KEY;
  });

  it('maps the fan-out response onto UniformSearchResponse', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      createMockResponse({
        elapsedTime: 120,
        results: [
          {
            date: '2026-01-02',
            domain: 'example.com',
            engines: ['google', 'brave'],
            score: 0.75,
            snippet: 'A snippet',
            thumbnail_src: 'https://example.com/t.png',
            title: 'Example',
            url: 'https://example.com/page',
          },
        ],
        suggestions: ['another query'],
      }),
    );

    const response = await impl.query('lobehub');

    expect(response.query).toBe('lobehub');
    expect(response.resultNumbers).toBe(1);
    expect(response.results[0]).toMatchObject({
      category: 'general',
      content: 'A snippet',
      engines: ['google', 'brave'],
      parsedUrl: 'example.com',
      publishedDate: '2026-01-02',
      score: 0.75,
      thumbnail: 'https://example.com/t.png',
      title: 'Example',
      url: 'https://example.com/page',
    });
  });

  it('derives engines and hostname when the fan-out omits them', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      createMockResponse({
        results: [{ content: 'body', source: 'mojeek', title: 'T', url: 'https://www.a.com/x' }],
      }),
    );

    const { results } = await impl.query('q');

    expect(results[0].engines).toEqual(['mojeek']);
    expect(results[0].parsedUrl).toBe('www.a.com');
    expect(results[0].score).toBe(0);
  });

  it('fans out one request per category and merges the results', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        createMockResponse({ results: [{ title: 'A', url: 'https://a.com', score: 0.5 }] }),
      )
      .mockResolvedValueOnce(
        createMockResponse({ results: [{ title: 'B', url: 'https://b.com', score: 0.9 }] }),
      );

    const { results } = await impl.query('q', { searchCategories: ['news', 'academic'] });

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(requestedUrls().map((u) => u.searchParams.get('cat'))).toEqual(['news', 'science']);
    expect(results.map((r) => r.url)).toEqual(['https://b.com', 'https://a.com']);
  });

  it('forwards a supported time range as recency and drops unsupported ones', async () => {
    vi.mocked(fetch).mockResolvedValue(createMockResponse({ results: [] }));

    await impl.query('q', { searchTimeRange: 'week' });
    expect(requestedUrls()[0].searchParams.get('recency')).toBe('week');

    vi.mocked(fetch).mockClear();
    await impl.query('q', { searchTimeRange: 'anytime' });
    expect(requestedUrls()[0].searchParams.has('recency')).toBe(false);
  });

  it('never forwards engine restrictions', async () => {
    vi.mocked(fetch).mockResolvedValue(createMockResponse({ results: [] }));

    await impl.query('q', { searchEngines: ['google'] });

    expect(requestedUrls()[0].searchParams.has('engines')).toBe(false);
    expect(impl.useAutoSearchEngineSelection).toBe(true);
  });

  it('honours QWKSEARCH_SEARCH_URL and sends the API key when configured', async () => {
    process.env.QWKSEARCH_SEARCH_URL = 'https://staging.qwksearch.com/api/agent/search';
    process.env.QWKSEARCH_API_KEY = 'secret';
    vi.mocked(fetch).mockResolvedValue(createMockResponse({ results: [] }));

    await impl.query('q');

    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect((url as URL).origin).toBe('https://staging.qwksearch.com');
    expect((init as RequestInit).headers).toMatchObject({ Authorization: 'Bearer secret' });
  });

  it('drops results missing a url or title', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      createMockResponse({
        results: [
          { title: 'no url' },
          { url: 'https://a.com' },
          { title: 'ok', url: 'https://b.com' },
        ],
      }),
    );

    const { results } = await impl.query('q');

    expect(results.map((r) => r.url)).toEqual(['https://b.com']);
  });

  it('raises SERVICE_UNAVAILABLE on a non-ok response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(createMockResponse({}, false, 502));

    await expect(impl.query('q')).rejects.toMatchObject({ code: 'SERVICE_UNAVAILABLE' });
  });

  it('raises SERVICE_UNAVAILABLE when the fan-out reports an error body', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(createMockResponse({ error: 'Search failed' }));

    await expect(impl.query('q')).rejects.toMatchObject({ code: 'SERVICE_UNAVAILABLE' });
  });

  it('raises SERVICE_UNAVAILABLE when the request throws', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('network down'));

    await expect(impl.query('q')).rejects.toMatchObject({
      code: 'SERVICE_UNAVAILABLE',
      message: 'network down',
    });
  });
});

describe('QwkSearchImpl settings', () => {
  const SEARCH_ENV = [
    'QWKSEARCH_API_KEY',
    'QWKSEARCH_SEARCH_CATEGORIES',
    'QWKSEARCH_SEARCH_LANGUAGE',
    'QWKSEARCH_SEARCH_MAX_CATEGORIES',
    'QWKSEARCH_SEARCH_PUBLIC_INSTANCES',
    'QWKSEARCH_SEARCH_RESULT_LIMIT',
    'QWKSEARCH_SEARCH_SAFE',
    'QWKSEARCH_SEARCH_TIME_RANGE',
    'QWKSEARCH_SEARCH_URL',
  ];

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.mocked(fetch).mockResolvedValue(createMockResponse({ results: [] }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    for (const key of SEARCH_ENV) delete process.env[key];
  });

  it('sends the resolved language on every request', async () => {
    await new QwkSearchImpl().query('q');
    expect(requestedUrls()[0].searchParams.get('lang')).toBe('en-US');

    vi.mocked(fetch).mockClear();
    process.env.QWKSEARCH_SEARCH_LANGUAGE = 'ja-jp';
    await new QwkSearchImpl().query('q');
    expect(requestedUrls()[0].searchParams.get('lang')).toBe('ja-JP');
  });

  it('omits safesearch and publicInstances unless they are on', async () => {
    await new QwkSearchImpl().query('q');

    const url = requestedUrls()[0];
    expect(url.searchParams.has('safesearch')).toBe(false);
    expect(url.searchParams.has('publicInstances')).toBe(false);
  });

  it('sends safesearch and publicInstances when the operator turns them on', async () => {
    process.env.QWKSEARCH_SEARCH_PUBLIC_INSTANCES = 'true';
    process.env.QWKSEARCH_SEARCH_SAFE = 'true';

    await new QwkSearchImpl().query('q');

    const url = requestedUrls()[0];
    expect(url.searchParams.get('safesearch')).toBe('true');
    expect(url.searchParams.get('publicInstances')).toBe('true');
  });

  it('applies a configured default recency when the call asks for none', async () => {
    process.env.QWKSEARCH_SEARCH_TIME_RANGE = 'month';

    await new QwkSearchImpl().query('q');
    expect(requestedUrls()[0].searchParams.get('recency')).toBe('month');

    // …and the call still wins where it names a range the endpoint knows.
    vi.mocked(fetch).mockClear();
    await new QwkSearchImpl().query('q', { searchTimeRange: 'day' });
    expect(requestedUrls()[0].searchParams.get('recency')).toBe('day');
  });

  it('searches the operator default categories when the call names none', async () => {
    process.env.QWKSEARCH_SEARCH_CATEGORIES = 'news,science';

    await new QwkSearchImpl().query('q');

    expect(requestedUrls().map((u) => u.searchParams.get('cat'))).toEqual(['news', 'science']);
  });

  it('lets the operator widen the fan-out past three categories', async () => {
    process.env.QWKSEARCH_SEARCH_MAX_CATEGORIES = '4';

    await new QwkSearchImpl().query('q', {
      searchCategories: ['general', 'news', 'images', 'videos', 'science'],
    });

    expect(fetch).toHaveBeenCalledTimes(4);
  });

  it('caps the merged results when a limit is configured', async () => {
    process.env.QWKSEARCH_SEARCH_RESULT_LIMIT = '2';
    vi.mocked(fetch).mockResolvedValue(
      createMockResponse({
        results: [
          { score: 0.1, title: 'C', url: 'https://c.com' },
          { score: 0.9, title: 'A', url: 'https://a.com' },
          { score: 0.5, title: 'B', url: 'https://b.com' },
        ],
      }),
    );

    const { resultNumbers, results } = await new QwkSearchImpl().query('q');

    // Capped after the merge, so it keeps the highest-scoring URLs.
    expect(results.map((r) => r.url)).toEqual(['https://a.com', 'https://b.com']);
    expect(resultNumbers).toBe(2);
  });

  it('returns every result when no limit is configured', async () => {
    vi.mocked(fetch).mockResolvedValue(
      createMockResponse({
        results: [
          { title: 'A', url: 'https://a.com' },
          { title: 'B', url: 'https://b.com' },
          { title: 'C', url: 'https://c.com' },
        ],
      }),
    );

    expect((await new QwkSearchImpl().query('q')).results).toHaveLength(3);
  });

  it('takes user preferences over the environment, and the call over both', async () => {
    process.env.QWKSEARCH_SEARCH_CATEGORIES = 'news';
    process.env.QWKSEARCH_SEARCH_LANGUAGE = 'de-DE';

    const impl = new QwkSearchImpl({
      loadOverrides: async () => ({ categories: ['music'], language: 'fr-FR' }),
    });

    await impl.query('q');
    expect(requestedUrls()[0].searchParams.get('cat')).toBe('music');
    expect(requestedUrls()[0].searchParams.get('lang')).toBe('fr-FR');

    vi.mocked(fetch).mockClear();
    await impl.query('q', { searchCategories: ['videos'] });
    expect(requestedUrls()[0].searchParams.get('cat')).toBe('videos');
    // The call may narrow the categories; it has no say over the language.
    expect(requestedUrls()[0].searchParams.get('lang')).toBe('fr-FR');
  });

  it('reads the environment per query, not once at construction', async () => {
    const impl = new QwkSearchImpl();
    await impl.query('q');
    expect(requestedUrls()[0].origin).toBe('https://qwksearch.com');

    vi.mocked(fetch).mockClear();
    process.env.QWKSEARCH_SEARCH_URL = 'https://staging.example/api/agent/search';
    await impl.query('q');
    expect(requestedUrls()[0].origin).toBe('https://staging.example');
  });

  it('ignores an endpoint that is not an http(s) URL', async () => {
    process.env.QWKSEARCH_SEARCH_URL = 'file:///etc/passwd';

    await new QwkSearchImpl().query('q');

    expect(requestedUrls()[0].origin).toBe('https://qwksearch.com');
  });
});

describe('QwkSearchImpl user layer', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.mocked(fetch).mockResolvedValue(
      createMockResponse({ results: [{ title: 'A', url: 'https://a.example' }] }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.QWKSEARCH_SEARCH_LANGUAGE;
  });

  it('reads the stored overrides once, however many queries the impl serves', async () => {
    const loadOverrides = vi.fn(async () => ({ language: 'fr-FR' }));
    const impl = new QwkSearchImpl({ loadOverrides, userId: 'user_1' });

    await impl.query('one');
    await impl.query('two');

    // An impl is built per tool execution and a single turn can fan out several
    // queries; the row is worth exactly one D1 read.
    expect(loadOverrides).toHaveBeenCalledTimes(1);
    expect(loadOverrides).toHaveBeenCalledWith('user_1');
    expect(requestedUrls().every((url) => url.searchParams.get('lang') === 'fr-FR')).toBe(true);
  });

  it('collapses concurrent queries onto a single read', async () => {
    let resolveLoad: (value: { language: string }) => void = () => {};
    const loadOverrides = vi.fn(
      () => new Promise<{ language: string }>((resolve) => (resolveLoad = resolve)),
    );
    const impl = new QwkSearchImpl({ loadOverrides, userId: 'user_1' });

    const queries = Promise.all([impl.query('one'), impl.query('two')]);
    resolveLoad({ language: 'de-DE' });
    await queries;

    expect(loadOverrides).toHaveBeenCalledTimes(1);
  });

  it('searches on the operator configuration when nobody is signed in', async () => {
    process.env.QWKSEARCH_SEARCH_LANGUAGE = 'de-DE';
    const loadOverrides = vi.fn(async () => ({}));

    await new QwkSearchImpl({ loadOverrides }).query('q');

    expect(loadOverrides).toHaveBeenCalledWith(undefined);
    expect(requestedUrls()[0].searchParams.get('lang')).toBe('de-DE');
  });

  it('still searches when the stored overrides cannot be read', async () => {
    // `loadUserSearchOverrides` swallows its own failures, but an impl built with
    // a different loader must not turn a preferences outage into a failed search
    // either — so a rejection degrades to the operator's configuration.
    vi.spyOn(console, 'error').mockImplementation(() => {});
    process.env.QWKSEARCH_SEARCH_LANGUAGE = 'de-DE';
    const loadOverrides = vi.fn(async () => {
      throw new Error('D1 is down');
    });
    const impl = new QwkSearchImpl({ loadOverrides, userId: 'user_1' });

    const { results } = await impl.query('q');

    expect(results.length).toBeGreaterThan(0);
    expect(requestedUrls()[0].searchParams.get('lang')).toBe('de-DE');

    // And the rejection is not what the memo caches: a second query still works
    // and still does not retry the read.
    await expect(impl.query('q')).resolves.toBeDefined();
    expect(loadOverrides).toHaveBeenCalledTimes(1);
  });

  it('lets the tool call narrow what the stored preferences chose', async () => {
    const impl = new QwkSearchImpl({
      loadOverrides: async () => ({ categories: ['music'], maxCategories: 1 }),
      userId: 'user_1',
    });

    await impl.query('q', { searchCategories: ['videos', 'news'] });

    // The call narrows the categories; `maxCategories` is the operator/user
    // budget and still caps the list the call asked for.
    expect(requestedUrls()).toHaveLength(1);
    expect(requestedUrls()[0].searchParams.get('cat')).toBe('videos');
  });
});
