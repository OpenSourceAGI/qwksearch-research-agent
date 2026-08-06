# Search & Content Extraction

## packages/search-web-api — adding or changing a search engine

Hono-based HTTP server exposing 70+ engines across 10 categories. Dev:
`bun run dev` inside the package.

- `src/sources/<category>/<engine>.ts` — one file per engine adapter, grouped into category folders: `general`, `news`, `academic`, `videos`, `images`, `shopping`, `social`, `specialized`, `it`, `maps`, `torrents`. E.g. `src/sources/general/google.ts`, `src/sources/general/baidu.ts`, `src/sources/news/*.ts`.
- **Adapter shape** (every engine follows this — copy the closest existing one in the same category rather than writing from scratch): an exported `const <engine>: EngineFunction = async (query, page) => {...}` (type from `src/types/search-engine-interface.js`) that fetches the engine's search results page or API, parses it (commonly with `linkedom`'s `parseHTML`), and returns an array of `{ url, title, content, engine }` objects (or `[]` on failure — adapters fail soft, they don't throw for a bad response).
- `src/registry/search-engine-category-registry.ts` — registers which engines belong to which category; a new adapter must be added here to be reachable.
- `src/registry/search-engine-descriptions.ts` — human-readable name/description shown in UI pickers (`research-agent-ui`'s `SearchConfig` reads from something derived from this).
- `src/registry/search-engine-status-tracker.ts` — tracks engine health/failures (used to deprioritize or skip consistently-failing engines).
- `src/result-container.ts`, `src/engine.ts` — result merging/deduplication and the top-level dispatch that calls engines per category.
- `src/autocomplete/`, `src/suggest-next-words/` — query suggestion logic, separate from result search itself.

**Recipe: add a new search engine.** Pick the right category folder, copy
the adapter closest in behavior (simple HTML scrape vs. JSON API — e.g.
`baidu.ts` scrapes HTML with `linkedom`), implement the `EngineFunction`,
then register it in `search-engine-category-registry.ts` and add an entry
in `search-engine-descriptions.ts`. Test with the package's own `bun run test`.

## packages/extract-pdf and packages/extract-pdf-docling

Two different PDF strategies:

- `extract-pdf` — zero-runtime-dependency PDF→HTML using `pdfjs-serverless`, works in Node/Workers/browser. `src/pdf-to-html.ts` is the entry; `src/transforms/` holds structural transforms (headings, lists, footnotes, code blocks — see root README's "Tractor" section for the exact feature list); `src/detect-needs-ocr.ts` decides whether a PDF needs OCR fallback.
- `extract-pdf-docling` — heavier, OCR-capable path using IBM's granite-docling model via Hugging Face Transformers, served over its own Hono HTTP API (`src/routes.js`, `src/pdf2html.js`, `src/model.js`, `src/schemas.js`). Has a `pdf-to-html-docling-python/` subfolder for the Python side. Use this one when layout/OCR fidelity matters more than portability.

## packages/extract-webpage — the research pipeline

Combines search, extraction, citation, and outlining into one flow (this is
the package behind "Article Preview" in the root README). `src/index.ts` is
the entry; `src/html-to-content/` (Readability/Mercury-style main-content
detection), `src/html-to-cite/` (citation metadata extraction — author/date
matched against a name database, per the README), `src/url-to-content/`,
`src/seektopic/` (topic-directed extraction), `src/tokenize/`. If a
citation is formatted wrong or main-content detection picks the wrong DOM
node, this is the package to check first.

## packages/extract-youtube

No headless browser — fetches captions/subtitles directly. `src/fetchers/`,
`src/parsers/`, `src/proxies/` (for regions/rate-limit avoidance),
`src/formatters/` (SRT/WebVTT output), `src/cli.ts` (usable standalone via
CLI, see `build:cli`/`build:bundle` scripts).

## packages/render-url-to-html

Not a package.json-having TS package in the usual sense — it's a
collection of rendering *strategies* (`scraper-jsdom/`, `scraper-puppeteer/`
subfolders), each a different tradeoff: JSDOM is fast but doesn't run
JS-heavy pages; Puppeteer (with stealth plugins) handles JS-rendered/
bot-protected pages but is heavier; Cloudflare Browser Rendering is the
serverless-friendly middle ground mentioned in the root README. Pick the
strategy folder matching your constraint (speed vs. JS-rendering vs.
serverless-compatible) rather than assuming one file does everything.

## packages/searxng-search-cloudflare

Not application code — a Docker deployment (`Dockerfile`, `Dockerfile.redis`,
`searxng-settings.yml`, `searxng-engines.yml`) for self-hosting a private
SearXNG meta-search proxy. Edit `searxng-engines.yml`/`searxng-settings.yml`
to change which upstream engines SearXNG itself queries — this is a
different mechanism from adding an adapter in `search-web-api`.

## packages/domain-rank

Looks up domain reputation/favicon from Tranco List + CommonCrawl data.
`src/domain-api.ts` (lookup API), `src/domain-name-formatter.ts`
(human-readable source labels), `src/scripts/` + `src/data/` (the
`download`/`merge`/`favicons` npm scripts regenerate the underlying dataset
— only needed if you're refreshing the ranking data itself, not for normal
feature work).
