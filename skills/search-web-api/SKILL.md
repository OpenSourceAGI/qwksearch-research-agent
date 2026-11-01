---
name: ask-search-web-api
description: Guide to search-web-api (packages/search-web-api), the 71-adapter meta-search engine — the Search class, engine and category selection, the ResultContainer dedupe/scoring model, per-engine health tracking, the autocomplete backends, the Tavily and public-SearXNG fallbacks, and the Hono demo server with Scalar docs. Use when adding a search engine adapter, when an engine silently returns nothing or gets skipped, when result ordering or dedupe looks wrong, or when wiring search into an agent, a Worker, or the MCP server.
---

# Working With search-web-api

`packages/search-web-api`, published as **search-web-api**. Queries many engines in
parallel, merges duplicates, and returns one ranked list. Engine list, category table
and result shapes: [API.md](API.md).

## Setup

There is **no build step and no `dist/`** — the package exports TypeScript source
directly (`"." → src/search.ts`, `./* → src/*`). Consumers must be able to transpile
it; that is why the MCP server and the demo run under bun.

```ts
import { Search } from "search-web-api";

const search = new Search();                       // registers all engines + health tracking
const results = await search.search("attention is all you need", 1, undefined, ["academic"]);
```

Every adapter uses `grab-url`, and the registry sets a browser `User-Agent` as a global
default the moment `search-engines-registry-list` is imported.

## Picking the right call

| You want | Call |
| --- | --- |
| Search everything | `search.search(query, pageno)` |
| Restrict to engines | `search.search(query, pageno, ["arxiv", "pubmed"])` |
| Restrict to categories | `search.search(query, pageno, undefined, ["news"])` or `search.searchByCategories(query, ["news","general"])` |
| The engine catalogue | `ALL_ENGINES` (`{ name, fn, categories }[]`), or `search.getEngines()` |
| Engines in a category | `search.getEnginesByCategory("it")` |
| Category names / counts | `search.getCategories()`, `search.getCategoryStats()` |
| Why an engine is being skipped | `search.getEngineStatus(name)`, `search.getAllEngineStatuses()` |
| Query suggestions | `searchAutocomplete(query, backend, locale)`, `searchAutocompleteMulti(...)`, or a backend directly (`google`, `duckduckgo`, `brave`, `qwant`, `startpage`, `wikipedia`, `yandex`, `baidu`) |
| Local next-word prediction instead of a network call | `predictNextWordsWithSmallLocalModel(...)` (`@huggingface/transformers`) |
| A hosted SearXNG instance | `searchSearxng(...)`, `searchWeb(...)` from `search-web-api/search/public-searxng` |
| Tavily | `searchTavily(...)`, `getTavilyApiKey()`, `isTavilyConfigured()` |
| An HTTP surface | `bun run dev` — Hono on `:3000`, Scalar docs at `/docs`, spec at `/openapi.json` |

Note `engineNames` **wins over** `categories`: if you pass both, the categories are
ignored.

## Recipes

**Add an engine.** Drop `src/sources/<category>/<name>.ts` exporting an
`EngineFunction` — `(query: string, page?: number) => Promise<EngineResult[]>`. Fetch,
parse with `linkedom`'s `parseHTML` (never jsdom — this must run on Workers), return
`{ title, url, content, ... }`, and `return []` on a non-OK response rather than
throwing. Then import it in `src/search/search-engines-registry-list.ts` and add
`{ name, fn, categories }` to `ALL_ENGINES`. `src/sources/academic/arxiv.ts` is a good
template. Add a description in `src/registry/search-engine-descriptions.ts`.

**Scoring.** `ResultContainer` hashes each result to merge duplicates across engines,
then scores by position, per-engine weight (google 1.5, google_scholar 1.4, bing 1.3,
semantic_scholar/arxiv 1.3, duckduckgo 1.2, brave/startpage 1.1, everything else 1) and
per-category weight (academic 1.3, it 1.2, news/specialized 1.1, torrents 0.8, social 0.9, the rest 1.0). More engines agreeing on a URL ranks
it higher. Weights are set per call inside `Search.search`, so change them there, not
in the container.

**Category boundary.** Results with no `category` inherit the engine's first category —
so an engine listed under two categories tags everything with the first one.

## Troubleshooting

| Symptom | Cause → fix |
| --- | --- |
| An engine returns nothing and no error appears | Per-engine failures are caught, logged to `console.error`, recorded in the health tracker, and dropped. Check `getEngineStatus(name)`. |
| `Skipping unhealthy engine: X` in the logs | The status tracker disabled it after repeated failures. It recovers on its own; inspect `getAllEngineStatuses()` to see why. |
| Passing `categories` has no effect | You also passed `engineNames`. That branch takes priority. |
| An engine name passed to `search()` matches nothing | Names are the exact `ALL_ENGINES` keys (`google_scholar`, `bing_images`, `annas_archive` — underscores, lowercase). A typo silently filters to an empty set. |
| Bundler error importing the package | It ships `src/*.ts`, no `dist/`. Transpile it or run under bun/vite. |
| HTML parsing works locally, fails on Workers | Use `linkedom`, not `jsdom`; several adapters depend on that already. |
| Every engine fails at once | The global `grab-url` `User-Agent` default is set as a side effect of importing the registry — importing an adapter file directly skips it and many engines then 403. Import from the package entry. |
| Very few results overall | Scraping engines break when a site's markup changes; the tracker will show a cluster of failures. Fix the adapter's selectors — there is no retry or proxy layer here. |
| `search()` is slow | It fans out to *every* registered engine when neither filter is given. Pass a category. |
