/**
 * @fileoverview Server half of the widget: joins Wikipedia's daily pageview
 * ranking to headlines from The News API.
 *
 * Shared by the bundled Cloudflare Worker (`worker/index.ts`) and by host apps
 * that would rather serve the widget from an API route they already deploy
 * than stand up a second worker — both go through `handleTrendingNewsRequest`,
 * so there is exactly one wire format for the client in `src/api/trending.ts`
 * to read.
 *
 * Nothing here touches the DOM or React: it is plain `fetch`/`Request`/
 * `Response`, so it runs on Workers, Node 18+, Bun and Deno alike. The News
 * API key stays on the server.
 */

/** One headline, in the snake_case wire shape the client maps to camelCase. */
export interface TrendingNewsWireArticle {
  title: string;
  url?: string;
  source?: string;
  published_at?: string;
  image_url?: string;
}

/** One trending topic with the headlines matched to it. */
export interface TrendingNewsWireTopic {
  topic: string;
  wiki_rank?: number;
  wiki_views?: number;
  news_count: number;
  articles: TrendingNewsWireArticle[];
}

/** Body of `GET /` — the daily trending list. */
export interface TrendingNewsWireResponse {
  source: string;
  date: string;
  topics: TrendingNewsWireTopic[];
}

/**
 * The most topics a caller may name in `?topics=`. Each one costs an upstream
 * news search, so an unbounded list is a way to burn the API quota in one
 * request.
 */
export const MAX_CUSTOM_TOPICS = 20;

/** Body of `GET /?topic=…` — headlines for one topic. */
export interface TrendingNewsWireTopicResponse {
  topic: string;
  news_count: number;
  articles: TrendingNewsWireArticle[];
}

export interface TrendingTopicsOptions {
  /** The News API (thenewsapi.com) token. */
  apiKey: string;
  /** How many topics to return (default 25, capped at 50). */
  limit?: number;
  /** Day to rank by pageviews. Defaults to yesterday UTC — see below. */
  date?: Date;
  /** Injected for tests; defaults to the global `fetch`. */
  fetchImpl?: typeof fetch;
}

type WikiTopPage = {
  rank: number;
  article: string;
  views: number;
};

type NewsApiArticle = {
  title?: string;
  description?: string;
  source?: string;
  url?: string;
  published_at?: string;
  image_url?: string;
};

export const DEFAULT_TOPIC_LIMIT = 25;
export const MAX_TOPIC_LIMIT = 50;

/** Headlines requested per topic in the daily list, and for a single topic. */
const ARTICLES_PER_TOPIC = 20;
const ARTICLES_FOR_SINGLE_TOPIC = 30;

/**
 * Topics whose news search runs at once. The daily list needs one News API
 * call per topic; sequentially that is a visible wait on a homepage widget,
 * and unbounded it would burst the API's rate limit.
 */
const SEARCH_CONCURRENCY = 5;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'no-store',
};

// Wikipedia's daily "top viewed" list is dominated by navigation pages that
// aren't real trending topics — filter those out rather than surfacing
// "Main Page" as the #1 trend every day.
const NON_ARTICLE_TITLE = /^(Main_Page|Special:|Wikipedia:|Portal:|File:|Talk:|Category:)/i;

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json', ...CORS_HEADERS },
  });
}

/** Clamps a caller-supplied topic count to something we're willing to fetch. */
export function parseTopicLimit(
  raw: string | number | null | undefined,
  fallback: number = DEFAULT_TOPIC_LIMIT
): number {
  const value = typeof raw === 'string' ? Number(raw) : raw;
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return fallback;
  return Math.min(MAX_TOPIC_LIMIT, Math.floor(value));
}

/**
 * Parses a caller-supplied custom topic list (`?topics=a,b,c`, or newline
 * separated) into clean, de-duplicated topic names.
 *
 * Topics come from user settings, so they are untrusted: each one is trimmed,
 * length-capped and compared case-insensitively for de-duplication, and the
 * list is capped at `MAX_CUSTOM_TOPICS`.
 */
export function parseTopicList(raw: string | string[] | null | undefined): string[] {
  if (!raw) return [];
  const parts = Array.isArray(raw) ? raw : raw.split(/[,\n]/);
  const seen = new Set<string>();
  const topics: string[] = [];
  for (const part of parts) {
    const topic = String(part).trim().slice(0, 120);
    if (!topic) continue;
    const key = topic.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    topics.push(topic);
    if (topics.length >= MAX_CUSTOM_TOPICS) break;
  }
  return topics;
}

