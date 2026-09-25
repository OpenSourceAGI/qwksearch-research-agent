import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MAX_CUSTOM_TOPICS,
  getCustomTopicNews,
  getTrendingTopics,
  handleTrendingNewsRequest,
  parseTopicLimit,
  parseTopicList,
} from '../src/server';
import { getTrendingNews } from '../src/api/trending';
import { clearTrendingNewsCache } from '../src/lib/cache';

const WIKI_HOST = 'https://wikimedia.org/';
const NEWS_HOST = 'https://api.thenewsapi.com/';

function wikiItems(count: number, extra: Array<{ article: string; views: number }> = []) {
  const items = Array.from({ length: count }, (_, i) => ({
    article: `Topic_${i + 1}`,
    views: 1000 - i,
    rank: i + 1,
  }));
  return { items: [...extra, ...items] };
}

function newsArticle(title: string) {
  return {
    title,
    url: `https://example.com/${encodeURIComponent(title)}`,
    source: 'example.com',
    published_at: '2024-01-01T09:00:00Z',
    image_url: 'https://example.com/a.jpg',
  };
}

/**
 * A `fetch` that answers Wikipedia with `wiki` and every News API search with
 * the articles `news` returns for that query, recording the URLs it was
 * called with.
 */
function stubUpstreams({
  wiki,
  news = () => [newsArticle('A headline')],
  wikiOk = true,
  newsError,
}: {
  wiki: unknown;
  news?: (query: string) => unknown[];
  wikiOk?: boolean;
  /** Makes The News API refuse the queries it returns true for. */
  newsError?: (query: string) => boolean;
}) {
  const calls: string[] = [];
  const fetchImpl = vi.fn(async (input: any) => {
    const url = String(input);
    calls.push(url);
    if (url.startsWith(WIKI_HOST)) {
      return { ok: wikiOk, status: wikiOk ? 200 : 503, json: async () => wiki } as any;
    }
    if (url.startsWith(NEWS_HOST)) {
      const query = new URL(url).searchParams.get('search') ?? '';
      if (newsError?.(query)) {
        return {
          ok: false,
          status: 401,
          json: async () => ({
            error: { code: 'invalid_api_token', message: 'An invalid API token was supplied.' },
          }),
        } as any;
      }
      return { ok: true, status: 200, json: async () => ({ data: news(query) }) } as any;
    }
    throw new Error(`unexpected fetch: ${url}`);
  });
  return { fetchImpl, calls };
}

const newsCalls = (calls: string[]) => calls.filter((url) => url.startsWith(NEWS_HOST));

describe('parseTopicLimit', () => {
  it('falls back for missing, unparseable and non-positive values', () => {
    expect(parseTopicLimit(null)).toBe(25);
    expect(parseTopicLimit('not a number')).toBe(25);
    expect(parseTopicLimit(0)).toBe(25);
    expect(parseTopicLimit(-3)).toBe(25);
  });

  it('clamps to the maximum the server is willing to fetch', () => {
    expect(parseTopicLimit('6')).toBe(6);
    expect(parseTopicLimit(500)).toBe(50);
  });
});

