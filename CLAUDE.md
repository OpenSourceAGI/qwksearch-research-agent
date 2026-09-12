# CLAUDE.md — QwkSearch Research Agent

Orientation for Claude agents working in this repository. Read this first; the
detailed notes live in [`.claude/architecture/`](.claude/architecture/) and are
linked from each section below.

QwkSearch is a **Bun + Turborepo monorepo**. One research assistant — search 75+
engines, extract and cite articles / PDFs / YouTube, write the result up in the
REASON editor — shipped as four product shells (web, desktop, browser extension,
VS Code) built from shared `packages/*`.

## Ground rules

1. **Bun, never npm or yarn.** `packageManager` pins the exact Bun version and
   Cloudflare's build installs with it. `bun install` — and commit `bun.lock`
   when it changes, or every Cloudflare build fails on `--frozen-lockfile`.
2. **Find the owning package before you edit.** Most behaviour lives in
   `packages/*`, not in the app that renders it. See
   [`architecture/overview.md`](.claude/architecture/overview.md).
3. **Read the package's skill first.** Every package has one under
   [`skills/ask-<name>/SKILL.md`](skills/), written from the source. They are the
   deepest documentation in the repo — do not re-derive what they already answer.
   Each package and app also has its own note under `.claude/`, mirroring its
   workspace path, carrying the rules and traps specific to working *in* it.
4. **Packages are consumed as built `dist/`, not live source.** A package edit
   that "doesn't show up" almost always means it was not rebuilt. See
   [`architecture/monorepo.md`](.claude/architecture/monorepo.md).
5. **Documentation goes in the user guide package**, `packages/user-help-docs`.
   There is deliberately **no root `docs/` folder** — do not recreate one. See
   [`architecture/documentation.md`](.claude/architecture/documentation.md).
6. **Respect package boundaries.** Import from a package's public entry point,
   never reach into its internals.
7. **Never commit secrets**, credentials, API keys, build output, or an
   unrelated `bun.lock` diff.

## Where things live

| You want to change… | Go to |
| --- | --- |
| The chat / search UI, results, reader, uploads | `packages/research-agent-ui` |
| The document editor | `packages/reason-editor` (+ `-sidebar`) |
| Agent orchestration, MCP, memory, model registry | `packages/chat-agent-toolkit` |
| One LLM call across 10+ providers | `packages/write-language` |
| Search engines, dedupe, ranking | `packages/search-web-api` |
| URL / PDF / YouTube extraction | `packages/extract-*` |
| Routes, `/api` handlers, auth, D1 schema | `apps/qwksearch-web` |
| User-facing documentation | `packages/user-help-docs/content/docs` |
| The qwksearch.com LobeHub build | `packages-lobe/` (separate pnpm workspace) |

Full map: [`architecture/overview.md`](.claude/architecture/overview.md) ·
[`skills/ask-qwksearch-monorepo`](skills/ask-qwksearch-monorepo/SKILL.md).

## Commands

```bash
bun install                    # never npm/yarn
bun run dev                    # turbo dev --filter=qwksearch-web
bun run build                  # turbo build across the graph
bun run test                   # vitest, root config
cd packages/<name> && bun run test    # much faster while iterating
```

## Before you open a PR

- Run the touched package's own tests, then `bun run test` from the root.
- Run `bun run build` if you changed anything a sibling package imports.
- Update the package's `readme.md`, its `skills/ask-<name>/SKILL.md` and its
  note under `.claude/` when behaviour or public API changes.
- Commit style is **gitmoji + conventional commits**:
  `✨ feat(scope): what changed`. See
  [`architecture/conventions.md`](.claude/architecture/conventions.md).
- Target `master`. Keep the PR focused; no drive-by refactors.

## Detailed notes

| Note | Covers |
| --- | --- |
| [overview.md](.claude/architecture/overview.md) | System architecture, the request paths, every package and app |
| [monorepo.md](.claude/architecture/monorepo.md) | Workspaces, the `dist` trap, turbo, the test runner split |
| [web-app.md](.claude/architecture/web-app.md) | The deployed Cloudflare app: Worker, D1, auth, deploy, migrations |
| [documentation.md](.claude/architecture/documentation.md) | Where docs live, the Fumadocs pipeline, the skills convention |
| [conventions.md](.claude/architecture/conventions.md) | Code style, commits, PRs, CI, publishing, security |

Per-workspace notes live under `.claude/`, mirroring the workspace path —
`packages/search-web-api` is documented in
`.claude/packages/search-web-api/CLAUDE.md` — so every agent instruction in the
repo sits in one tree rather than beside the source.

