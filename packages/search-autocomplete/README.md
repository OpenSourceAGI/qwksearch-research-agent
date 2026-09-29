# search-autocomplete

The QwkSearch search box and its autocomplete. Query completions come from **one**
search-engine suggest API — the fastest one the bundled benchmark measured — instead
of waiting on several; site suggestions come from a ranked domain list.

```bash
bun add search-autocomplete
```

## Search box

```tsx
import { SearchBox } from "search-autocomplete/react";

<SearchBox
  placeholder="Search…"
  onSubmit={(q) => router.push(`/?q=${encodeURIComponent(q)}`)}
/>
```

By default it fetches `GET /api/agent/autocomplete?q=…&limit=8`. Point it elsewhere
with `endpoint`, pick an engine with `engine`, or pass your own `fetchSuggestions`.

Bring your own input instead with the hook and the dropdown:

```tsx
import { AutocompleteDropdown, useAutocomplete } from "search-autocomplete/react";

const ac = useAutocomplete({ value, onChange: setValue, enabled: focused, anchorRef, inputRef });

<div className="relative">
  <textarea onKeyDown={(e) => { if (!ac.handleKeyDown(e)) onOtherKeys(e); }} … />
  <AutocompleteDropdown {...ac} />
</div>
```

The components use Tailwind classes; in a Tailwind v4 app add
`@source "…/node_modules/search-autocomplete/dist";` (or the package's `src` in a
monorepo).

## Server

```ts
// app/api/agent/autocomplete/route.ts
import { createAutocompleteHandler } from "search-autocomplete/server";
export const { GET } = createAutocompleteHandler();
```

`GET ?q=&locale=&limit=&engine=` → `{ suggestions: string[], domains: DomainSuggestion[] }`.
`backends=` is still accepted from older clients; only its first engine is used.

Without the handler:

```ts
import { getSuggestions } from "search-autocomplete";
await getSuggestions("tesla sto", { engine: "google", locale: "en-US" });
```

Engines: `baidu`, `bing`, `brave`, `duckduckgo`, `google`, `qwant`, `startpage`,
`wikipedia`, `yandex`. Every adapter is a single `fetch` with a timeout, so it runs on
Cloudflare Workers, Node and Bun.

## Benchmark

```bash
bun run benchmark
bun run benchmark --rounds 5 --engines google,duckduckgo,bing
bun run benchmark --json > results.json
```

Each engine gets one discarded warm-up request, then answers the same eight queries,
interleaved across engines and sent one at a time. An engine must return suggestions
for at least 90% of requests to qualify; the lowest median latency wins.

Measure from somewhere like production: the *Autocomplete benchmark* GitHub workflow
runs it on a datacenter runner on demand and whenever an engine adapter changes.

### Current default

<!-- benchmark-results -->
`DEFAULT_ENGINE` is **`google`**. Measured 2026-09-29 by the *Autocomplete benchmark*
workflow on a GitHub `ubuntu-latest` runner, 5 rounds × 8 queries per engine:

| # | Engine | Answered | Median ms | p90 ms |
| --- | --- | --- | --- | --- |
| 1 | google | 100% | 34 | 39 |
| 2 | brave | 100% | 48 | 62 |
| 3 | bing | 100% | 61 | 66 |
| 4 | duckduckgo | 100% | 73 | 86 |
| 5 | qwant | 100% | 148 | 177 |
| 6 | baidu | 100% | 211 | 222 |
| 7 | yandex | 100% | 213 | 259 |
| — | wikipedia | 75% | 18 | 153 |
| — | startpage | 0% | — | — |

Wikipedia is quickest when it answers but only completes article titles, so a
quarter of ordinary queries came back empty — below the 90% bar. Startpage returned
an empty body to every request from the runner.
<!-- /benchmark-results -->

## License

PROSPER — see the repository's `LICENSE.md`.
