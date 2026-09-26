---
name: ask-trending-news
description: Guide to trending-news-api (packages/trending-news-api), the React trending-news widget and its backend — getTrendingNews / getTrendingNewsForTopic, the useTrendingNews hook, the TrendingNews component with compact and expandable modes, custom topic lists (the `topics` option and `?topics=`), the 10-minute localStorage cache, the trending-news-api/server handler, and the worker that joins Wikipedia daily pageviews to The News API. Also covers qwksearch-web's side of it: the D1 article archive, the admin News Widget page and the per-user "My News Topics" setting. Use when embedding or restyling the trending widget, when the homepage widget renders empty, when it throws about a missing apiEndpoint, when topics look like navigation pages, when a user's or the site's custom topics are not taking effect, or when deploying and configuring the worker or the app's own /api/news/trending route.
---

# Working With trending-news-api

`packages/trending-news-api`, published as **trending-news-api**. Two halves: a React
widget, and `src/server/index.ts`, which produces the data by taking Wikipedia's daily
most-viewed articles as the trending topics and fetching news for each from
[The News API](https://thenewsapi.com). That handler runs either as the bundled
Cloudflare Worker (`worker/index.ts`) or inside a host app's own API route.

The widget needs an `apiEndpoint`; there is no bundled fallback data. Inside this
monorepo it already has one: qwksearch-web serves the handler at
**`/api/news/trending`** (`app/api/news/trending/route.ts` → `lib/news/trending.ts`),
and `researchAgentUIConfig.trendingNewsApiUrl` points the homepage widget there, so the
only setup is the `THE_NEWS_API_KEY` env var. The `trendingNewsApiUrl` **setting**
overrides that per user, for reading from a separately deployed worker instead.

Topics come from one of three places, in this order: the visitor's **My News Topics**
setting, the site's **default topics** (admin panel), and otherwise Wikipedia's daily
ranking. See [In qwksearch-web](#in-qwksearch-web) below.

## Setup

Serving it from the app (what qwksearch-web does) — set `THE_NEWS_API_KEY` in
`.env`, or as a Worker secret in production:

```bash
cd apps/qwksearch-web
bunx wrangler secret put THE_NEWS_API_KEY
```

Or deploy the standalone worker and paste its URL into the *Trending News API URL*
setting:

```bash
cd packages/trending-news-api
bun run worker:deploy                      # then set the secret:
bunx wrangler secret put THE_NEWS_API_KEY --config worker/wrangler.jsonc
```

```tsx
import { TrendingNews, useTrendingNews } from "trending-news-api";

<TrendingNews apiEndpoint="https://trending-news-api.you.workers.dev"
              compact expandable maxTopics={8} showImages />

const { data, error, loading } = useTrendingNews({ apiEndpoint, limit: 25 });
```

## Picking the right call

| You want | Call |
| --- | --- |
| The ready-made widget | `<TrendingNews {...options} className style compact maxTopics expandable expandedMaxTopics showImages heading />` |
| The data in your own UI | `useTrendingNews(options)` → `{ data, error, loading }` |
| An imperative fetch | `getTrendingNews(options)` → `TrendingNewsData` |
| News for one topic | `getTrendingNewsForTopic(topic, options)` → `TrendingNewsTopicData` |
| Force a refetch | `clearTrendingNewsCache()` |
| To serve the data yourself | `handleTrendingNewsRequest(request, { apiKey })` from `trending-news-api/server` |
| News for a named list of topics | `getTrendingNews({ topics })`, or `getCustomTopicNews(topics, { apiKey })` server-side |
| One step of it | `getTrendingTopics`, `getTopicHeadlines`, `fetchWikipediaTopPages`, `searchNewsForTopic` (each takes an optional `fetchImpl`) |
| To clean a user-typed topic list | `parseTopicList(raw)` from `trending-news-api/server` |

`TrendingNewsOptions`: `apiEndpoint` (**required**; a full URL, or a path resolved
against the current page), `topic` (fetch one topic instead of the daily list), `topics`
(fetch exactly these topics, in this order, instead of the daily ranking), `limit`
(default 25 topics — sent to the server as `?limit=`, and the cap on what the client
keeps).

Shapes: `TrendingTopic { topic, wikiRank?, wikiViews?, newsCount, articles }`,
`NewsArticle { title, url?, source?, publishedAt?, imageUrl? }`. The worker speaks
snake_case (`wiki_rank`, `published_at`, `image_url`); the client maps it to camelCase,
so read the mapped shape, not the raw response.

## Recipes

**Caching.** Every fetch is cached in `localStorage` for **10 minutes**, keyed by the
full request URL (prefix `trending-news-cache:`). It degrades to no cache outside the
browser and swallows quota/parse errors. Use `clearTrendingNewsCache()` after changing
`apiEndpoint`.

**Widget layout.** `compact` renders a single topic row; adding `expandable` puts a
chevron on it that expands to the full topic-by-topic article list in place
(`expandedMaxTopics`, default 15). Outside `compact`, the full list always shows and
`expandable` is ignored. Defaults: `maxTopics` 8, `showImages` true.

**Two limits.** `limit` is how many topics the *client* asks for and keeps (default 25,
server cap 50); `maxTopics`/`expandedMaxTopics` are how many the *widget renders*. Each
topic costs the server one News API search, so don't ask for more than the widget shows
— the homepage asks for 15, matching `expandedMaxTopics`.

**Custom topics.** Passing `topics: ['fusion power', 'shipping']` (wire: `?topics=a,b`)
replaces the Wikipedia ranking with exactly those topics, in that order, and
`getCustomTopicNews` backs it server-side. Differences from the daily list, all
deliberate:

- Order is the caller's, so there is no `wikiRank` and no re-sorting.
- A topic with **no** headlines is kept, with `newsCount: 0` — the user named it, and
  dropping it silently reads as the setting not having saved. The card renders as a
  plain `div` ("No headlines right now.") rather than an anchor with no `href`.
- `limit` is ignored: the list already says how many topics there are.
- The response carries `source: 'custom_topics'`, which is what makes the compact
  card say "Your Topics" instead of "Trending" (override with `heading`).
- The list is trimmed, de-duplicated case-insensitively and capped at
  `MAX_CUSTOM_TOPICS` (20) by `parseTopicList`, on both sides of the wire. A list that
  parses to nothing falls through to the daily ranking, and an explicit `?topic=` wins
  over `?topics=`.

**Yesterday's data.** Wikipedia pageviews lag about a day, so the worker deliberately
requests **yesterday's** UTC date.

## In qwksearch-web

`lib/news/` has three files, and the request passes them in this order:

| File | Job |
| --- | --- |
| `settings.ts` | The admin's site-wide settings, one D1 row (`news_widget_settings`, `id = 'global'`). `resolveTopics()` is where "user topics, else site defaults, else Wikipedia" is decided. |
| `trending.ts` | `serveTrendingNews()` — settings gate, KV cache (`cacheMinutes`, default 10), upstream fetch, write-through, archive fallback. |
| `store.ts` | The D1 archive (`news_articles`), unique on `(topic, url)`. |

- **Settings live in D1, not `lib/config`.** That config manager is in-memory and
  per-isolate: a value set there is gone on the next Worker isolate and was never
  visible to the others. Anything an admin switches off has to stay off.
- **`/api/news/settings`** is the public read of the display settings (`enabled`,
  `allowUserTopics`, `maxTopics`, `showImages`, `defaultTopics`) — it is what lets the
  browser know the widget is off *before* fetching news. Cache and retention windows
  are not in it. `/api/admin/news` is the admin read/write, and it never returns the
  API key, only `apiKeyConfigured`.
- **A disabled widget answers `{ topics: [] }` with 200**, not an error, so the widget
  renders nothing instead of retrying a failing endpoint. It costs no News API quota.
- **The KV key is built from the *resolved* topics**, not the raw query string, so two
  visitors who wrote the same topics differently share one entry and a change to the
  site defaults starts answering from a new key.
- **Every successful fetch is written to `news_articles`**, and a failed upstream (no
  key, 429, outage) is served from there, marked `stale: true` with
  `X-Trending-News-Cache: STORED` and no `max-age` so the next request retries. Nothing
  older than 7 days is served that way.
- **Reads degrade, writes report.** Every read path in `settings.ts`/`store.ts` returns
  a default or `null` on a database failure — the widget is decoration on a search
  page. `saveNewsWidgetSettings` is the exception: an admin has to know a change did
  not take.

The homepage (`ChatHomepage.tsx`) gates on both: `showTrendingNewsWidget` (the user's)
and the site's `enabled`. `trendingNewsMaxTopics`/`trendingNewsShowImages` are `null`
until the user picks one, which is what lets the site's value apply instead of a
hardcoded default silently overriding it.

## Troubleshooting

Start at **Admin → News Widget → Diagnostics**. It checks each dependency live
(the widget switch, `THE_NEWS_API_KEY`, a test News API search, the Wikipedia
ranking, the KV binding), prints the upstream's own error message for whichever
fails, and renders a preview of `/api/news/trending` with `showErrors`, so the
reason the homepage widget is hidden is on screen. Outside the admin panel, pass
`showErrors` to `<TrendingNews>` to see the failure in place of an empty widget.

The server queries The News API's **`/v1/news/all?search=`** endpoint (there is
no `/v1/news/search`). A News API failure on one topic drops that topic; when
*every* search fails (bad token, exhausted quota) the handler answers **502**
with the API's message, e.g. `The News API: An invalid API token was supplied.
(invalid_api_token)`, rather than an empty list.

| Symptom | Cause → fix |
| --- | --- |
| `trending-news-api: apiEndpoint is required` | The option is mandatory. The hook simply returns `loading: false` with no data instead of throwing. |
| `THE_NEWS_API_KEY is not configured` (500) | Set the env var on whichever side serves the data — the app (`.env` / `wrangler secret put`) or the standalone worker. |
| The homepage widget is blank on a self-hosted instance | Same cause: no `THE_NEWS_API_KEY`. `/api/news/trending` answers 500 and the widget hides itself rather than showing a broken card. |
| Stale trending data for a while after fixing the key | `/api/news/trending` caches in KV for the admin's *Cache (minutes)* (default 10), but never caches an error — a failure clears as soon as the next request succeeds. |
| The widget shows old headlines with no obvious error | It is serving the D1 archive because the upstream failed. Check `X-Trending-News-Cache: STORED` and the `stale: true` flag, then the API key. |
| A user's topics are ignored | Either the admin turned off *Let each user set their own topics*, or the list parsed to nothing (all blanks). `/api/news/settings` reports `allowUserTopics`. |
| The widget is blank for everyone and nothing is fetched | The admin switched it off — `/api/news/settings` answers `enabled: false`. |
| An admin's setting reverts on its own | It was written to `lib/config` (in-memory, per-isolate) instead of `/api/admin/news`. |
| `Failed to fetch Wikipedia trends` (500) | The pageviews API was unreachable or has no data for that date. It usually resolves on the next day boundary. |
| Topics include "Main Page" or `Special:`/`Portal:` entries | The worker filters those with `NON_ARTICLE_TITLE`. Seeing them means an older deployment — redeploy. |
| Stale data after changing the endpoint | The 10-minute cache is keyed by URL. `clearTrendingNewsCache()`. |
| Nothing renders and no error | `data.topics` is empty — The News API returned nothing for those topics. An empty *daily* list is never cached in KV and falls back to the archive. |
| 502 `The News API: …` | Every news search was refused. The message is the API's own — fix the key, plan or quota it names. |
| The chevron does nothing | `expandable` only applies with `compact`. |
| SSR crashes on `localStorage` | The cache guards on `typeof window`; the component is client-side. Mark the host boundary `'use client'`. |
| CORS errors | The worker sets `Access-Control-Allow-Origin: *` and `Cache-Control: no-store`; a proxy in front may be stripping them. |
| `bun run worker:dev` can't find the config | Worker commands need `--config worker/wrangler.jsonc`, which the `worker:*` scripts already pass — use them. |
