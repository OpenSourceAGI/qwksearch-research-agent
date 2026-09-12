---
name: ask-qwksearch-monorepo
description: Map of the QwkSearch research-agent monorepo (OpenSourceAGI/qwksearch-research-agent) — which of the packages and 5 apps owns a given behaviour, the bun/turbo build and test commands, the workspace build-order trap, and the deploy targets. Also covers the four product shells (Next.js web app, Tauri desktop app, WXT browser extension, VS Code extension) and the Hocuspocus collaboration server that ships inside the web app, which have no package skill of their own. Use when you don't yet know which layer to edit, when a change to a package doesn't show up in the app that imports it, when a root `bun run test` behaves differently from a package's own test script, or when adding a new workspace package.
---

# Working In The QwkSearch Monorepo

A bun/turbo workspace: a research assistant that searches 75+ engines, extracts and
cites articles/PDFs/YouTube, and writes into the REASON document editor. It ships as
a web app, a desktop app, a browser extension and a VS Code extension, all built from
shared `packages/*`. **Every package has its own skill** — this one is the map that
tells you which to open.

## Which layer owns the behaviour

The single most common mistake here is editing UI in the wrong place, because three
things look similar:

- **`apps/qwksearch-web`** is the deployed product — routes, API, auth, D1. It mostly
  *wires together* packages; the component or business logic is rarely here.
- **`packages/research-agent-ui`** is the actual chat/search UI. "Change how search
  results look", "add a button to the chat toolbar" belongs here → **ask-research-agent-ui**.
- **`packages/reason-editor`** is the separate Tiptap writing editor → **ask-reason-editor**.

| Behaviour | Package | Skill |
|---|---|---|
| Chat window, article reader, search config, uploads, app shell | `research-agent-ui` | ask-research-agent-ui |
| The document editor (toolbar, 59 extensions, locales) | `reason-editor` | ask-reason-editor |
| The editor's file tree / open-tabs / split-view sidebar | `reason-editor-sidebar` | ask-reason-editor-sidebar |
| Agent orchestration, Mastra, MCP, memory, model registry | `chat-agent-toolkit` | ask-chat-agent-toolkit |
| One text generation call across 10+ LLM providers | `write-language` | ask-write-language |
| Query 75 search engines, dedupe and rank | `search-web-api` | ask-search-web-api |
| Self-hosted SearXNG meta-search backend | `searxng-search-cloudflare` | ask-searxng-search |
| URL → article + APA citation, keyphrases, tokenizing | `extract-webpage` | ask-extract-webpage |
| PDF → structured HTML, optional Docling OCR | `extract-pdf` | ask-extract-pdf |
| YouTube transcripts without a browser | `extract-youtube` | ask-extract-youtube |
| Domain rank, source label, favicon | `domain-rank` | ask-domain-rank |
| JS-rendered page → HTML (self-hosted Puppeteer/JSDOM) | `render-url-to-html` | ask-render-url-to-html |
| JS-rendered page → HTML (Cloudflare Worker + sessions) | `html-renderer-api` | ask-html-renderer-api |
| Typed client for the QwkSearch backend | `qwksearch-api-client` | ask-qwksearch-api-client |
| Exposing search/extract/render as MCP tools | `qwksearch-mcp-server` | ask-qwksearch-mcp-server |
| NotebookLM automation in a sleeping container | `notebooklm-api-client` | ask-notebooklm-client |
| Speech-to-text, text-to-speech, read-aloud CLI | `use-voice-control` | ask-use-voice-control |
| The dock, the settings form, weather, trending news | `shadcn-app-dock`, `shadcn-settings`, `react-weather-forecast`, `trending-news-api` | ask-shadcn-app-dock, ask-shadcn-settings, ask-weather-forecast, ask-trending-news |
| The `/docs` help site | `user-help-docs` | ask-user-help-docs |
| Training a GPT from scratch on Wikipedia (Python) | `language-model-training` | ask-language-model-training |
| Stocks, brokerage, trading agents, prediction markets, arbitrage | `investing` (incl. `investing/predictos`) | ask-investing |

## The apps (no package skill of their own)

