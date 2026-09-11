# Architecture Overview

One product, four shells, twenty-odd libraries. Almost every behaviour a user can
see is implemented in a `packages/*` library and merely *wired up* by the app that
renders it. Finding the owning package is the first step of nearly every task here.

## The product

A research assistant with three halves:

- **STREAM** — search across 75+ engines in 10 categories, extract the top results,
  and answer with citations back to the sentences used.
- **Tractor** — the extraction pipeline: main-content detection (Readability +
  Mercury + ~100 site adapters), YouTube transcripts, PDF → structured HTML, and
  APA citation metadata validated against a 90k-name database.
- **REASON** — a Tiptap/Plate document editor with a nested document tree, AI
  rewriting, collaborative editing and Google Docs import/export.

## Request path, end to end

```
browser / extension / desktop / VS Code
        │
        ▼
apps/qwksearch-web            Next.js on Cloudflare Workers (via vinext)
  app/api/*                   route handlers — thin
        │
        ├─► packages/search-web-api        query 71 engine adapters, dedupe, rank
        ├─► packages/extract-webpage       URL → cited article
        │       ├─► packages/extract-pdf       PDF → structured HTML (+ Docling OCR)
        │       ├─► packages/extract-youtube   transcripts, no browser
        │       ├─► packages/domain-rank       source label, rank, favicon
        │       └─► packages/render-url-to-html | html-renderer-api   JS-rendered pages
        ├─► packages/chat-agent-toolkit    agent orchestration, Mastra, MCP, memory
        │       └─► packages/write-language    one call across 10+ LLM providers
        │
        ▼
  D1 (Drizzle) · KV · R2 · Better Auth
```

The UI on top of that is **not** in the app either: `packages/research-agent-ui`
owns the chat window, result list, reader and uploads; `packages/reason-editor`
owns the writing surface.

## Product shells (`apps/`)

| App | Stack | Owns |
| --- | --- | --- |
| `qwksearch-web` | Next.js + vinext → Cloudflare Workers, D1 via Drizzle | The deployed product: routes, `/api`, auth, DB. See [web-app.md](web-app.md). |
| `qwksearch-desktop` | SvelteKit + Tauri (`src-tauri/`) | Global hotkey (select text, press `` ` ``), tray, autostart, quick-search popup. Native behaviour is Rust-side, not `src/`. |
| `qwksearch-ext` | WXT browser extension | `entrypoints/{background,content,popup,sidepanel,offscreen}`. **Own** `pnpm-workspace.yaml` and lockfile — install inside it too. |
| `qwk-vscode-ext` | esbuild host + two Vite webviews | Host/auth/API proxy in `src/`; chat sidebar in `webview-ui/`; editor in `webview-ui-editor/`. `bun run compile` builds all three. |
| `collaboration-server` | Hocuspocus + SQLite | The Yjs rooms behind collaborative editing. |
| `test-reports` | Cloudflare Worker | Static host for the Vitest HTML report. Infra only. |

## Libraries (`packages/`)

**AI and generation** — `write-language` (multi-provider generation),
`chat-agent-toolkit` (agents, workflows, RAG, evals, MCP sessions, long-term
memory), `language-model-training` (a GPT on Tinygrad, Python, its own toolchain).

**Search and extraction** — `search-web-api`, `searxng-search-cloudflare`,
`extract-webpage`, `extract-pdf`, `extract-youtube`, `domain-rank`,
`render-url-to-html/*` (two self-hosted renderers, each its own workspace),
`html-renderer-api` (Cloudflare Worker + Durable Object keeping a browser warm).

**Clients and servers** — `qwksearch-api-client` (generated from OpenAPI),
`qwksearch-mcp-server` (search/extract/render as MCP tools over stdio),
`notebooklm-api-client` (Worker + sleeping Python container driving NotebookLM).

**UI** — `research-agent-ui`, `reason-editor`, `reason-editor-sidebar`,
`shadcn-app-dock`, `shadcn-settings`, `react-weather-forecast`,
`trending-news-api`, `use-voice-control`, `user-help-docs`.

**Vendored** — `investing`, `predictos` (from `ai-broker-investing-agent`).

## `packages-lobe/`

A copy of the [LobeHub](https://github.com/lobehub/lobehub) monorepo adapted to run
qwksearch.com on the same Cloudflare stack (Workers + D1 + KV + R2 + Email Routing
+ Better Auth), plus the QwkSearch extract side panel and D1-backed docs.

It is a **separate pnpm workspace** with its own rules — do not assume the bun/turbo
commands above apply inside it. It carries its own `CLAUDE.md` (which delegates to
`packages-lobe/AGENTS.md`); read that before editing anything in there.

## A trap worth naming

This product has its own, unrelated **Skills & Memory feature** — a per-user toggle
panel in Settings. When a *user* says "add a skill" they usually mean a tool in
`chat-agent-toolkit` or an entry in that panel, **not** a file in `skills/`.
