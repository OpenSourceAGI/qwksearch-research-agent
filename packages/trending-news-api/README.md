<!-- template-git-repo:badges:start -->
<p align="center">
    <a href="https://qwksearch.com/api/docs"><img src="https://img.shields.io/badge/Docs-blue?logo=ReadTheDocs&logoColor=white" alt="Documentation" /></a>
    <a href="https://stackblitz.com/github/OpenSourceAGI/qwksearch-research-agent/tree/master/packages/trending-news-api"><img height="20px" src="https://developer.stackblitz.com/img/open_in_stackblitz.svg" alt="Open in StackBlitz" /></a>
    <br />
    <a href="https://www.npmjs.com/package/trending-news-api"><img src="https://img.shields.io/npm/dm/trending-news-api.svg" alt="NPM Monthly Downloads" /></a>
    <a href="https://www.npmjs.com/package/trending-news-api"><img src="https://img.shields.io/npm/v/trending-news-api.svg" alt="npm version" /></a>
    <a href="https://www.npmjs.com/package/trending-news-api"><img src="https://img.shields.io/npm/dt/trending-news-api.svg" alt="NPM Total Downloads" /></a>
    <a href="https://www.npmjs.com/package/trending-news-api"><img src="https://img.shields.io/npm/types/trending-news-api" alt="TypeScript types" /></a>
    <a href="https://packagephobia.com/result?p=trending-news-api"><img src="https://packagephobia.com/badge?p=trending-news-api" alt="Install size" /></a>
    <br />
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/stargazers"><img src="https://img.shields.io/github/stars/OpenSourceAGI/qwksearch-research-agent" alt="GitHub Stars" /></a>
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/issues"><img src="https://img.shields.io/github/issues/OpenSourceAGI/qwksearch-research-agent?logo=github" alt="GitHub Issues" /></a>
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/pulls"><img src="https://img.shields.io/github/issues-pr/OpenSourceAGI/qwksearch-research-agent?logo=github&label=PRs" alt="Open Pull Requests" /></a>
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/pulls?q=is%3Apr+is%3Aclosed"><img src="https://img.shields.io/github/issues-pr-closed/OpenSourceAGI/qwksearch-research-agent?logo=github&label=PRs%20merged&color=8957e5" alt="Merged Pull Requests" /></a>
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/discussions"><img src="https://img.shields.io/github/discussions/OpenSourceAGI/qwksearch-research-agent" alt="GitHub Discussions" /></a>
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/commits/master/"><img src="https://img.shields.io/github/last-commit/OpenSourceAGI/qwksearch-research-agent.svg" alt="GitHub last commit" /></a>
    <br />
    <img src="https://img.shields.io/badge/Bun-14151A?logo=bun&logoColor=white" alt="Bun" /> <img src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white" alt="TypeScript" /> <img src="https://img.shields.io/badge/React-20232A?logo=react&logoColor=white" alt="React" /> <img src="https://img.shields.io/badge/Cloudflare%20Workers-F38020?logo=cloudflareworkers&logoColor=white" alt="Cloudflare Workers" /> <img src="https://img.shields.io/badge/Vitest-6E9F18?logo=vitest&logoColor=white" alt="Vitest" />
</p>
<!-- template-git-repo:badges:end -->

# trending-news-api