| App | Stack | Edit here for |
|---|---|---|
| `apps/qwksearch-web` | Next.js + vinext on Cloudflare Workers, D1 via Drizzle | Routes, `/api` handlers, auth, DB migrations. Deploy `bun run deploy`; migrations `bun run db:migrate`. |
| `apps/qwksearch-desktop` | SvelteKit + Tauri (`src-tauri/`) | Global hotkey ("select text, press `` ` ``"), tray, autostart, the quick-search popup. Native behaviour is Rust-side, not `src/`. |
| `apps/qwksearch-ext` | WXT browser extension | `entrypoints/{background,content,popup,sidepanel,offscreen}`. Has its **own** `pnpm-workspace.yaml` and lockfile — run install inside it too. |
| `apps/qwk-vscode-ext` | esbuild extension host + two Vite webviews | Host/auth/API proxy in `src/`; chat sidebar in `webview-ui/`; document editor in `webview-ui-editor/`. `bun run compile` builds all three. |
| `apps/qwk-in-lobe` | LobeHub monorepo (pnpm) | The qwksearch.com engine build. A separate pnpm workspace inside `apps/` — the root `bun install` does not cover it, and the root `workspaces` list names the other apps one by one so it cannot. |

The Yjs rooms behind collaborative editing are **not** an app of their own: the
Hocuspocus process is `apps/qwksearch-web/collaboration/server.ts`
(`bun run collab:dev`), the room/auth decision is
`apps/qwksearch-web/lib/collaboration/rooms.ts`, and it authorizes against
`/api/collaboration/session` and `/api/collaboration/access` in the same app.

## Commands

```bash
bun install                     # bun is the package manager — never npm/yarn
bun run dev                     # turbo dev --filter=qwksearch-web
bun run dev:editor              # the REASON editor standalone
bun run build                   # turbo build, whole graph
bun run test                    # vitest, root config
cd packages/<name> && bun run test   # much faster while iterating
```

Workspaces are `packages/*`, `packages/render-url-to-html/*` (the two scrapers are
their own workspaces) and `apps/*`.

## Recipes

**A package edit doesn't show up in the web app.** Siblings are consumed as built
`dist/`, not live source. Run `bun run build` in that package, or
`node .github/scripts/build-workspace-packages.mjs` (what `qwksearch-web`'s `prebuild` runs)
to rebuild all of them in topological order.

**Adding a new package.** Create `packages/<name>/package.json`, add its
`vitest.config.ts` to the `projects` array in the root `vitest.config.ts`, and give it
a skill under `skills/ask-<name>/`. Turbo picks it up from the workspace glob.

**Adding an in-app "skill".** This product has its own unrelated Skills & Memory
feature (a per-user toggle panel in Settings). "Add a skill" from a user usually means
a tool in `chat-agent-toolkit` or an entry in that panel — not a file in `skills/`.

## Troubleshooting

| Symptom | Cause → fix |
| --- | --- |
| Edited a package, app still shows the old behaviour | The app imports the package's `dist/`. Build the package, or run `node .github/scripts/build-workspace-packages.mjs`. |
| `Cannot find module 'react-reason-editor/...' or its type declarations` | An unbuilt sibling: `bun install` symlinks it, but its `exports → types` point at a `dist/` that does not exist yet. Same fix as above. |
| `turbo build` skips a package that clearly is a local dependency | Turbo only treats a dependency as internal when the declared semver range matches the workspace version (e.g. `research-agent-ui` asks for `use-voice-control@^0.1.95` while the workspace is older). `.github/scripts/workspace-build-order.mjs` keys edges by package *name*, which is why the prebuild script covers it and turbo does not. |
| Root `bun run test` doesn't run a package's tests | The root `vitest.config.ts` lists projects explicitly, and `domain-rank`/`extract-pdf` (bun test), `extract-youtube` (jest) and `language-model-training` (pytest) are deliberately absent. Run their own `test` script. |
| A root `vitest.workspace.ts` you remember is gone | Vitest 4 dropped it; it was silently ignored. Projects now live in the root `vitest.config.ts` — add new packages there. |
| Extension dependencies look missing after a root install | `apps/qwksearch-ext` is a semi-independent workspace with its own lockfile. Install inside it. |
| README says the editor is Lexical | It is Tiptap (plus some Plate extensions). `packages/readme.md` is stale on this point; the source is authoritative. |