describe('getTrendingTopics', () => {
  it('pairs each Wikipedia topic with its headlines', async () => {
    const { fetchImpl } = stubUpstreams({ wiki: wikiItems(2) });

    const result = await getTrendingTopics({ apiKey: 'k', limit: 2, fetchImpl });

    expect(result.source).toBe('wikipedia_daily_top');
    expect(result.topics).toHaveLength(2);
    expect(result.topics[0]).toMatchObject({
      topic: 'Topic 1',
      wiki_rank: 1,
      wiki_views: 1000,
      news_count: 1,
    });
    expect(result.topics[0].articles[0]).toMatchObject({
      title: 'A headline',
      published_at: '2024-01-01T09:00:00Z',
      image_url: 'https://example.com/a.jpg',
    });
  });

  it('reads yesterday’s pageviews, since the ranking lags a day', async () => {
    const { fetchImpl, calls } = stubUpstreams({ wiki: wikiItems(1) });

    const result = await getTrendingTopics({
      apiKey: 'k',
      limit: 1,
      date: new Date(Date.UTC(2024, 2, 5)),
      fetchImpl,
    });

    expect(calls[0]).toContain('/2024/03/05');
    expect(result.date).toBe('2024-03-05');
  });

  it('skips Wikipedia navigation pages', async () => {
    const { fetchImpl } = stubUpstreams({
      wiki: wikiItems(1, [
        { article: 'Main_Page', views: 9000 },
        { article: 'Special:Search', views: 8000 },
      ]),
    });

    const result = await getTrendingTopics({ apiKey: 'k', limit: 5, fetchImpl });

    expect(result.topics.map((t) => t.topic)).toEqual(['Topic 1']);
  });

  it('drops topics with no headlines and fills the quota from the next ones', async () => {
    const { fetchImpl } = stubUpstreams({
      wiki: wikiItems(6),
      news: (query) => (query === 'Topic 1' || query === 'Topic 2' ? [] : [newsArticle(query)]),
    });

    const result = await getTrendingTopics({ apiKey: 'k', limit: 2, fetchImpl });

    expect(result.topics.map((t) => t.topic)).toEqual(['Topic 3', 'Topic 4']);
  });

  it('stops searching once the requested number of topics is filled', async () => {
    const { fetchImpl, calls } = stubUpstreams({ wiki: wikiItems(40) });

    const result = await getTrendingTopics({ apiKey: 'k', limit: 3, fetchImpl });

    expect(result.topics).toHaveLength(3);
    // The first batch of concurrent searches already filled the quota: the
    // remaining Wikipedia candidates cost nothing.
    expect(newsCalls(calls)).toHaveLength(5);
  });

  it('never looks at more Wikipedia candidates than twice the topics asked for', async () => {
    const { fetchImpl, calls } = stubUpstreams({ wiki: wikiItems(40), news: () => [] });

    const result = await getTrendingTopics({ apiKey: 'k', limit: 2, fetchImpl });

    expect(result.topics).toEqual([]);
    expect(newsCalls(calls)).toHaveLength(4);
  });

  it('reads the nested ranking the pageviews API actually returns', async () => {
    const { fetchImpl } = stubUpstreams({
      wiki: {
        items: [
          {
            project: 'en.wikipedia',
            articles: [
              { article: 'Main_Page', views: 9000, rank: 1 },
              { article: 'Ada_Lovelace', views: 500, rank: 2 },
            ],
          },
        ],
      },
    });

    const result = await getTrendingTopics({ apiKey: 'k', limit: 5, fetchImpl });

    expect(result.topics.map((t) => t.topic)).toEqual(['Ada Lovelace']);
  });

  it('falls back to the day before when yesterday is not published yet', async () => {
    const calls: string[] = [];
    const fetchImpl = vi.fn(async (input: any) => {
      const url = String(input);
      calls.push(url);
      if (url.includes('/2024/03/05')) return { ok: false, status: 404, json: async () => ({}) } as any;
      if (url.startsWith(WIKI_HOST)) return { ok: true, status: 200, json: async () => wikiItems(1) } as any;
      return { ok: true, status: 200, json: async () => ({ data: [newsArticle('x')] }) } as any;
    });

    const result = await getTrendingTopics({
      apiKey: 'k',
      limit: 1,
      date: new Date(Date.UTC(2024, 2, 5)),
      fetchImpl,
    });

    expect(calls[1]).toContain('/2024/03/04');
    expect(result.topics).toHaveLength(1);
  });

  it('queries The News API search endpoint with `search`', async () => {
    const { fetchImpl, calls } = stubUpstreams({ wiki: wikiItems(1) });

    await getTrendingTopics({ apiKey: 'k', limit: 1, fetchImpl });

    const url = new URL(newsCalls(calls)[0]);
    expect(url.pathname).toBe('/v1/news/all');
    expect(url.searchParams.get('search')).toBe('Topic 1');
  });

  it('tolerates one topic the News API refuses', async () => {
    const { fetchImpl } = stubUpstreams({
      wiki: wikiItems(3),
      newsError: (query) => query === 'Topic 1',
    });

    const result = await getTrendingTopics({ apiKey: 'k', limit: 2, fetchImpl });

    expect(result.topics.map((t) => t.topic)).toEqual(['Topic 2', 'Topic 3']);
  });

  it('throws the News API’s own message when every search fails', async () => {
    const { fetchImpl } = stubUpstreams({ wiki: wikiItems(3), newsError: () => true });

    await expect(getTrendingTopics({ apiKey: 'bad', limit: 2, fetchImpl })).rejects.toThrow(
      'An invalid API token was supplied.'
    );
  });

  it('sends the API key to The News API, never to Wikipedia', async () => {
    const { fetchImpl, calls } = stubUpstreams({ wiki: wikiItems(1) });

    await getTrendingTopics({ apiKey: 'secret-token', limit: 1, fetchImpl });

    expect(calls[0]).not.toContain('secret-token');
    expect(newsCalls(calls)[0]).toContain('api_token=secret-token');
  });
});