[![Coverage](https://codecov.io/gh/OpenSourceAGI/qwksearch-research-agent/graph/badge.svg?component=package-trending-news-api)](https://codecov.io/gh/OpenSourceAGI/qwksearch-research-agent)

React trending news widget: daily top Wikipedia pages (via the Wikimedia Pageviews API) matched
against headlines from [The News API](https://www.thenewsapi.com/), served through a bundled
Cloudflare Worker so the News API key never reaches the browser.

## Features

- Daily trending topics, ranked by Wikipedia pageviews.
- Matching headlines per topic from The News API.
- Article thumbnail images, shown alongside headlines (toggle off with `showImages={false}`).
- Single-topic headline lookup.
- Compact card row or full article-list layouts.
- `localStorage` response caching (10 minutes).
- Runs as a standalone Cloudflare Worker, or from a route your own app already serves.
- TypeScript + tsup library scaffold.

## Install

```bash
npm install trending-news-api
```

## Usage

```tsx
import { TrendingNews } from 'trending-news-api';

export default function App() {
  return (
    <TrendingNews
      compact
      maxTopics={8}
      apiEndpoint="https://trending-news-api.your-subdomain.workers.dev"
    />
  );
}
```

Pass `topic` to render headlines for a single topic instead of the daily trending list:

```tsx
<TrendingNews apiEndpoint="https://trending-news-api.your-subdomain.workers.dev" topic="Donald Trump" />
```

`apiEndpoint` may be a full URL or a path on the current origin (`/api/news/trending`), so a host
app that serves the data itself doesn't have to hardcode its own domain.

The widget renders nothing when `apiEndpoint` is unset, still loading, or errored — safe to drop
into a layout unconditionally.

## Direct API usage

```ts
import { getTrendingNews, getTrendingNewsForTopic } from 'trending-news-api';

const trending = await getTrendingNews({
  apiEndpoint: 'https://trending-news-api.your-subdomain.workers.dev',
});

const topicNews = await getTrendingNewsForTopic('Donald Trump', {
  apiEndpoint: 'https://trending-news-api.your-subdomain.workers.dev',
});
```

## Build

```bash
npm install
npm run build
```

## The worker backend

`worker/index.ts` is a Cloudflare Worker that:

- Fetches yesterday's top Wikipedia pages by pageviews (Wikimedia REST API), filtering out
  non-article pages (`Main_Page`, `Special:`, `Wikipedia:`, etc).
- For each page, searches The News API for matching headlines.
- Exposes:
  - `GET /` — trending topics with headline counts and articles (`?limit=` topics, default 25,
    capped at 50).
  - `GET /?topic=...` — headlines for a specific topic.

Topics with no matching headlines are dropped, so it looks at up to twice as many Wikipedia
entries as topics requested and stops once the quota is filled. Searches run five at a time.

### Deploying the worker

```bash
cd packages/trending-news-api
npm run worker:deploy
npx wrangler secret put THENEWSAPI_API_KEY --config worker/wrangler.jsonc
```

Use the resulting `*.workers.dev` URL (or a custom route) as `apiEndpoint`.

### Serving it from your own app instead

`trending-news-api/server` is the same request handler the worker runs, with no React and no DOM
in it, so an app that already has a backend can serve the widget from one of its own routes and
skip the second deployment. QwkSearch does this at `/api/news/trending` — see
`apps/qwksearch-web/lib/news/trending.ts`.

```ts
// e.g. app/api/news/trending/route.ts
import { handleTrendingNewsRequest } from 'trending-news-api/server';

export const GET = (request: Request) =>
  handleTrendingNewsRequest(request, { apiKey: process.env.THENEWSAPI_API_KEY });
```

The individual steps are exported too, for a route that wants to cache or reshape the data:
`getTrendingTopics({ apiKey, limit, date })`, `getTopicHeadlines(topic, { apiKey })`,
`fetchWikipediaTopPages(date, limit)` and `searchNewsForTopic(apiKey, query, limit)`. Each takes an
optional `fetchImpl` so it can be tested without network access.

## Caching

`getTrendingNews` / `getTrendingNewsForTopic` cache each response in `localStorage` for 10
minutes, keyed by the exact request URL (which includes `limit`). Call
`clearTrendingNewsCache()` to evict everything (e.g. in tests). The cache is a no-op in non-browser environments (SSR) or when `localStorage`
is unavailable/full.

## Notes

- Wikimedia's Pageviews API powers the trending topic list.
- The News API (thenewsapi.com) powers the headlines — you'll need a free or paid API key.
