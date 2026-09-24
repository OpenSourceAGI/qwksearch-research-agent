/**
 * @fileoverview Durable storage for the news the homepage widget fetches.
 *
 * The KV cache in `./trending.ts` answers "what did we serve in the last ten
 * minutes"; this answers "what have we ever seen". Two things need that:
 *
 * - **The widget, when the upstream is unavailable.** The News API is a
 *   metered third party — a missing key, a 429 or an outage otherwise turns
 *   the homepage card into nothing. Yesterday's headlines are a far better
 *   answer than a blank space, as long as they are labelled stale.
 * - **The admin panel**, which reports what the widget is actually serving
 *   (topics, article counts, when each was last fetched).
 *
 * Writes are best-effort and never block the response: a store that is down
 * must cost the archive, not the page. Reads are bounded by topic so one
 * enormous topic cannot dominate the fallback.
 */
import { and, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { getDB, getQueryDB } from "../database";
import { newsArticles } from "../database/schema";
import type {
  TrendingNewsWireResponse,
  TrendingNewsWireTopic,
} from "trending-news-api/server";

/** Headlines kept per topic. The widget shows at most five. */
const STORED_ARTICLES_PER_TOPIC = 20;

/**
 * Rows written in one statement. D1 binds parameters per statement and each
 * article is eleven of them, so a 25-topic fetch has to be chunked rather than
 * sent as one 500-row insert.
 */
const INSERT_CHUNK = 25;

type StorableArticle = {
  topic: string;
  topicSource: string;
  title: string;
  url: string;
  source: string | null;
  imageUrl: string | null;
  publishedAt: string | null;
  wikiRank: number | null;
  wikiViews: number | null;
  fetchedAt: Date;
};

function flatten(
  payload: TrendingNewsWireResponse,
  fetchedAt: Date,
): StorableArticle[] {
  const rows: StorableArticle[] = [];
  for (const topic of payload.topics ?? []) {
    for (const article of (topic.articles ?? []).slice(0, STORED_ARTICLES_PER_TOPIC)) {
      // A headline with no URL cannot be de-duplicated or linked, so there is
      // nothing worth keeping about it.
      if (!article.url || !article.title) continue;
      rows.push({
        topic: topic.topic,
        topicSource: payload.source ?? "wikipedia_daily_top",
        title: article.title,
        url: article.url,
        source: article.source ?? null,
        imageUrl: article.image_url ?? null,
        publishedAt: article.published_at ?? null,
        wikiRank: topic.wiki_rank ?? null,
        wikiViews: topic.wiki_views ?? null,
        fetchedAt,
      });
    }
  }
  return rows;
}

/**
 * Stores a fetched payload. Re-seeing an article updates the existing row
 * (`fetchedAt`, and any metadata the upstream has since filled in) instead of
 * inserting a duplicate — `(topic, url)` is unique.
 *
 * Returns the number of articles written, or 0 if the store was unavailable.
 * Never throws: the caller is on the response path.
 */
export async function storeTrendingNews(
  payload: TrendingNewsWireResponse,
  now: Date = new Date(),
): Promise<number> {
  const rows = flatten(payload, now);
  if (rows.length === 0) return 0;

  try {
    const db = getDB();
    for (let i = 0; i < rows.length; i += INSERT_CHUNK) {
      await db
        .insert(newsArticles)
        .values(rows.slice(i, i + INSERT_CHUNK))
        .onConflictDoUpdate({
          target: [newsArticles.topic, newsArticles.url],
          set: {
            title: sql`excluded.title`,
            source: sql`excluded.source`,
            imageUrl: sql`excluded.image_url`,
            publishedAt: sql`excluded.published_at`,
            wikiRank: sql`excluded.wiki_rank`,
            wikiViews: sql`excluded.wiki_views`,
            topicSource: sql`excluded.topic_source`,
            fetchedAt: sql`excluded.fetched_at`,
          },
        });
    }
    return rows.length;
  } catch (error) {
    console.error("News article store failed:", error);
    return 0;
  }
}

/**
 * Rebuilds a wire payload from stored articles, for serving when the upstream
 * is unavailable.
 *
 * `topics` names the topics to rebuild — the visitor's custom list. With none
 * given, the most recently fetched topics are used, which is the stored form
 * of "the daily trending list". `null` means there was nothing usable to serve.
 */
export async function readStoredTrendingNews(options: {
  topics?: string[];
  limit?: number;
  maxAgeDays?: number;
}): Promise<TrendingNewsWireResponse | null> {
  const { topics = [], limit = 25, maxAgeDays = 7 } = options;
  const since = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000);

  try {
    const db = getDB();
    const rows = await db
      .select()
      .from(newsArticles)
      .where(
        topics.length > 0
          ? and(inArray(newsArticles.topic, topics), gte(newsArticles.fetchedAt, since))
          : gte(newsArticles.fetchedAt, since),
      )
      .orderBy(desc(newsArticles.fetchedAt), desc(newsArticles.id))
      // Enough rows to fill `limit` topics even when one topic is deep.
      .limit(limit * STORED_ARTICLES_PER_TOPIC);

    if (rows.length === 0) return null;

    const byTopic = new Map<string, TrendingNewsWireTopic>();
    let newest = 0;
    let topicSource = "wikipedia_daily_top";

    for (const row of rows) {
      const fetchedAt =
        row.fetchedAt instanceof Date ? row.fetchedAt.getTime() : Number(row.fetchedAt) * 1000;
      if (fetchedAt > newest) {
        newest = fetchedAt;
        topicSource = row.topicSource;
      }

      let topic = byTopic.get(row.topic);
      if (!topic) {
        if (byTopic.size >= limit && topics.length === 0) continue;
        topic = {
          topic: row.topic,
          wiki_rank: row.wikiRank ?? undefined,
          wiki_views: row.wikiViews ?? undefined,
          news_count: 0,
          articles: [],
        };
        byTopic.set(row.topic, topic);
      }
      topic.articles.push({
        title: row.title,
        url: row.url,
        source: row.source ?? undefined,
        published_at: row.publishedAt ?? undefined,
        image_url: row.imageUrl ?? undefined,
      });
      topic.news_count = topic.articles.length;
    }

    let ordered = [...byTopic.values()];
    if (topics.length > 0) {
      // A custom list keeps the order the visitor wrote it in.
      const rank = new Map(topics.map((t, i) => [t, i]));
      ordered.sort((a, b) => (rank.get(a.topic) ?? 999) - (rank.get(b.topic) ?? 999));
    } else {
      ordered.sort((a, b) => (a.wiki_rank ?? 999) - (b.wiki_rank ?? 999));
    }
    ordered = ordered.slice(0, limit);
    if (ordered.length === 0) return null;

    return {
      source: topicSource,
      date: new Date(newest || Date.now()).toISOString().slice(0, 10),
      topics: ordered,
    };
  } catch (error) {
    console.error("Stored news read failed:", error);
    return null;
  }
}

