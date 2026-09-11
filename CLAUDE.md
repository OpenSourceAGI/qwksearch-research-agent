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
   Each package and app also has its own `CLAUDE.md` next to its `readme.md`,
   carrying the rules and traps specific to working *in* it.
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
  `CLAUDE.md` when behaviour or public API changes.
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

Per-workspace notes live in each package's and app's own `CLAUDE.md`.
