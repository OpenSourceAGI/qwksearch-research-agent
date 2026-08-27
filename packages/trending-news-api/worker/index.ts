export interface Env {
  THENEWSAPI_API_KEY: string;
}

type NewsApiArticle = {
  title?: string;
  description?: string;
  source?: string;
  url?: string;
  published_at?: string;
  image_url?: string;
};

type WikiTopPage = {
  rank: number;
  article: string;
  views: number;
};

type TopicPayload = {
  topic: string;
  wiki_rank?: number;
  wiki_views?: number;
  news_count: number;
  articles: Array<{
    title: string;
    url?: string;
    source?: string;
    published_at?: string;
    image_url?: string;
  }>;
};

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

/**
 * Fetch daily top Wikipedia articles by pageviews for a given date, via the
 * Wikimedia Analytics API.
 */
async function fetchWikipediaTopPages(
  year: number,
  month: number,
  day: number,
  limit = 25
): Promise<WikiTopPage[]> {
  const url = `https://wikimedia.org/api/rest_v1/metrics/pageviews/top-per-article/en.wikipedia.org/all-access/all-agents/${String(year).padStart(4, '0')}/${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}`;

  const res = await fetch(url, { headers: { 'User-Agent': 'trending-news-api-worker' } });
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
 * Search news for a given query using The News API (thenewsapi.com).
 */
async function searchNewsForTopic(
  apiKey: string,
  query: string,
  limit = 20
): Promise<NewsApiArticle[]> {
  const url = new URL('https://api.thenewsapi.com/v1/news/search');
  url.searchParams.set('api_token', apiKey);
  url.searchParams.set('q', query);
  url.searchParams.set('language', 'en');
  url.searchParams.set('limit', String(limit));

  const res = await fetch(url.toString());
  if (!res.ok) return [];

  const data = (await res.json()) as { data?: NewsApiArticle[] };
  return data.data ?? [];
}

function toArticlePayload(articles: NewsApiArticle[]) {
  return articles.map((a) => ({
    title: a.title ?? '',
    url: a.url,
    source: a.source,
    published_at: a.published_at,
    image_url: a.image_url,
  }));
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const topic = url.searchParams.get('topic');

    const apiKey = env.THENEWSAPI_API_KEY;
    if (!apiKey) {
      return jsonResponse({ error: 'THENEWSAPI_API_KEY is not configured' }, 500);
    }

    // A specific topic was requested: return news for that topic only.
    if (topic) {
      const articles = await searchNewsForTopic(apiKey, topic, 30);
      return jsonResponse({
        topic,
        news_count: articles.length,
        articles: toArticlePayload(articles),
      });
    }

    // Otherwise: fetch Wikipedia's daily top pages and news for each.
    // Pageviews data typically lags by ~1 day, so use yesterday's date.
    const now = new Date();
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - 1);
    const year = d.getUTCFullYear();
    const month = d.getUTCMonth() + 1;
    const day = d.getUTCDate();

    let wikiEntries: WikiTopPage[];
    try {
      wikiEntries = await fetchWikipediaTopPages(year, month, day, 25);
    } catch (e) {
      return jsonResponse(
        {
          error: 'Failed to fetch Wikipedia trends',
          details: e instanceof Error ? e.message : String(e),
        },
        500
      );
    }

    const results: TopicPayload[] = [];
    for (const entry of wikiEntries) {
      const articles = await searchNewsForTopic(apiKey, entry.article, 20);
      if (!articles.length) continue;

      results.push({
        topic: entry.article,
        wiki_rank: entry.rank,
        wiki_views: entry.views,
        news_count: articles.length,
        articles: toArticlePayload(articles),
      });
    }

    results.sort((a, b) => (a.wiki_rank ?? 999) - (b.wiki_rank ?? 999));

    return jsonResponse({
      source: 'wikipedia_daily_top',
      date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      topics: results,
    });
  },
} satisfies ExportedHandler<Env>;