/** What the admin panel shows about the archive. */
export type NewsStoreStats = {
  articleCount: number;
  topicCount: number;
  lastFetchedAt: string | null;
  topTopics: { topic: string; articleCount: number; lastFetchedAt: string | null }[];
};

export async function getNewsStoreStats(topicLimit = 12): Promise<NewsStoreStats> {
  try {
    const db = getQueryDB();
    const rows = await db
      .select({
        topic: newsArticles.topic,
        articleCount: sql<number>`count(*)`,
        lastFetchedAt: sql<number>`max(${newsArticles.fetchedAt})`,
      })
      .from(newsArticles)
      .groupBy(newsArticles.topic)
      .orderBy(desc(sql`max(${newsArticles.fetchedAt})`))
      .limit(topicLimit);

    const totals = await db
      .select({
        articleCount: sql<number>`count(*)`,
        topicCount: sql<number>`count(distinct ${newsArticles.topic})`,
        lastFetchedAt: sql<number>`max(${newsArticles.fetchedAt})`,
      })
      .from(newsArticles);

    const total = totals[0];
    const toIso = (v: number | null | undefined) =>
      v ? new Date(Number(v) * 1000).toISOString() : null;

    return {
      articleCount: Number(total?.articleCount ?? 0),
      topicCount: Number(total?.topicCount ?? 0),
      lastFetchedAt: toIso(total?.lastFetchedAt),
      topTopics: rows.map((r) => ({
        topic: r.topic,
        articleCount: Number(r.articleCount),
        lastFetchedAt: toIso(r.lastFetchedAt),
      })),
    };
  } catch (error) {
    console.error("News store stats failed:", error);
    return { articleCount: 0, topicCount: 0, lastFetchedAt: null, topTopics: [] };
  }
}

/** Drops articles older than `retentionDays`. Returns rows deleted. */
export async function pruneStoredNews(retentionDays: number): Promise<number> {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  const result: any = await getQueryDB()
    .delete(newsArticles)
    .where(lt(newsArticles.fetchedAt, cutoff));
  return Number(result?.rowsAffected ?? result?.meta?.changes ?? 0);
}

/** Empties the archive. Used by the admin panel's "clear stored news". */
export async function clearStoredNews(): Promise<number> {
  const result: any = await getQueryDB().delete(newsArticles);
  return Number(result?.rowsAffected ?? result?.meta?.changes ?? 0);
}

/** Stored headlines for one topic, newest first — for the admin panel. */
export async function readStoredTopicArticles(topic: string, limit = 50) {
  return getDB()
    .select()
    .from(newsArticles)
    .where(eq(newsArticles.topic, topic))
    .orderBy(desc(newsArticles.fetchedAt), desc(newsArticles.id))
    .limit(limit);
}
