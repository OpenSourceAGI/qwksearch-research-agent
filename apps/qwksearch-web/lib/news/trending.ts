/**
 * @fileoverview Serves the homepage trending-news widget from this app, so a
 * deployment only needs a `THE_NEWS_API_KEY` — not a separately deployed
 * copy of `packages/trending-news-api/worker`.
 *
 * Three things sit between the widget and The News API, in this order:
 *
 * 1. **The admin settings** (`./settings`) decide whether the widget answers
 *    at all, and which topics it answers with when the visitor named none.
 * 2. **A KV cache**, because each cold answer costs one Wikipedia call plus
 *    one News API search *per topic*. The browser caches the same response in
 *    `localStorage`; this cache is what keeps the *first* visit of the next
 *    cache window cheap.
 * 3. **The D1 archive** (`./store`), written through on every successful
 *    fetch and read back when the upstream fails. The News API is metered and
 *    third-party: without the archive a missing key or a 429 turns the
 *    homepage card into a blank space.
 */
import {
  fetchWikipediaTopPages,
  handleTrendingNewsRequest,
  parseTopicLimit,
  parseTopicList,
  searchNewsForTopic,
} from "trending-news-api/server";
import type { TrendingNewsWireResponse } from "trending-news-api/server";
import { getCloudflareContext } from "../cloudflare/context";
import { getNewsWidgetSettings, resolveTopics } from "./settings";
import { readStoredTrendingNews, storeTrendingNews } from "./store";

const CACHE_PREFIX = "trending-news:v2:";

/**
 * How stale a stored answer may be before we would rather show nothing. A
 * week-old headline presented as news is worse than an absent widget.
 */
const FALLBACK_MAX_AGE_DAYS = 7;

/**
 * The News API token. Worker secrets are only on the Cloudflare env; local dev
 * and the Node server read it from `process.env`.
 */
export function getNewsApiKey(): string | undefined {
  let fromWorker: string | undefined;
  try {
    fromWorker = getCloudflareContext().env?.THE_NEWS_API_KEY;
  } catch {
    // No Cloudflare runtime (Node dev server, tests) — fall through.
  }
  return fromWorker || process.env.THE_NEWS_API_KEY || undefined;
}

function getKV(): any {
  try {
    return (getCloudflareContext().env as any)?.KV;
  } catch {
    return undefined;
  }
}

/**
 * Cache key for a request. The query is all that varies the body, but it is
 * normalised first — the same way the handler normalises it — so that
 * `?limit=6`, `?limit=06` and `?limit=99999` can't each open their own cache
 * entry (and their own upstream fan-out) for what is one answer.
 *
 * The resolved topic list is part of the key rather than the raw `?topics=`
 * string, so two visitors who wrote the same topics in a different order or
 * casing share one entry — and so a change to the admin default topics starts
 * answering from a new key instead of serving the old list until it expires.
 */
function cacheKey(url: URL, topics: string[]): string {
  const topic = url.searchParams.get("topic");
  if (topic) return `${CACHE_PREFIX}topic:${topic.trim().toLowerCase().slice(0, 120)}`;
  if (topics.length > 0) {
    const normalised = [...topics].map((t) => t.toLowerCase()).sort().join("|");
    return `${CACHE_PREFIX}topics:${normalised}`;
  }
  return `${CACHE_PREFIX}top:${parseTopicLimit(url.searchParams.get("limit"))}`;
}

function jsonResponse(
  body: string,
  status: number,
  cache: "HIT" | "MISS" | "BYPASS" | "STORED" | "OFF",
  cacheSeconds: number,
): Response {
  return new Response(body, {
    status,
    headers: {
      "content-type": "application/json",
      // Public and non-personalised when it worked; never hold on to a failure.
      "Cache-Control":
        status === 200 ? `public, max-age=${cacheSeconds}` : "no-store",
      "X-Trending-News-Cache": cache,
    },
  });
}