/** The UTC date the pageviews API has complete data for (see `getTrendingTopics`). */
function defaultPageviewsDate(now: Date = new Date()): Date {
  const d = new Date(now);
  d.setUTCDate(d.getUTCDate() - 1);
  return d;
}

function formatDate(d: Date): string {
  return [
    String(d.getUTCFullYear()).padStart(4, '0'),
    String(d.getUTCMonth() + 1).padStart(2, '0'),
    String(d.getUTCDate()).padStart(2, '0'),
  ].join('-');
}

/**
 * Fetch daily top Wikipedia articles by pageviews for a given date, via the
 * Wikimedia Analytics API.
 */
export async function fetchWikipediaTopPages(
  date: Date,
  limit = DEFAULT_TOPIC_LIMIT,
  fetchImpl: typeof fetch = fetch
): Promise<WikiTopPage[]> {
  const [year, month, day] = formatDate(date).split('-');
  const url = `https://wikimedia.org/api/rest_v1/metrics/pageviews/top-per-article/en.wikipedia.org/all-access/all-agents/${year}/${month}/${day}`;

  const res = await fetchImpl(url, { headers: { 'User-Agent': 'trending-news-api' } });
  if (!res.ok) {
    throw new Error(`Failed to fetch Wikipedia top pages: ${res.status}`);
  }

  const data = (await res.json()) as {
    items?: Array<{ article: string; views: number; rank?: number }>;
  };

  const items = (data.items ?? []).filter((it) => !NON_ARTICLE_TITLE.test(it.article));

  return items.slice(0, limit).map((it, i) => ({
    rank: it.rank ?? i + 1,
    article: decodeURIComponent(it.article.replace(/_/g, ' ')),
    views: it.views,
  }));
}

/**
 * Search news for a given query using The News API (thenewsapi.com). A failed
 * lookup yields no articles rather than throwing: one topic the API dislikes
 * shouldn't cost the whole trending list.
 */
export async function searchNewsForTopic(
  apiKey: string,
  query: string,
  limit = ARTICLES_PER_TOPIC,
  fetchImpl: typeof fetch = fetch
): Promise<NewsApiArticle[]> {
  const url = new URL('https://api.thenewsapi.com/v1/news/search');
  url.searchParams.set('api_token', apiKey);
  url.searchParams.set('q', query);
  url.searchParams.set('language', 'en');
  url.searchParams.set('limit', String(limit));

  const res = await fetchImpl(url.toString());
  if (!res.ok) return [];

  const data = (await res.json()) as { data?: NewsApiArticle[] };
  return data.data ?? [];
}

function toArticlePayload(articles: NewsApiArticle[]): TrendingNewsWireArticle[] {
  return articles.map((a) => ({
    title: a.title ?? '',
    url: a.url,
    source: a.source,
    published_at: a.published_at,
    image_url: a.image_url,
  }));
}

/**
 * The daily trending list: Wikipedia's most-viewed articles, each paired with
 * the headlines The News API returns for it. Topics with no headlines are
 * dropped, so we look at up to twice as many Wikipedia entries as the caller
 * asked for topics and stop as soon as the quota is filled.
 *
 * Pageviews lag about a day, so the ranking is read for *yesterday* (UTC)
 * unless a `date` is passed.
 */
export async function getTrendingTopics(
  options: TrendingTopicsOptions
): Promise<TrendingNewsWireResponse> {
  const { apiKey, fetchImpl = fetch } = options;
  const limit = parseTopicLimit(options.limit);
  const date = options.date ?? defaultPageviewsDate();

  const candidates = await fetchWikipediaTopPages(
    date,
    Math.min(MAX_TOPIC_LIMIT, limit * 2),
    fetchImpl
  );

  const results: TrendingNewsWireTopic[] = [];
  for (let i = 0; i < candidates.length && results.length < limit; i += SEARCH_CONCURRENCY) {
    const batch = candidates.slice(i, i + SEARCH_CONCURRENCY);
    const searched = await Promise.all(
      batch.map(async (entry) => ({
        entry,
        articles: await searchNewsForTopic(apiKey, entry.article, ARTICLES_PER_TOPIC, fetchImpl),
      }))
    );

    for (const { entry, articles } of searched) {
      if (!articles.length) continue;
      results.push({
        topic: entry.article,
        wiki_rank: entry.rank,
        wiki_views: entry.views,
        news_count: articles.length,
        articles: toArticlePayload(articles),
      });
    }
  }

  results.sort((a, b) => (a.wiki_rank ?? 999) - (b.wiki_rank ?? 999));

  return {
    source: 'wikipedia_daily_top',
    date: formatDate(date),
    topics: results.slice(0, limit),
  };
}

