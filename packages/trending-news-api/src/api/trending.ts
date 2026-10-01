import type { NewsArticle, TrendingNewsData, TrendingNewsOptions, TrendingNewsTopicData } from '../types';
import {
  readCachedTrendingNews,
  readStaleCachedTrendingNews,
  writeCachedTrendingNews,
} from '../lib/cache';

type WorkerArticle = {
  title?: string;
  url?: string;
  source?: string;
  published_at?: string;
  image_url?: string;
};

type WorkerTopic = {
  topic: string;
  wiki_rank?: number;
  wiki_views?: number;
  news_count: number;
  articles: WorkerArticle[];
};

type WorkerTopicsResponse = {
  date?: string;
  source?: string;
  topics: WorkerTopic[];
  error?: string;
};

type WorkerTopicResponse = {
  topic: string;
  news_count: number;
  articles: WorkerArticle[];
  error?: string;
};

function mapArticles(articles: WorkerArticle[] = []): NewsArticle[] {
  return articles.map((a) => ({
    title: a.title ?? '',
    url: a.url,
    source: a.source,
    publishedAt: a.published_at,
    imageUrl: a.image_url,
  }));
}

/**
 * Resolves `apiEndpoint` against the page it is running on, so a host app that
 * serves the trending data from one of its own routes can configure it as a
 * plain path (`/api/news/trending`) instead of a full origin.
 */
function resolveEndpoint(apiEndpoint: string): URL {
  const base = typeof window !== 'undefined' ? window.location.href : undefined;
  try {
    return new URL(apiEndpoint, base);
  } catch {
    throw new Error(`trending-news-api: apiEndpoint "${apiEndpoint}" is not a valid URL`);
  }
}

/**
 * Blank entries are dropped before the list reaches the URL: the topics come
 * from a free-text setting, and a trailing newline must not turn into an empty
 * topic the server then searches for.
 */
function cleanTopics(topics: string[] | undefined): string[] {
  return (topics ?? []).map((t) => t.trim()).filter(Boolean);
}

function buildUrl(apiEndpoint: string, options: TrendingNewsOptions) {
  const url = resolveEndpoint(apiEndpoint);
  if (options.topic) url.searchParams.set('topic', options.topic);

  const topics = options.topic ? [] : cleanTopics(options.topics);
  if (topics.length > 0) url.searchParams.set('topics', topics.join(','));

  // Ask the server for only as many topics as the caller keeps: each topic
  // costs it one upstream news search. A custom list already says how many
  // there are, so `limit` would only ever truncate it.
  if (options.limit && !options.topic && topics.length === 0) {
    url.searchParams.set('limit', String(options.limit));
  }
  return url.toString();
}

/**
 * The error for a failed request, carrying the server's own `error` message
 * (e.g. "THE_NEWS_API_KEY is not configured") when the body has one, so a
 * caller that shows it tells the reader what to fix, not just a status code.
 */
async function requestError(response: Response): Promise<Error> {
  let detail = '';
  try {
    const body = (await response.json()) as { error?: unknown; details?: unknown };
    if (typeof body?.error === 'string') {
      detail = body.error + (typeof body.details === 'string' ? ` — ${body.details}` : '');
    }
  } catch {
    // Not JSON — the status line is all there is.
  }
  const status = `${response.status}${response.statusText ? ` ${response.statusText}` : ''}`;
  return new Error(`Trending news request failed: ${status}${detail ? `: ${detail}` : ''}`);
}

/**
 * Fetches `url`, falling back to the last good response for that key when the
 * request fails for any reason.
 *
 * A trending-news widget is decoration on a page whose job is something else,
 * and the endpoint is a metered third party: a 502 from a rate limit, a dropped
 * connection or an offline tab should not blank it out. A week-old response is
 * strictly better than no response, so the cached copy is returned instead of
 * throwing — but only as a fallback, never in place of a fresh answer.
 *
 * `stale` is true when the cached copy was used, so a caller can tell the
 * difference between news and old news.
 */
async function fetchJson(
  url: string,
  key: string
): Promise<{ data: unknown; stale: boolean }> {
  let response: Response;
  try {
    response = await fetch(url, { headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    const cached = readStaleCachedTrendingNews<unknown>(key);
    if (cached) return { data: cached, stale: true };
    throw error;
  }

  if (!response.ok) {
    const cached = readStaleCachedTrendingNews<unknown>(key);
    if (cached) return { data: cached, stale: true };
    throw await requestError(response);
  }

  return { data: await response.json(), stale: false };
}

/**
 * Fetches trending topics (or, when `options.topic` is set, news for a
 * single topic) from a deployed instance of `worker/index.ts`.
 */
export async function getTrendingNews(options: TrendingNewsOptions): Promise<TrendingNewsData> {
  if (!options.apiEndpoint) {
    throw new Error('trending-news-api: apiEndpoint is required');
  }

  const url = buildUrl(options.apiEndpoint, options);

  // The raw wire body is what gets cached, so a stored answer and a fresh one
  // go through exactly the same mapping below.
  const cached = readCachedTrendingNews<WorkerTopicsResponse>(url);
  if (cached) return mapTopicsResponse(cached, options);

  const { data, stale } = await fetchJson(url, url);
  const payload = data as WorkerTopicsResponse;

  // A 200 carrying an error is still an error; the stale fallback has already
  // been tried by `fetchJson` for the statuses that trigger it.
  if (!stale && payload.error) {
    const cachedOnError = readStaleCachedTrendingNews<WorkerTopicsResponse>(url);
    if (cachedOnError) return mapTopicsResponse(cachedOnError, options);
    throw new Error(payload.error);
  }

  if (!stale) writeCachedTrendingNews(url, payload);
  return mapTopicsResponse(payload, options);
}

/** Maps a wire body to the public shape, truncating the daily ranking only. */
function mapTopicsResponse(
  data: WorkerTopicsResponse,
  options: TrendingNewsOptions
): TrendingNewsData {
  // A custom topic list is exactly what the caller asked for, so it is never
  // truncated — only the daily ranking is.
  const limit = cleanTopics(options.topics).length > 0 ? Infinity : (options.limit ?? 25);
  return {
    date: data.date,
    source: data.source,
    topics: (data.topics ?? []).slice(0, limit).map((t) => ({
      topic: t.topic,
      wikiRank: t.wiki_rank,
      wikiViews: t.wiki_views,
      newsCount: t.news_count,
      articles: mapArticles(t.articles),
    })),
  };
}

/** Fetches news articles for a single topic. */
export async function getTrendingNewsForTopic(
  topic: string,
  options: Omit<TrendingNewsOptions, 'topic'>
): Promise<TrendingNewsTopicData> {
  if (!options.apiEndpoint) {
    throw new Error('trending-news-api: apiEndpoint is required');
  }

  const url = buildUrl(options.apiEndpoint, { ...options, topic });

  const cached = readCachedTrendingNews<WorkerTopicResponse>(url);
  if (cached) return mapTopicResponse(cached);

  const { data, stale } = await fetchJson(url, url);
  const payload = data as WorkerTopicResponse;

  if (!stale && payload.error) {
    const cachedOnError = readStaleCachedTrendingNews<WorkerTopicResponse>(url);
    if (cachedOnError) return mapTopicResponse(cachedOnError);
    throw new Error(payload.error);
  }

  if (!stale) writeCachedTrendingNews(url, payload);
  return mapTopicResponse(payload);
}

function mapTopicResponse(data: WorkerTopicResponse): TrendingNewsTopicData {
  return {
    topic: data.topic,
    newsCount: data.news_count,
    articles: mapArticles(data.articles),
  };
}
