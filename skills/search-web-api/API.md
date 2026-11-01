# search-web-api API Reference

## `Search`

```ts
new Search()                                            // registers every engine + health tracker
search(query, pageno = 1, engineNames?, categories?): Promise<MergedResult[]>
searchByCategories(query, categories, pageno = 1): Promise<MergedResult[]>
getEngines(): string[]
getEnginesByCategory(category): string[]
getCategories(): string[]
getCategoryStats(): { totalEngines, categories, enginesByCategory }
getEngineStatus(engineName)
getAllEngineStatuses()
```

`engineNames` takes precedence over `categories`; with neither, every engine runs.

## Categories and default weights

| Category | Weight | Category | Weight |
| --- | --- | --- | --- |
| `academic` | 1.3 | `general` | 1.0 |
| `it` | 1.2 | `images` | 1.0 |
| `news` | 1.1 | `videos` | 1.0 |
| `specialized` | 1.1 | `maps` | 1.0 |
| `social` | 0.9 | `music` | 1.0 |
| `torrents` | 0.8 | `files` | 1.0 |
| | | `shopping` | 1.0 |

## Engines (`ALL_ENGINES`, 71)

| Category | Engines |
| --- | --- |
| general | `google` `bing` `duckduckgo` `yahoo` `qwant` `startpage` `brave` `yandex` `baidu` `mojeek` |
| it | `github` `gitlab` `stackoverflow` `npm` `crates` `dockerhub` `pypi` `packagist` `rubygems` |
| images | `unsplash` `bing_images` `google_images` `flickr` `imgur` `pixabay` `wallhaven` `deviantart` `openclipart` |
| videos | `youtube` `vimeo` `dailymotion` `bing_videos` `invidious` `peertube` |
| news | `hackernews` `yahoo_news` `bing_news` `google_news` |
| academic | `google_scholar` `arxiv` `wikidata` `semantic_scholar` `crossref` `pubmed` `openalex` `doaj` `core` |
| torrents | `1337x` `thepiratebay` `nyaa` `yts` `eztv` `solidtorrents` `kickass` |
| social | `twitter` `reddit` `medium` `soundcloud` `mastodon` |
| maps | `openstreetmap` `photon` `apple_maps` |
| shopping | `ebay` |
| specialized | `wikipedia` `imdb` `genius` `archive` `openlibrary` `wttr` `annas_archive` `goodreads` |

Per-engine score weights (set in `Search.search`): `google` 1.5, `google_scholar` 1.4,
`bing` 1.3, `semantic_scholar` 1.3, `arxiv` 1.3, `duckduckgo` 1.2, `brave` 1.1,
`startpage` 1.1, everything else 1.0.

## Types

```ts
type EngineFunction = (query: string, page?: number) => Promise<EngineResult[]>

interface EngineResult {
  title: string; content: string;
  url?: string; link?: string; thumbnail?: string; img_src?: string; iframe_src?: string;
  engine?: string; author?: string; publishedDate?: string;
  latitude?: number; longitude?: number; category?: string; template?: string;
}

interface EngineMetadata { name: string; fn: EngineFunction; categories: string[] }

interface MergedResult extends EngineResult {
  engines: string[];      // every engine that returned this URL
  positions: number[];    // its rank in each of them
  score: number;          // final ranking score
  priority: PriorityType;
}
```

## `ResultContainer`

`setEngineWeights` · `setCategoryWeights` · `extend(engineName, results)` ·
`close()` · `getOrderedResults()` (score-descending) · `getRawResults()` ·
`getNumberOfResults()` · `getTimings()` · `addTiming()` · `addUnresponsiveEngine()` ·
`getStats()` → `{ totalResults, duplicatesMerged, engineCoverage }`.

## Autocomplete

```ts
searchAutocomplete(query, backend, locale?): Promise<string[]>
searchAutocompleteMulti(query, backends, locale?): Promise<string[]>
```

Backends (`backends` map, also exported individually): `google`, `duckduckgo`,
`brave`, `qwant`, `startpage`, `wikipedia`, `yandex`, `baidu`.
`predictNextWordsWithSmallLocalModel(...)` runs a local transformers.js model instead.

## Alternative backends

| Module | Exports |
| --- | --- |
| `search-web-api/search/public-searxng` | `searchWeb`, `searchSearxng`, `normalizeGrabResponse`, `NormalizedGrabResponse`, `SearxngSearchResult`, `SearchResponse` |
| `search-web-api/search/tavily` | `searchTavily`, `getTavilyApiKey`, `isTavilyConfigured` |

## Demo server (`demo/`)

`bun run dev` (watch) / `bun run start`. Hono on port 3000: `/` health text,
`/docs` Scalar reference, `/openapi.json` spec, the search routes, and `/autocomplete`.
