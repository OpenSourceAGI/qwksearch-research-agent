---
name: qwksearch-customize
description: Guides modifying and extending the QwkSearch research-agent monorepo (OpenSourceAGI/qwksearch-research-agent) — the Next.js web app, chat/search UI, REASON editor, browser extension, desktop app, VS Code extension, and the ~20 workspace packages behind them (search aggregation, PDF/YouTube/webpage extraction, multi-provider LLM toolkit, API clients). Use this whenever the user wants to add a feature, restyle or rewire the web UI, add a new search engine or LLM provider, add an editor extension, or otherwise "try different ideas" against this codebase's source — even if they only name one app or package, since most features cut across several. Also use it just to figure out where a given piece of behavior lives before touching code.
---

# Customizing QwkSearch Research Agent

QwkSearch is a bun/turbo monorepo: a research assistant that searches 100+
sites, extracts and cites articles/PDFs/YouTube, and writes into a
Lexical-based document editor. It ships as a Next.js web app, a browser
extension, a desktop app, and a VS Code extension, all built from shared
`packages/*`. This skill orients you before you edit so changes land in the
right package instead of being re-implemented in the wrong layer.

## Before changing anything: find the right layer

The single biggest way to waste time here is editing UI in the wrong repo
location because three things look similar:

- **`apps/qwksearch-web`** is the deployed product (routes, API, auth, DB).
  It mostly *wires together* packages — it rarely contains the component or
  business logic itself.
- **`packages/research-agent-ui`** is the actual chat/search UI (message
  composer, article reader, search config, voice, file upload). If the
  request is "change how search results look" or "add a button to the chat
  toolbar," it almost always belongs here, not in `apps/qwksearch-web`.
- **`packages/reason-editor`** is the separate writing/notes editor (Tiptap
  extensions, document tree, locales). Don't confuse it with
  `research-agent-ui` — they are two different UIs.

Read `references/architecture.md` first for the full map, then jump to the
reference file for the area you're touching:

| You want to... | Read | Then edit |
|---|---|---|
| Understand the monorepo, dev/build/test commands, deploy targets | `references/architecture.md` | — |
| Change the chat/search UI, article reader, search config, voice, or the web app's routes/API/auth/DB | `references/web-ui.md` | `packages/research-agent-ui`, `apps/qwksearch-web` |
| Change the REASON writing editor (toolbar, extensions, document tree) | `references/web-ui.md` | `packages/reason-editor` |
| Change the desktop app, browser extension, or VS Code extension | `references/other-apps.md` | `apps/qwksearch-desktop`, `apps/qwksearch-ext`, `apps/qwk-vscode-ext` |
| Add/modify a search engine, content extractor (PDF/webpage/YouTube), or page renderer | `references/search-and-extraction.md` | `packages/search-web-api`, `packages/extract-*`, `packages/render-url-to-html` |
| Add/modify an LLM provider, agent behavior, memory, MCP tools, or the generated API client | `references/ai-and-data.md` | `packages/chat-agent-toolkit`, `packages/write-language`, `packages/qwksearch-mcp-server`, `packages/qwksearch-api-client` |
| Reuse or change a standalone shadcn-style widget (dock, settings panel, weather, voice hook) | `references/ui-widgets.md` | `packages/shadcn-app-dock`, `packages/shadcn-settings`, `packages/react-weather-forecast`, `packages/use-voice-control` |

Each reference file lists concrete file paths, the dev/build command for
that piece, and the pattern to follow when adding something new (e.g. the
exact shape of a new search engine adapter, or how a new LLM provider gets
registered). Only load the ones relevant to the task — that's the point of
splitting them out.

## Working in this monorepo

- **Package manager is bun**, not npm/yarn — use `bun install`, `bun run <script>`, `bun x <pkg>`. Workspaces are `packages/*` and `apps/*` (root `package.json`).
- **Turbo** orchestrates cross-package builds (`turbo build`, `turbo dev --filter=<name>`). If you change a package that another app imports as a workspace dependency (e.g. `research-agent-ui` → `qwksearch-web`), you generally need to *build* that package (`bun run build` inside it, or let `qwksearch-web`'s `prebuild` script do it) before the consuming app picks up the change — dev-mode hot reload across workspace packages is not guaranteed everywhere.
- **Tests**: `bun run test` at the root runs the Vitest workspace (`vitest.workspace.ts`) across all packages that define `vitest.config.ts`. Run a single package's tests with `cd packages/<name> && bun run test` — faster feedback while iterating.
- **This app has its own unrelated "Skills & Memory" feature** (a Perplexity-style per-user skill toggle system, `docs/SKILLS_AND_MEMORY.md`, surfaced in Settings). Don't confuse it with this Claude Code skill — if the user says "add a new skill" they likely mean a new tool/capability in `chat-agent-toolkit` or a new entry in that in-app skills panel, not a `.claude/skills/*` folder.
- **Don't reinvent an adapter pattern.** Most "add a new X" tasks in this repo (search engine, extractor, LLM provider, MCP tool) already have 10-70 existing examples to copy. Find the closest existing one in the relevant package and follow its shape exactly — the reference files point to where these live.
- **Root `README.md` and each package's own `README.md`** are usually more up to date on public API/usage than any doc here — cross-check them when a package's shape has clearly moved on.