| Workspace | Note |
| --- | --- |
| `apps/collaboration-server` | [.claude/apps/collaboration-server/CLAUDE.md](.claude/apps/collaboration-server/CLAUDE.md) |
| `apps/qwk-vscode-ext` | [.claude/apps/qwk-vscode-ext/CLAUDE.md](.claude/apps/qwk-vscode-ext/CLAUDE.md) |
| `apps/qwksearch-desktop` | [.claude/apps/qwksearch-desktop/CLAUDE.md](.claude/apps/qwksearch-desktop/CLAUDE.md) |
| `apps/qwksearch-ext` | [.claude/apps/qwksearch-ext/CLAUDE.md](.claude/apps/qwksearch-ext/CLAUDE.md) |
| `apps/qwksearch-web` | [.claude/apps/qwksearch-web/CLAUDE.md](.claude/apps/qwksearch-web/CLAUDE.md) |
| `apps/test-reports` | [.claude/apps/test-reports/CLAUDE.md](.claude/apps/test-reports/CLAUDE.md) |
| `packages/chat-agent-toolkit` | [.claude/packages/chat-agent-toolkit/CLAUDE.md](.claude/packages/chat-agent-toolkit/CLAUDE.md) |
| `packages/domain-rank` | [.claude/packages/domain-rank/CLAUDE.md](.claude/packages/domain-rank/CLAUDE.md) |
| `packages/extract-pdf` | [.claude/packages/extract-pdf/CLAUDE.md](.claude/packages/extract-pdf/CLAUDE.md) |
| `packages/extract-webpage` | [.claude/packages/extract-webpage/CLAUDE.md](.claude/packages/extract-webpage/CLAUDE.md) |
| `packages/extract-youtube` | [.claude/packages/extract-youtube/CLAUDE.md](.claude/packages/extract-youtube/CLAUDE.md) |
| `packages/html-renderer-api` | [.claude/packages/html-renderer-api/CLAUDE.md](.claude/packages/html-renderer-api/CLAUDE.md) |
| `packages/investing` | [.claude/packages/investing/CLAUDE.md](.claude/packages/investing/CLAUDE.md) |
| `packages/language-model-training` | [.claude/packages/language-model-training/CLAUDE.md](.claude/packages/language-model-training/CLAUDE.md) |
| `packages/legal-terms-privacy-policy` | [.claude/packages/legal-terms-privacy-policy/CLAUDE.md](.claude/packages/legal-terms-privacy-policy/CLAUDE.md) |
| `packages/notebooklm-api-client` | [.claude/packages/notebooklm-api-client/CLAUDE.md](.claude/packages/notebooklm-api-client/CLAUDE.md) |
| `packages/qwksearch-api-client` | [.claude/packages/qwksearch-api-client/CLAUDE.md](.claude/packages/qwksearch-api-client/CLAUDE.md) |
| `packages/qwksearch-mcp-server` | [.claude/packages/qwksearch-mcp-server/CLAUDE.md](.claude/packages/qwksearch-mcp-server/CLAUDE.md) |
| `packages/react-weather-forecast` | [.claude/packages/react-weather-forecast/CLAUDE.md](.claude/packages/react-weather-forecast/CLAUDE.md) |
| `packages/reason-editor-sidebar` | [.claude/packages/reason-editor-sidebar/CLAUDE.md](.claude/packages/reason-editor-sidebar/CLAUDE.md) |
| `packages/reason-editor` | [.claude/packages/reason-editor/CLAUDE.md](.claude/packages/reason-editor/CLAUDE.md) |
| `packages/render-url-to-html` | [.claude/packages/render-url-to-html/CLAUDE.md](.claude/packages/render-url-to-html/CLAUDE.md) |
| `packages/research-agent-ui` | [.claude/packages/research-agent-ui/CLAUDE.md](.claude/packages/research-agent-ui/CLAUDE.md) |
| `packages/search-web-api` | [.claude/packages/search-web-api/CLAUDE.md](.claude/packages/search-web-api/CLAUDE.md) |
| `packages/searxng-search-cloudflare` | [.claude/packages/searxng-search-cloudflare/CLAUDE.md](.claude/packages/searxng-search-cloudflare/CLAUDE.md) |
| `packages/shadcn-app-dock` | [.claude/packages/shadcn-app-dock/CLAUDE.md](.claude/packages/shadcn-app-dock/CLAUDE.md) |
| `packages/shadcn-settings` | [.claude/packages/shadcn-settings/CLAUDE.md](.claude/packages/shadcn-settings/CLAUDE.md) |
| `packages/trending-news-api` | [.claude/packages/trending-news-api/CLAUDE.md](.claude/packages/trending-news-api/CLAUDE.md) |
| `packages/use-voice-control` | [.claude/packages/use-voice-control/CLAUDE.md](.claude/packages/use-voice-control/CLAUDE.md) |
| `packages/user-help-docs` | [.claude/packages/user-help-docs/CLAUDE.md](.claude/packages/user-help-docs/CLAUDE.md) |
| `packages/write-language` | [.claude/packages/write-language/CLAUDE.md](.claude/packages/write-language/CLAUDE.md) |

`packages-lobe/` is a separate vendored workspace and keeps its upstream
`CLAUDE.md`/`AGENTS.md` pair in place.
