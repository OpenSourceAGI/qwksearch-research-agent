# Architecture & Workflow

## Monorepo shape

```
qwksearch-research-agent/
├── apps/
│   ├── qwksearch-web/       Next.js web app — the deployed product
│   ├── qwksearch-desktop/   Tauri + Svelte desktop app
│   ├── qwksearch-ext/       WXT-based browser extension (tab manager)
│   ├── qwk-vscode-ext/      VS Code extension (sidebar + editor webview)
│   └── test-reports/        Static host for the Vitest HTML report (Cloudflare Worker)
├── packages/                ~20 publishable/shared packages, see table below
├── turbo.json                Turbo task graph (build/test/dev)
├── vitest.workspace.ts       Aggregates every package's vitest.config.ts
└── package.json              Root scripts, bun workspaces
```

Root `package.json` workspaces: `packages/*` and `apps/*`. Package manager
is **bun** (`packageManager: bun@1.3.11`).

## Root scripts (run from repo root)

- `bun run dev` → `turbo dev --filter=qwksearch-web` (the web app dev server)
- `bun run dev:editor` → `turbo dev --filter=react-reason-editor` (REASON editor standalone dev)
- `bun run build` → `turbo build` (builds every package/app, respecting dependency order)
- `bun run build:web` → `turbo build --filter=qwksearch-web`
- `bun run test` → `vitest run` across the whole workspace
- `bun run test:ui` → Vitest UI
- `bun run test:report` → generates an HTML test report into `apps/test-reports/dist`

`turbo.json` declares three tasks: `build` (depends on `^build`, i.e. builds
dependencies first — this is why `qwksearch-web`'s own `prebuild` script
also manually chains several packages), `test` (depends on `^build`, not
cached), and `dev` (not cached, persistent/long-running).

## Package group map

| Package | Role |
|---|---|
| `research-agent-ui` | The chat/search UI dropped into `qwksearch-web` |
| `reason-editor` | The REASON writing/notes editor (Tiptap) |
| `chat-agent-toolkit` | Multi-provider LLM agent orchestration (Mastra, MCP, memory) |
| `write-language` | Multi-provider text generation via Vercel AI SDK |
| `search-web-api` | 70+ search engine adapters + Hono HTTP API |
| `searxng-search-cloudflare` | Self-hosted SearXNG meta-search deployment config |
| `domain-rank` | Domain reputation/favicon lookup (Tranco + CommonCrawl) |
| `extract-pdf` | PDF → structured HTML (JS pipeline + optional Docling OCR) |
| `extract-webpage` | Full research pipeline: search → extract → cite → outline |
| `extract-youtube` | YouTube transcript extraction, no headless browser |
| `render-url-to-html` | JS-rendered page → HTML (Puppeteer/JSDOM/Cloudflare Browser Rendering) |
| `qwksearch-api-client` | Auto-generated TS client for the QwkSearch backend OpenAPI spec |
| `qwksearch-mcp-server` | MCP server exposing search/extract/render as tools |
| `notebooklm-api-client` | Placeholder client for Google NotebookLM |
| `shadcn-app-dock`, `shadcn-settings` | Standalone shadcn-style UI widgets |
| `react-weather-forecast` | Standalone weather widget + Cloudflare Worker API |
| `use-voice-control` | Speech/voice control hook used by `research-agent-ui` |
| `language-model-training` | From-scratch GPT training pipeline (Python/Tinygrad), mostly independent of the web product |

## Cross-package dependency chain (why build order matters)

`apps/qwksearch-web`'s `prebuild` script shows the real dependency order,
because these are workspace packages consumed as built artifacts, not
live-transpiled source:

```
extract-pdf → shadcn-app-dock → shadcn-settings → react-weather-forecast
  → chat-agent-toolkit → research-agent-ui → reason-editor (build:lib)
```

Practical effect: if you edit `packages/research-agent-ui/src/...` and the
change doesn't show up in `apps/qwksearch-web`, run `bun run build` inside
`packages/research-agent-ui` (or rerun the web app's `prebuild` chain)
before assuming something is broken.

## Testing

- Each package that needs tests has its own `vitest.config.ts`; the root
  `vitest.workspace.ts` aggregates them so `bun run test` at the root runs
  everything.
- Iterate faster by running tests inside the specific package:
  `cd packages/search-web-api && bun run test`.
- `language-model-training` (Python) has its own `pytest.ini` / `requirements.txt` — it is not part of the JS/TS Vitest workspace.

## Deployment targets (for context, rarely something you need to touch)

- `qwksearch-web` deploys to Cloudflare Workers via `vinext` + `wrangler.jsonc`, with D1 (`drizzle/` migrations) for the database.
- `research-agent-ui` can run its own Cloudflare Worker (`src/cloudflare/worker.ts`, `wrangler.local.jsonc`) when embedded standalone.
- `qwksearch-desktop` builds native binaries via Tauri (`src-tauri/`) and has Docker-based cross-compilation scripts for Linux/Windows.
- `qwksearch-ext` builds via WXT (`wxt.config.ts`) to a loadable Chrome/Firefox extension.