/**
 * Rebuilds the upstream request with the topics we resolved, so the shared
 * handler sees one unambiguous instruction. A visitor's `?topics=` has already
 * been merged with (or overridden by) the admin settings at this point.
 */
function upstreamRequest(request: Request, topics: string[]): Request {
  const url = new URL(request.url);
  url.searchParams.delete("topics");
  if (topics.length > 0) url.searchParams.set("topics", topics.join(","));
  return new Request(url.toString(), { headers: request.headers });
}

function isEmptyList(body: string): boolean {
  try {
    return ((JSON.parse(body) as TrendingNewsWireResponse).topics ?? []).length === 0;
  } catch {
    return false;
  }
}

/**
 * Answers a trending-news request.
 *
 * Errors are never cached, so a News API blip doesn't stick around for the
 * whole cache window — but a blip does fall through to the D1 archive, which
 * is served with a `STORED` cache marker and no `max-age`, so the next request
 * tries the upstream again.
 *
 * Cross-origin access is decided by this app's own allowlist (`lib/cors`), not
 * by the `Access-Control-Allow-Origin: *` the standalone worker sends — hence
 * rebuilding the response rather than passing it straight through.
 */
export async function serveTrendingNews(request: Request): Promise<Response> {
  const settings = await getNewsWidgetSettings();
  const url = new URL(request.url);

  // Switched off site-wide: answer with an empty list rather than an error, so
  // the widget simply renders nothing instead of retrying a failing endpoint.
  if (!settings.enabled) {
    return jsonResponse(
      JSON.stringify({ source: "disabled", date: "", topics: [] }),
      200,
      "OFF",
      60,
    );
  }

  const cacheSeconds = settings.cacheMinutes * 60;
  const apiKey = getNewsApiKey();
  const kv = getKV();

  // A single `?topic=` lookup is a different route (one topic's headlines) and
  // is not affected by the configured topic list.
  const singleTopic = url.searchParams.get("topic");
  const topics = singleTopic
    ? []
    : resolveTopics(settings, url.searchParams.get("topics"));
  const key = cacheKey(url, topics);

  if (kv && apiKey) {
    try {
      const cached = await kv.get(key);
      if (cached) return jsonResponse(cached, 200, "HIT", cacheSeconds);
    } catch (error) {
      console.error("Trending news cache read failed:", error);
    }
  }

  const response = await handleTrendingNewsRequest(upstreamRequest(request, topics), {
    apiKey,
  });
  const body = await response.text();

  // An empty daily ranking is a failure in disguise (every topic came back
  // without headlines): don't pin it in KV for the whole cache window, and
  // let the archive below answer instead.
  const emptyDaily =
    response.status === 200 && !singleTopic && topics.length === 0 && isEmptyList(body);

  if (response.status === 200 && !emptyDaily) {
    if (!singleTopic) {
      // Write-through. D1 is awaited rather than backgrounded because this
      // runtime hands route handlers no `waitUntil`; it only happens on a
      // cache miss, and `storeTrendingNews` swallows its own failures.
      try {
        await storeTrendingNews(JSON.parse(body) as TrendingNewsWireResponse);
      } catch (error) {
        console.error("Trending news store failed:", error);
      }
    }

    if (kv) {
      try {
        await kv.put(key, body, { expirationTtl: cacheSeconds });
      } catch (error) {
        console.error("Trending news cache write failed:", error);
      }
    }

    return jsonResponse(body, 200, kv ? "MISS" : "BYPASS", cacheSeconds);
  }

  // The upstream is unhappy (no key, rate-limited, down). Serve the archive
  // if it has anything recent enough to be worth showing.
  if (!singleTopic) {
    const stored = await readStoredTrendingNews({
      topics,
      limit: topics.length > 0 ? topics.length : parseTopicLimit(url.searchParams.get("limit")),
      maxAgeDays: FALLBACK_MAX_AGE_DAYS,
    });
    if (stored) {
      return jsonResponse(JSON.stringify({ ...stored, stale: true }), 200, "STORED", 0);
    }
  }

  return jsonResponse(body, response.status, kv ? "MISS" : "BYPASS", cacheSeconds);
}

