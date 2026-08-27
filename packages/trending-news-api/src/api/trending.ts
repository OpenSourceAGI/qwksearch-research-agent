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

function buildUrl(apiEndpoint: string, options: TrendingNewsOptions) {
  const url = new URL(apiEndpoint);
  if (options.topic) url.searchParams.set('topic', options.topic);
  return url.toString();
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
  if (!response.ok) {
    throw new Error(`Trending news request failed: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as WorkerTopicsResponse;
  if (data.error) throw new Error(data.error);

  const limit = options.limit ?? 25;
  const result: TrendingNewsData = {
    date: data.date,
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
  if (!response.ok) {
    throw new Error(`Trending news request failed: ${response.status} ${response.statusText}`);
  }

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