describe('handleTrendingNewsRequest', () => {
  const request = (query = '') => new Request(`https://app.example.com/api/news/trending${query}`);

  it('reports a missing API key as JSON rather than crashing', async () => {
    const response = await handleTrendingNewsRequest(request(), { apiKey: undefined });

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'THENEWSAPI_API_KEY is not configured' });
  });

  it('serves the daily list honouring ?limit=', async () => {
    const { fetchImpl, calls } = stubUpstreams({ wiki: wikiItems(20) });

    const response = await handleTrendingNewsRequest(request('?limit=2'), {
      apiKey: 'k',
      fetchImpl,
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');
    const body = (await response.json()) as { topics: unknown[] };
    expect(body.topics).toHaveLength(2);
    expect(calls[0]).toContain('top-per-article');
  });

  it('serves headlines for a single topic without touching Wikipedia', async () => {
    const { fetchImpl, calls } = stubUpstreams({
      wiki: wikiItems(5),
      news: (query) => [newsArticle(`About ${query}`)],
    });

    const response = await handleTrendingNewsRequest(request('?topic=Eclipse'), {
      apiKey: 'k',
      fetchImpl,
    });

    expect(await response.json()).toEqual({
      topic: 'Eclipse',
      news_count: 1,
      articles: [
        {
          title: 'About Eclipse',
          url: 'https://example.com/About%20Eclipse',
          source: 'example.com',
          published_at: '2024-01-01T09:00:00Z',
          image_url: 'https://example.com/a.jpg',
        },
      ],
    });
    expect(calls.every((url) => url.startsWith(NEWS_HOST))).toBe(true);
  });

  it('answers an unreachable pageviews API with a 500 the widget can read', async () => {
    const { fetchImpl } = stubUpstreams({ wiki: {}, wikiOk: false });

    const response = await handleTrendingNewsRequest(request(), { apiKey: 'k', fetchImpl });

    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({ error: 'Failed to fetch Wikipedia trends' });
  });

  it('reports a rejected News API token as a 502 naming the cause', async () => {
    const { fetchImpl } = stubUpstreams({ wiki: wikiItems(2), newsError: () => true });

    const response = await handleTrendingNewsRequest(request('?limit=2'), {
      apiKey: 'bad',
      fetchImpl,
    });

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      error: 'The News API: An invalid API token was supplied. (invalid_api_token)',
      code: 'invalid_api_token',
      upstream_status: 401,
    });
  });

  it('allows cross-origin reads, as the deployed worker always has', async () => {
    const { fetchImpl } = stubUpstreams({ wiki: wikiItems(1) });

    const response = await handleTrendingNewsRequest(request('?limit=1'), {
      apiKey: 'k',
      fetchImpl,
    });

    expect(response.headers.get('access-control-allow-origin')).toBe('*');
  });
});

describe('server and client agree on the wire format', () => {
  beforeEach(() => {
    clearTrendingNewsCache();
    vi.unstubAllGlobals();
  });

  it('round-trips a served response into the shape the widget renders', async () => {
    const { fetchImpl } = stubUpstreams({ wiki: wikiItems(1) });
    // The browser's `fetch` answered by the route the host app serves.
    vi.stubGlobal('fetch', (input: any) =>
      handleTrendingNewsRequest(new Request(String(input)), { apiKey: 'k', fetchImpl }),
    );

    const data = await getTrendingNews({ apiEndpoint: '/api/news/trending', limit: 1 });

    expect(data.date).toBeDefined();
    expect(data.topics).toEqual([
      {
        topic: 'Topic 1',
        wikiRank: 1,
        wikiViews: 1000,
        newsCount: 1,
        articles: [
          {
            title: 'A headline',
            url: 'https://example.com/A%20headline',
            source: 'example.com',
            publishedAt: '2024-01-01T09:00:00Z',
            imageUrl: 'https://example.com/a.jpg',
          },
        ],
      },
    ]);
  });
});

