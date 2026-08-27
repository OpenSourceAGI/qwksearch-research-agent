import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getTrendingNews, getTrendingNewsForTopic } from '../src/api/trending';
import { clearTrendingNewsCache } from '../src/lib/cache';

const ENDPOINT = 'https://news.example.workers.dev/api/trending';

function workerTopics(overrides: Record<string, unknown> = {}) {
  return {
    date: '2024-01-01',
    topics: [
      {
        topic: 'Eclipse',
        wiki_rank: 3,
        wiki_views: 120_000,
        news_count: 2,
        articles: [
          {
            title: 'Total eclipse crosses North America',
            url: 'https://example.com/a',
            source: 'example.com',
            published_at: '2024-01-01T09:00:00Z',
            image_url: 'https://example.com/a.jpg',
          },
          { title: 'Where to watch' },
        ],
      },
      { topic: 'Elections', news_count: 1, articles: [] },
    ],
    ...overrides,
  };
}

function mockFetch(payload: unknown, init: { ok?: boolean; status?: number; statusText?: string } = {}) {
  const fetchMock = vi.fn(async () => ({
    ok: init.ok ?? true,
    status: init.status ?? 200,
    statusText: init.statusText ?? 'OK',
    json: async () => payload,
  }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('getTrendingNews', () => {
  beforeEach(() => {
    clearTrendingNewsCache();
    vi.unstubAllGlobals();
  });

  it('requires an apiEndpoint', async () => {
    await expect(getTrendingNews({})).rejects.toThrow('trending-news-api: apiEndpoint is required');
  });

  it('requests the configured endpoint', async () => {
    const fetchMock = mockFetch(workerTopics());

    await getTrendingNews({ apiEndpoint: ENDPOINT });

    expect(fetchMock).toHaveBeenCalledWith(ENDPOINT, {
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it('maps the worker snake_case payload to the public camelCase shape', async () => {
    mockFetch(workerTopics());

    const result = await getTrendingNews({ apiEndpoint: ENDPOINT });

    expect(result.date).toBe('2024-01-01');
    expect(result.topics[0]).toEqual({
      topic: 'Eclipse',
      wikiRank: 3,
      wikiViews: 120_000,
      newsCount: 2,
      articles: [
        {
          title: 'Total eclipse crosses North America',
          url: 'https://example.com/a',
          source: 'example.com',
          publishedAt: '2024-01-01T09:00:00Z',
          imageUrl: 'https://example.com/a.jpg',
        },
        {
          title: 'Where to watch',
          url: undefined,
          source: undefined,
          publishedAt: undefined,
          imageUrl: undefined,
        },
      ],
    });
  });

  it('leaves optional wiki fields undefined when absent', async () => {
    mockFetch(workerTopics());

    const result = await getTrendingNews({ apiEndpoint: ENDPOINT });

    expect(result.topics[1].wikiRank).toBeUndefined();
    expect(result.topics[1].wikiViews).toBeUndefined();
  });

  it('truncates the topic list to the requested limit', async () => {
    mockFetch(workerTopics());

    const result = await getTrendingNews({ apiEndpoint: ENDPOINT, limit: 1 });

    expect(result.topics).toHaveLength(1);
    expect(result.topics[0].topic).toBe('Eclipse');
  });

  it('tolerates a response with no topics array', async () => {
    mockFetch({ date: '2024-01-01' });

    const result = await getTrendingNews({ apiEndpoint: ENDPOINT });

    expect(result.topics).toEqual([]);
  });

  it('appends the topic query param when one is supplied', async () => {
    const fetchMock = mockFetch(workerTopics());

    await getTrendingNews({ apiEndpoint: ENDPOINT, topic: 'Eclipse & Sun' });

    expect(fetchMock.mock.calls[0][0]).toBe(`${ENDPOINT}?topic=Eclipse+%26+Sun`);
  });

  it('throws on a non-ok response', async () => {
    mockFetch(null, { ok: false, status: 500, statusText: 'Internal Server Error' });

    await expect(getTrendingNews({ apiEndpoint: ENDPOINT })).rejects.toThrow(
      'Trending news request failed: 500 Internal Server Error'
    );
  });

  it('throws on a 200 response carrying an error field', async () => {
    mockFetch({ error: 'upstream unavailable', topics: [] });

    await expect(getTrendingNews({ apiEndpoint: ENDPOINT })).rejects.toThrow('upstream unavailable');
  });

  it('serves a repeat request from the cache', async () => {
    const fetchMock = mockFetch(workerTopics());

    const first = await getTrendingNews({ apiEndpoint: ENDPOINT });
    const second = await getTrendingNews({ apiEndpoint: ENDPOINT });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(second).toEqual(first);
  });

  it('caches per topic rather than per endpoint', async () => {
    const fetchMock = mockFetch(workerTopics());

    await getTrendingNews({ apiEndpoint: ENDPOINT, topic: 'a' });
    await getTrendingNews({ apiEndpoint: ENDPOINT, topic: 'b' });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('getTrendingNewsForTopic', () => {
  beforeEach(() => {
    clearTrendingNewsCache();
    vi.unstubAllGlobals();
  });

  it('requires an apiEndpoint', async () => {
    await expect(getTrendingNewsForTopic('Eclipse', {})).rejects.toThrow(
      'trending-news-api: apiEndpoint is required'
    );
  });

  it('requests the topic and maps the articles', async () => {
    const fetchMock = mockFetch({
      topic: 'Eclipse',
      news_count: 1,
      articles: [{ title: 'Headline', url: 'https://example.com/a', published_at: '2024-01-01' }],
    });

    const result = await getTrendingNewsForTopic('Eclipse', { apiEndpoint: ENDPOINT });

    expect(fetchMock.mock.calls[0][0]).toBe(`${ENDPOINT}?topic=Eclipse`);
    expect(result).toEqual({
      topic: 'Eclipse',
      newsCount: 1,
      articles: [
        {
          title: 'Headline',
          url: 'https://example.com/a',
          source: undefined,
          publishedAt: '2024-01-01',
        },
      ],
    });
  });

  it('defaults a missing article title to an empty string', async () => {
    mockFetch({ topic: 'Eclipse', news_count: 1, articles: [{ url: 'https://example.com/a' }] });

    const result = await getTrendingNewsForTopic('Eclipse', { apiEndpoint: ENDPOINT });

    expect(result.articles[0].title).toBe('');
  });

  it('tolerates a response with no articles array', async () => {
    mockFetch({ topic: 'Eclipse', news_count: 0 });

    const result = await getTrendingNewsForTopic('Eclipse', { apiEndpoint: ENDPOINT });

    expect(result.articles).toEqual([]);
  });

  it('throws on a non-ok response', async () => {
    mockFetch(null, { ok: false, status: 404, statusText: 'Not Found' });

    await expect(getTrendingNewsForTopic('Eclipse', { apiEndpoint: ENDPOINT })).rejects.toThrow(
      'Trending news request failed: 404 Not Found'
    );
  });

  it('throws on a 200 response carrying an error field', async () => {
    mockFetch({ topic: 'Eclipse', news_count: 0, articles: [], error: 'no such topic' });

    await expect(getTrendingNewsForTopic('Eclipse', { apiEndpoint: ENDPOINT })).rejects.toThrow(
      'no such topic'
    );
  });

  it('serves a repeat request from the cache', async () => {
    const fetchMock = mockFetch({ topic: 'Eclipse', news_count: 0, articles: [] });

    await getTrendingNewsForTopic('Eclipse', { apiEndpoint: ENDPOINT });
    await getTrendingNewsForTopic('Eclipse', { apiEndpoint: ENDPOINT });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