/**
 * Fetches and stores the current news without serving it — the admin panel's
 * "Refresh now". Returns how many articles were written.
 */
export async function refreshStoredNews(): Promise<{
  stored: number;
  topics: number;
  error?: string;
}> {
  const settings = await getNewsWidgetSettings();
  const apiKey = getNewsApiKey();
  const topics = parseTopicList(settings.defaultTopics);

  const url = new URL("https://news.internal/");
  if (topics.length > 0) url.searchParams.set("topics", topics.join(","));
  else url.searchParams.set("limit", String(Math.max(settings.maxTopics, 10)));

  const response = await handleTrendingNewsRequest(new Request(url.toString()), {
    apiKey,
  });
  const payload = (await response.json()) as TrendingNewsWireResponse & {
    error?: string;
    details?: string;
  };

  if (response.status !== 200) {
    const error = payload.error ?? `HTTP ${response.status}`;
    return { stored: 0, topics: 0, error: payload.details ? `${error} — ${payload.details}` : error };
  }
  if (!payload.topics?.length) {
    return { stored: 0, topics: 0, error: "The News API returned no headlines for any topic." };
  }

  const stored = await storeTrendingNews(payload);
  return { stored, topics: payload.topics?.length ?? 0 };
}

/** One line of the admin panel's health check. */
export type NewsDiagnostic = {
  name: string;
  ok: boolean;
  detail: string;
};

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Checks each thing the widget depends on, one at a time, so the admin panel
 * can say *which* one is broken instead of showing an empty widget. Costs one
 * News API search and one Wikipedia call; never throws.
 */
export async function diagnoseNews(): Promise<NewsDiagnostic[]> {
  const checks: NewsDiagnostic[] = [];
  const settings = await getNewsWidgetSettings();

  checks.push({
    name: "Widget enabled",
    ok: settings.enabled,
    detail: settings.enabled
      ? "The widget is switched on for the homepage."
      : "Switched off below — /api/news/trending answers an empty list and the homepage hides it.",
  });

  const apiKey = getNewsApiKey();
  checks.push({
    name: "THE_NEWS_API_KEY",
    ok: Boolean(apiKey),
    detail: apiKey
      ? "Set on this deployment."
      : "Not set. Add it to .env, or run `bunx wrangler secret put THE_NEWS_API_KEY` in production. Get a key at https://www.thenewsapi.com.",
  });

  if (apiKey) {
    try {
      const articles = await searchNewsForTopic(apiKey, "news", 3);
      checks.push({
        name: "The News API",
        ok: true,
        detail: `Reachable — a test search returned ${articles.length} article(s).`,
      });
    } catch (error) {
      checks.push({ name: "The News API", ok: false, detail: errorText(error) });
    }
  } else {
    checks.push({ name: "The News API", ok: false, detail: "Skipped: no API key." });
  }

  if (parseTopicList(settings.defaultTopics).length > 0) {
    checks.push({
      name: "Wikipedia trending ranking",
      ok: true,
      detail: "Not used — default topics are set, so the ranking is skipped.",
    });
  } else {
    try {
      const yesterday = new Date();
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      const pages = await fetchWikipediaTopPages(yesterday, 5);
      checks.push({
        name: "Wikipedia trending ranking",
        ok: pages.length > 0,
        detail:
          pages.length > 0
            ? `Reachable — top topics: ${pages.map((p) => p.article).join(", ")}.`
            : "Reachable, but it returned no articles.",
      });
    } catch (error) {
      checks.push({ name: "Wikipedia trending ranking", ok: false, detail: errorText(error) });
    }
  }

  checks.push({
    name: "KV cache",
    ok: Boolean(getKV()),
    detail: getKV()
      ? "Bound — answers are cached between visits."
      : "No KV binding — every visit fetches fresh (works, but costs more News API quota).",
  });

  return checks;
}
