---
name: ask-domain-rank
description: Guide to domain-rank (packages/domain-rank), the offline top-domain dataset and lookup API — lookupDomain / getTopDomains / searchDomains over a bundled merged Tranco + CommonCrawl JSON, the domain-to-source-title formatter, favicon lookup, URL-to-root-domain parsing, and the regeneration scripts. Use when adding a source label to search results or autocomplete, when a lookup returns null for a domain that should exist, when favicon lookup throws about a missing file, or when refreshing the bundled datasets.
---

# Working With domain-rank

`packages/domain-rank`, published as **domain-rank**. Turns a hostname into a
human-readable source name, an influence rank and a favicon — offline, from JSON
bundled in the package. Used for search-result source labels, URL autocomplete and
bookmark launchers.

## Setup

```ts
import { lookupDomain, searchDomains, getTopDomains } from "domain-rank";

lookupDomain("nytimes.com");
// { domain, name, rank, title?, newsRank?, newsTitle?, langCode?, info, favicon? } | null
```

`data/domain-rank-merged.json` and `data/domain-info.json` are **parsed into a `Map` at
module load** — importing the package costs ~400 KB of JSON and the parse, once. There
is no async initialisation and no network call for the core lookups.

## Picking the right call

| You want | Call |
| --- | --- |
| One domain's record | `lookupDomain(domain)` — `null` when unknown |
| The top N by rank | `getTopDomains(n = 100)` |
| Fuzzy search for autocomplete | `searchDomains(query, limit = 10)` |
| Dataset size / everything | `getTotalDomains()`, `getAllDomains()` |
| A root domain from a URL | `convertURLToDomain(url)` |
| Is this even a URL | `isURLValid(url)` |
| A display title for a bare domain | `formatDomainAsTitle(domain)` |
| The best title, including overrides | `getSourceTitle(domain)`, `getTitleOverride(domain)`, `cleanSourceTitle(title)` |
| Deduplicate mirrors | `findMainDomain(domain)`, `shouldRemoveDomain(domain)` |
| A favicon | `getFaviconForDomain(urlOrDomain, formatBase64 = true)` |
| The raw data files | `domain-rank/data/*` (an exports subpath) |

## Recipes

**Favicon without the filesystem.** `getFaviconForDomain(x, false)` returns the Google
favicon **URL** and touches no disk — use this in browsers, Workers and any bundled
context. The `true` (default) path reads `./data/favicons.json` with `fs` and only
works in Node with the package directory as the working directory.

**Data shape.** The merged file is compact positional JSON:
`{"domain": ["Name", rank, "Title", newsRank, "NewsTitle", "lang"]}`. `lookupDomain`
expands that into an object and merges `domain-info.json` under `info`. Hand-editing the
JSON means preserving that tuple order.

**Regenerating the datasets.** `bun run download` (Tranco import), `bun run info`
(parse domain info), `bun run merge` (merge the lists), `bun run favicons` (fetch
favicons). These write into `data/`; commit the result, since the package ships it.

**Ranking.** `rank` is overall influence and `newsRank` is the news-specific rank —
they are different orderings, and a news site can have both. `getTopDomains` sorts by
`rank`.

## Troubleshooting

| Symptom | Cause → fix |
| --- | --- |
| `lookupDomain` returns `null` for a real site | The key is the bare lowercase root domain — no scheme, no `www.`, no path. Run `convertURLToDomain` first. |
| A subdomain isn't found | Only root domains are indexed. `findMainDomain` collapses known mirrors; anything else needs its own entry. |
| `ENOENT: ./data/favicons.json` | The base64 favicon path reads that file relative to **`process.cwd()`**, and it is not shipped in `data/` — run `bun run favicons` to generate it, or call `getFaviconForDomain(x, false)` for the URL form. |
| Favicon code crashes in a browser or Worker | It imports `node:fs` at module scope. Use the `formatBase64: false` path there. |
| Bundle size jumps after importing this | ~700 KB of JSON is imported statically at module load. Import it only server-side, or lazy-import it. |
| `convertURLToDomain` mishandles a multi-part TLD | It uses a hand-written TLD regex (`co`, `co.uk`, `ac`, `go.jp`, …), not the full public suffix list. Extend the regex, or use `tldts` (already a dependency) for the exact answer. |
| A source label is ugly or wrong | Add an entry to `src/data/domain-exceptions.ts` and let `getTitleOverride`/`cleanSourceTitle` handle it, rather than special-casing at the call site. |
| Tests don't run under vitest | This package uses **bun test** and is deliberately absent from the root vitest projects. |
