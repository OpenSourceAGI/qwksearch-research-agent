---
name: ask-search-autocomplete
description: Guide to search-autocomplete (packages/search-autocomplete), the QwkSearch search box and its query autocomplete — single-engine completion with DEFAULT_ENGINE chosen by the bundled latency benchmark, the word-dropping fallback, Fuse.js site suggestions over domain-rank, createAutocompleteHandler for /api/agent/autocomplete, and the React SearchBox, AutocompleteDropdown and useAutocomplete hook. Use when autocomplete is slow or empty, when changing or benchmarking the suggest engine, when adding an engine adapter, or when putting the search box or its dropdown into another input.
---

# Working With search-autocomplete

`packages/search-autocomplete`, published as **search-autocomplete**. Three entries:

| Entry | Holds | Safe in a browser |
| --- | --- | --- |
| `search-autocomplete` | Engine adapters (`ENGINES`), `getSuggestions`, `DEFAULT_ENGINE`, the benchmark | yes |
| `search-autocomplete/server` | `createAutocompleteHandler`, `searchDomains` (imports the ~300KB domain dataset) | no |
| `search-autocomplete/react` | `SearchBox`, `AutocompleteDropdown`, `useAutocomplete`, `splitQuery` | yes (`"use client"`) |

## How a completion is made

1. The hook takes the **last four words** of the input (`splitQuery`), waits 180ms
   of quiet, aborts the previous request and fetches.
2. The handler asks **one engine** — `?engine=`, else the first of the legacy
   `?backends=`, else `DEFAULT_ENGINE`. `ddg` is accepted for `duckduckgo`.
3. If the whole query has no completions, it retries with the last 3, 2, then 1
   words and glues the dropped prefix back on.
4. `searchDomains` adds up to three sites for the last word: fuzzy matches over
   `domain-rank`, plus any real registered domain typed literally (`red.com`),
   but not filenames (`note.txt`).

Choosing a domain navigates to it (override with `onSelectDomain`); choosing a
text suggestion replaces the completed words. Keys: arrows, Tab/Enter to pick,
Escape to close, 1–9 to pick by number.

## Choosing the engine

`bun run benchmark` measures every adapter from the current machine: one
discarded warm-up per engine, then interleaved rounds over eight queries,
sequentially so engines don't share bandwidth. An engine must return
suggestions for ≥90% of requests to be eligible; the lowest median wins, p90
breaks ties. Flags: `--rounds`, `--engines a,b`, `--queries "q1|q2"`,
`--locale`, `--timeout`, `--min-success`, `--json`.

Latency depends on where you measure from. The *Autocomplete benchmark*
workflow runs it on a GitHub runner (closer to the Worker's egress than a home
connection) on demand and whenever an adapter changes. `DEFAULT_ENGINE` is
changed by hand from those numbers, with the README table updated to match.

## Recipes

**Put the dropdown on your own input.** Keep the value yourself:

```tsx
const ac = useAutocomplete({ value, onChange: setValue, enabled: focused, anchorRef, inputRef });
// in onKeyDown: if (ac.handleKeyDown(e)) return;
<div className="relative"> …your input… <AutocompleteDropdown {...ac} /></div>
```

`research-agent-ui`'s `ChatInputBox` does exactly this, passing a
`fetchSuggestions` that goes through `qwksearch-api-client` so the request
honours the client's base URL.

**Add an engine.** Write an `AutocompleteEngine` in `src/engines.ts` (use
`request` and `parseOpenSearch`), add it to `ENGINES`, add a parser test in
`test/engines.test.ts`, then run the benchmark.

## Troubleshooting

| Symptom | Cause → fix |
| --- | --- |
| Suggestions stopped entirely | The default engine is failing from the Worker (often a 403 to datacenter IPs). The log says `Autocomplete engine '<name>' failed`. Re-run the benchmark and switch `DEFAULT_ENGINE`. |
| Benchmark says "Fastest: none" | Every request failed — outbound network is blocked where it ran. |
| Dropdown unstyled in the app | The app's `globals.css` needs `@source` for `packages/search-autocomplete/src`. |
| Domain dataset in a client bundle | Something imported `search-autocomplete/server` from client code; use the root or `./react` entry. |
| Consumers see stale code | This package is consumed as built `dist/`: `bun run build`. |