/**
 * The same wire shape as the daily list, but built from topics the caller
 * named instead of Wikipedia's ranking — this is what backs per-user custom
 * topics and an admin-configured default topic list.
 *
 * Ordering is the caller's, not a popularity ranking, so no `wiki_rank` is
 * attached and the result is not re-sorted. Unlike the daily list, a topic
 * with no headlines is *kept* (with `news_count: 0`): the user asked for it by
 * name, and silently dropping it reads as the setting not having been saved.
 * Searches run in the same bounded batches as the daily list.
 */
export async function getCustomTopicNews(
  topics: string[],
  options: { apiKey: string; fetchImpl?: typeof fetch }
): Promise<TrendingNewsWireResponse> {
  const { apiKey, fetchImpl = fetch } = options;
  const wanted = parseTopicList(topics);

  const results: TrendingNewsWireTopic[] = [];
  for (let i = 0; i < wanted.length; i += SEARCH_CONCURRENCY) {
    const batch = wanted.slice(i, i + SEARCH_CONCURRENCY);
    const searched = await Promise.all(
      batch.map(async (topic) => ({
        topic,
        articles: await searchNewsForTopic(apiKey, topic, ARTICLES_PER_TOPIC, fetchImpl),
      }))
    );

    for (const { topic, articles } of searched) {
      results.push({
        topic,
        news_count: articles.length,
        articles: toArticlePayload(articles),
      });
    }
  }

  return {
    source: 'custom_topics',
    date: formatDate(new Date()),
    topics: results,
  };
}

/** Headlines for a single topic, bypassing the Wikipedia ranking. */
export async function getTopicHeadlines(
  topic: string,
  options: { apiKey: string; fetchImpl?: typeof fetch }
): Promise<TrendingNewsWireTopicResponse> {
  const articles = await searchNewsForTopic(
    options.apiKey,
    topic,
    ARTICLES_FOR_SINGLE_TOPIC,
    options.fetchImpl ?? fetch
  );

  return {
    topic,
    news_count: articles.length,
    articles: toArticlePayload(articles),
  };
}

/**
 * Serves the three routes the client speaks:
 *
 * - `GET /` — the daily trending list (`?limit=` topics, default 25).
 * - `GET /?topic=…` — headlines for one topic.
 * - `GET /?topics=a,b,c` — headlines for a caller-named topic list, in that
 *   order, instead of the Wikipedia ranking.
 *
 * Always answers with JSON, including for failures, so a widget that only
 * reads `error` never has to parse an HTML error page.
 */
export async function handleTrendingNewsRequest(
  request: Request,
  options: { apiKey: string | undefined; fetchImpl?: typeof fetch }
): Promise<Response> {
  const { apiKey, fetchImpl } = options;
  if (!apiKey) {
    return jsonResponse({ error: 'THENEWSAPI_API_KEY is not configured' }, 500);
  }

  const params = new URL(request.url).searchParams;
  const topic = params.get('topic');
  // `topics` is only honoured when it survives parsing — a list of nothing but
  // whitespace must fall through to the daily ranking rather than render an
  // empty widget.
  const customTopics = parseTopicList(params.get('topics'));

  try {
    if (topic) {
      return jsonResponse(await getTopicHeadlines(topic, { apiKey, fetchImpl }));
    }

    if (customTopics.length > 0) {
      return jsonResponse(await getCustomTopicNews(customTopics, { apiKey, fetchImpl }));
    }

    return jsonResponse(
      await getTrendingTopics({
        apiKey,
        limit: parseTopicLimit(params.get('limit')),
        fetchImpl,
      })
    );
  } catch (e) {
    return jsonResponse(
      {
        error: topic
          ? 'Failed to fetch news for topic'
          : customTopics.length > 0
            ? 'Failed to fetch news for topics'
            : 'Failed to fetch Wikipedia trends',
        details: e instanceof Error ? e.message : String(e),
      },
      500
    );
  }
}
