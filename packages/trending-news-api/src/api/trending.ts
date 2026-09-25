import type { NewsArticle, TrendingNewsData, TrendingNewsOptions, TrendingNewsTopicData } from '../types';
import { readCachedTrendingNews, writeCachedTrendingNews } from '../lib/cache';

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
 * (e.g. "THENEWSAPI_API_KEY is not configured") when the body has one, so a
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
 * Fetches trending topics (or, when `options.topic` is set, news for a
 * single topic) from a deployed instance of `worker/index.ts`.
 */
export async function getTrendingNews(options: TrendingNewsOptions): Promise<TrendingNewsData> {
  if (!options.apiEndpoint) {
    throw new Error('trending-news-api: apiEndpoint is required');
  }

  const url = buildUrl(options.apiEndpoint, options);

  const cached = readCachedTrendingNews<TrendingNewsData>(url);
  if (cached) return cached;

  const response = await fetch(url, { headers: { 'Content-Type': 'application/json' } });
  if (!response.ok) throw await requestError(response);

  const data = (await response.json()) as WorkerTopicsResponse;
  if (data.error) throw new Error(data.error);

  // A custom topic list is exactly what the caller asked for, so it is never
  // truncated — only the daily ranking is.
  const limit = cleanTopics(options.topics).length > 0 ? Infinity : (options.limit ?? 25);
  const result: TrendingNewsData = {
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

  writeCachedTrendingNews(url, result);
  return result;
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

  const cached = readCachedTrendingNews<TrendingNewsTopicData>(url);
  if (cached) return cached;

  const response = await fetch(url, { headers: { 'Content-Type': 'application/json' } });
  if (!response.ok) throw await requestError(response);

  const data = (await response.json()) as WorkerTopicResponse;
  if (data.error) throw new Error(data.error);

  const result: TrendingNewsTopicData = {
    topic: data.topic,
    newsCount: data.news_count,
    articles: mapArticles(data.articles),
  };

  writeCachedTrendingNews(url, result);
  return result;
}
