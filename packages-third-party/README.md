# packages-third-party — vendored LobeHub packages

This directory is a **verbatim, unmodified copy of every workspace package** from
the LobeHub (lobe-chat) monorepo, vendored here as the evaluation/reference base
for the "LobeHub as core engine" integration described in
[`docs/LOBEHUB_CORE_ENGINE_PLAN.md`](../docs/LOBEHUB_CORE_ENGINE_PLAN.md).

## Provenance

| | |
|---|---|
| Upstream | [`vtempest/lobehub`](https://github.com/vtempest/lobehub) (fork of [`lobehub/lobe-chat`](https://github.com/lobehub/lobe-chat)) |
| Commit | `25a7c3fd9187a0b4c038642282e0df973e2a54c4` (2026-09-01) |
| Version | `2.2.13` |
| Copied | `packages/*` → `packages-third-party/*`, 96 packages, unmodified |
| License | [`LICENSE`](./LICENSE) — **LobeHub Community License** (Apache-2.0 + additional conditions) |

## ⚠️ License gate — read before shipping anything from here

The LobeHub Community License permits commercial *use* without source
modification, but **developing and distributing a derivative work requires a
commercial license from LobeHub** (hello@lobehub.com). This vendored copy exists
for evaluation, planning, and local development. Do **not** ship a build that
bundles code from this tree until the licensing question in
`docs/LOBEHUB_CORE_ENGINE_PLAN.md` Phase 0 is resolved in writing.

Note the exception: the separately published `@lobehub/*` npm packages
(`ui`, `icons`, `editor`, `tts`, `charts`, `analytics`) are **MIT** and can be
used freely today — those come from npm, not from this tree.

## Deliberately not wired in

These packages are **not** part of the bun workspace, the turbo graph, or the
vitest project registry:

- Root `package.json` `workspaces` is `["packages/*", "packages/render-url-to-html/*", "apps/*"]` — `packages-third-party/*` is intentionally absent, so `bun install` ignores this tree and its (many) dependencies.
- Root `vitest.config.ts` lists projects explicitly; none point here.
- `turbo.json` tasks resolve through workspaces, so nothing here builds or tests in CI.

Promotion out of this tree happens package-by-package per the plan doc: a
package that graduates gets moved (not copied) into the workspace, given a
build step, provenance headers, and an entry in the turbo/prebuild chain.

## Orientation — what's in here

The ~96 packages fall into rough groups (see the plan doc for the full triage):

- **Core engine**: `agent-runtime`, `model-runtime`, `model-bank`, `context-engine`, `conversation-flow`, `tool-runtime`, `builtin-tools`, `prompts`
- **Data layer**: `database` (Drizzle/Postgres schema + 150+ migrations), `trpc`, `types`, `const`, `utils`
- **Settings/config**: `env`, `app-config`, `edge-config`, `config`
- **Content ingestion**: `web-crawler`, `file-loaders`, `ssrf-safe-fetch`, `markdown-patch`
- **Builtin tools** (~35 `builtin-tool-*` packages): web-browsing, knowledge-base, image-generation, calculator, memory, task, …
- **Desktop/Electron**: `electron-*`, `desktop-bridge`, `device-*`, `local-file-shell`
- **Chat platform adapters**: `chat-adapter-{feishu,imessage,line,qq,wechat}`
- **Infra/misc**: `locales`, `openapi`, `sdk`, `observability-otel`, `agent-tracing`, eval packages
