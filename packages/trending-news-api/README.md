# trending-news-api

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
  - `GET /` — trending topics with headline counts and articles.
  - `GET /?topic=...` — headlines for a specific topic.

### Deploying the worker

```bash
cd packages/trending-news-api
npm run worker:deploy
npx wrangler secret put THENEWSAPI_API_KEY --config worker/wrangler.jsonc
```

Use the resulting `*.workers.dev` URL (or a custom route) as `apiEndpoint`.

## Caching

`getTrendingNews` / `getTrendingNewsForTopic` cache each response in `localStorage` for 10
minutes, keyed by the exact request URL. Call `clearTrendingNewsCache()` to evict everything
(e.g. in tests). The cache is a no-op in non-browser environments (SSR) or when `localStorage`
is unavailable/full.

## Notes

- Wikimedia's Pageviews API powers the trending topic list.
- The News API (thenewsapi.com) powers the headlines — you'll need a free or paid API key.
