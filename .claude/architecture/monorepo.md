# Monorepo Mechanics

Bun workspaces + Turborepo. Most of the friction an agent hits in this repo is one
of the five things below.

## Workspaces

Declared in the root `package.json`:

```
packages/*
packages/render-url-to-html/*     # the two scrapers are their own workspaces
apps/qwk-vscode-ext
apps/qwksearch-desktop
apps/qwksearch-ext
apps/qwksearch-web
```

The apps are listed one by one rather than globbed as `apps/*`, so that a root
`bun install` cannot walk into `apps/qwk-in-lobe`. A new app is a new line here.

Not covered by that list, and deliberately separate:

- `apps/qwk-in-lobe/` — its own **pnpm** workspace, inside `apps/` but not of it.
- `apps/qwksearch-ext` — its own `pnpm-workspace.yaml` and lockfile. A root
  install does not cover it; install inside it as well.

## Commands

```bash
bun install                    # bun only — never npm/yarn
bun run dev                    # turbo dev --filter=qwksearch-web
bun run dev:editor             # the REASON editor standalone
bun run build                  # turbo build, whole graph
bun run test                   # vitest, root config
bun run test:report            # vitest + HTML reporter into coverage/html
cd packages/<name> && bun run test
```

`turbo.json` is small on purpose: `build` depends on `^build` and caches
`dist/`, `.next/`, `.output/`; `test` depends on `^build` and is **not** cached;
`dev` is persistent and uncached.

## The `dist` trap — read this before debugging a "stale" edit

**Sibling packages are consumed as built `dist/`, not as live source.** Edit
`packages/foo`, run the web app, see no change: nothing is broken, `foo` was not
rebuilt.

```bash
bun run build --filter=<name>            # rebuild the one package
node .github/scripts/build-workspace-packages.mjs # rebuild all, topological order
```

That second script is what `apps/qwksearch-web`'s `prebuild` runs.

The related symptom is `Cannot find module 'react-reason-editor/...' or its type
declarations` — `bun install` symlinks the sibling, but its `exports → types`
point at a `dist/` that does not exist yet. Same fix.

### Why the script exists instead of just turbo

Turbo treats a dependency as internal only when the declared semver range matches
the workspace version. When a package asks for `use-voice-control@^0.1.95` and the
workspace is older, turbo silently drops the edge and builds in the wrong order.
`.github/scripts/workspace-build-order.mjs` keys edges by package **name**, so the script
covers what turbo misses. If you add a workspace dependency and the build order
looks wrong, that mismatch is the first thing to check.

## Tests: three runners, one registry

The root `vitest.config.ts` lists projects **explicitly** — there is no glob, and
no `vitest.workspace.ts` (Vitest 4 dropped it and silently ignored the file).

Packages on a different runner are intentionally absent from that list and run
from their own `test` script:

| Package | Runner |
| --- | --- |
| `domain-rank`, `extract-pdf` | `bun test` |
| `extract-youtube` | jest |
| `language-model-training` | pytest |

**When you add a package**, add its `vitest.config.ts` path to the `projects`
array in the root config, add a matrix row to
`.github/workflows/test-coverage.yml`, and give it a skill under
`skills/ask-<name>/`. Turbo picks it up from the workspace glob on its own.

## Adding a package — checklist

1. `packages/<name>/package.json` (match a sibling's field order and license).
2. Its own `vitest.config.ts`, registered in the root `vitest.config.ts`.
3. A matrix row in `.github/workflows/test-coverage.yml`.
4. `skills/ask-<name>/SKILL.md`, plus rows in `skills/README.md` and in
   `skills/ask-qwksearch-monorepo/SKILL.md`.
5. A bullet in the root `README.md` package list.
6. Run `bun install` and commit the `bun.lock` diff.

## Lockfile

Cloudflare's build runs `bun install --frozen-lockfile` with the bun pinned in
`packageManager`. A plain `bun install` rewrites `bun.lock` rather than failing, so
drift only ever surfaces as a deploy failure:

```
error: lockfile had changes, but lockfile is frozen
```

The `Lockfile` workflow catches it on every PR. If it goes red: run `bun install`
and commit the resulting `bun.lock`.