describe('parseTopicList', () => {
  it('splits on commas and newlines, trimming blanks', () => {
    expect(parseTopicList('AI, climate\nfusion power')).toEqual([
      'AI',
      'climate',
      'fusion power',
    ]);
    expect(parseTopicList('  ,\n , ')).toEqual([]);
    expect(parseTopicList(null)).toEqual([]);
  });

  it('de-duplicates case-insensitively while keeping the first spelling', () => {
    expect(parseTopicList('AI, ai, Ai, robotics')).toEqual(['AI', 'robotics']);
  });

  it('caps the list so one request cannot fan out without bound', () => {
    const many = Array.from({ length: MAX_CUSTOM_TOPICS + 8 }, (_, i) => `t${i}`);
    expect(parseTopicList(many)).toHaveLength(MAX_CUSTOM_TOPICS);
  });

  it('length-caps a single topic', () => {
    expect(parseTopicList('x'.repeat(500))[0]).toHaveLength(120);
  });
});

describe('getCustomTopicNews', () => {
  it('searches each named topic and keeps the caller’s order', async () => {
    const { fetchImpl, calls } = stubUpstreams({
      wiki: wikiItems(0),
      news: (q) => [newsArticle(`${q} headline`)],
    });

    const data = await getCustomTopicNews(['fusion', 'AI', 'shipping'], {
      apiKey: 'k',
      fetchImpl,
    });

    expect(data.source).toBe('custom_topics');
    expect(data.topics.map((t) => t.topic)).toEqual(['fusion', 'AI', 'shipping']);
    expect(data.topics[0].articles[0].title).toBe('fusion headline');
    // Wikipedia is never consulted for a custom list.
    expect(calls.some((url) => url.startsWith(WIKI_HOST))).toBe(false);
    expect(newsCalls(calls)).toHaveLength(3);
  });

  it('keeps a topic that has no headlines, rather than dropping it', async () => {
    const { fetchImpl } = stubUpstreams({
      wiki: wikiItems(0),
      news: (q) => (q === 'quiet' ? [] : [newsArticle('A headline')]),
    });

    const data = await getCustomTopicNews(['quiet', 'loud'], { apiKey: 'k', fetchImpl });

    expect(data.topics.map((t) => [t.topic, t.news_count])).toEqual([
      ['quiet', 0],
      ['loud', 1],
    ]);
  });
});

describe('handleTrendingNewsRequest with ?topics=', () => {
  it('serves the named topics instead of the Wikipedia ranking', async () => {
    const { fetchImpl, calls } = stubUpstreams({
      wiki: wikiItems(5),
      news: (q) => [newsArticle(`${q} headline`)],
    });

    const res = await handleTrendingNewsRequest(
      new Request('https://example.com/?topics=AI%2Cclimate'),
      { apiKey: 'k', fetchImpl },
    );
    const body: any = await res.json();

    expect(res.status).toBe(200);
    expect(body.source).toBe('custom_topics');
    expect(body.topics.map((t: any) => t.topic)).toEqual(['AI', 'climate']);
    expect(calls.some((url) => url.startsWith(WIKI_HOST))).toBe(false);
  });

  it('falls through to the daily ranking when the list parses to nothing', async () => {
    const { fetchImpl, calls } = stubUpstreams({ wiki: wikiItems(2) });

    const res = await handleTrendingNewsRequest(
      new Request('https://example.com/?topics=%20%2C%20&limit=2'),
      { apiKey: 'k', fetchImpl },
    );
    const body: any = await res.json();

    expect(body.source).toBe('wikipedia_daily_top');
    expect(calls.some((url) => url.startsWith(WIKI_HOST))).toBe(true);
  });

  it('gives a single ?topic= precedence over a ?topics= list', async () => {
    const { fetchImpl } = stubUpstreams({
      wiki: wikiItems(2),
      news: (q) => [newsArticle(`${q} headline`)],
    });

    const res = await handleTrendingNewsRequest(
      new Request('https://example.com/?topic=solo&topics=a,b'),
      { apiKey: 'k', fetchImpl },
    );
    const body: any = await res.json();

    expect(body.topic).toBe('solo');
    expect(body.topics).toBeUndefined();
  });

  it('round-trips a custom list through the client, untruncated by limit', async () => {
    const { fetchImpl } = stubUpstreams({
      wiki: wikiItems(0),
      news: (q) => [newsArticle(`${q} headline`)],
    });
    vi.stubGlobal('fetch', (input: any) =>
      handleTrendingNewsRequest(new Request(String(input)), { apiKey: 'k', fetchImpl }),
    );

    const data = await getTrendingNews({
      apiEndpoint: '/api/news/trending',
      topics: ['a', 'b', 'c'],
      limit: 1,
    });

    expect(data.source).toBe('custom_topics');
    expect(data.topics.map((t) => t.topic)).toEqual(['a', 'b', 'c']);
  });
});
