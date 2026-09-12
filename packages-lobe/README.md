# QwkSearch on LobeHub (Cloudflare Workers)

This directory is a copy of the [LobeHub](https://github.com/lobehub/lobehub) monorepo used as the
**foundation of qwksearch.com**, adapted to run entirely on the same Cloudflare infrastructure the
QwkSearch Worker already uses: Workers, D1, KV, R2, Email Routing and Better Auth. The original
LobeHub `packages/*`, `src/`, `apps/server`, locales and public assets live here unchanged except for
the deltas listed under [What changed](#what-changed).

It is intentionally **separate from `../packages`** (the QwkSearch bun/turbo workspace): LobeHub is
its own pnpm workspace (`pnpm-workspace.yaml`) with ~110 internal `@lobechat/*` packages.

```
packages-lobe/
├── worker/                    # Cloudflare Worker entry (Hono) — LobeHub backend + QwkSearch features
│   ├── index.ts               # fetch handler; installs the per-request context
│   ├── app.ts                 # route composition
│   ├── cf/                    # bindings bridge (env, request context)
│   ├── routes/                # auth, trpc, webapi, api, spa, qwksearch/*
│   ├── qwksearch/             # D1 schema + article extraction chain
│   └── shims/                 # next/*, Node-only packages, unsupported builtins
├── src/features/QwkSearch/    # SPA features: ArticlePanel (extract side panel) and Docs
├── migrations/d1/             # QwkSearch tables for D1
├── vite.worker.config.ts      # Worker bundle build
├── wrangler.jsonc             # bindings: DB (D1), KV, R2, EMAIL, ASSETS; custom build hook
├── scripts/ensureWorkerBuild.mjs  # deploy-time guard: builds the Worker if it is missing
└── scripts/buildWorkerAssets.mts
```

## How it runs on Workers

| Concern | LobeHub default | On Cloudflare (this tree) |
| --- | --- | --- |
| HTTP shell | Next.js route handlers + middleware | One Hono app (`worker/app.ts`) mounting the same handlers: Better Auth, tRPC (lambda/tools/mobile/async), `/webapi/*`, `/api/v1` OpenAPI, agent/workflow/webhook Hono apps, `/f/:id`, SPA shells |
| Database | Postgres via Neon serverless or `pg` | Same Postgres schema. `DATABASE_URL` by default (Neon serverless driver works natively on Workers); add a `HYPERDRIVE` binding to pool through Hyperdrive with `pg` instead |
| Auth | Better Auth (Drizzle adapter) | Unchanged. Secondary storage uses the `KV` binding instead of Redis |
| Email | nodemailer / Resend | New `cloudflare` provider on the `EMAIL` (Email Routing) binding; Resend still works |
| Redis | ioredis | Not reachable from Workers → `DISABLE_REDIS=1`, in-memory fallbacks |
| OIDC provider (CLI/desktop sign-in) | `oidc-provider` (Koa) | Not supported on workerd; `/oidc/*` answers 501. Browser sign-in is unaffected |
| Static SPA | Next.js serves `/_spa` | `ASSETS` binding; the Worker injects `window.__SERVER_CONFIG__` per request (`worker/routes/spa.ts`) |
| Config | `process.env` | `nodejs_compat` mirrors vars/secrets to `process.env`; `worker/cf/globals.ts` does it eagerly for module-time reads |

### Why Postgres and not D1 for LobeHub itself

LobeHub's schema is 169 Postgres tables with 211 `jsonb` columns, 11 `pgvector` columns, arrays and
~380 raw SQL fragments across models/repositories, plus 157 migrations. Porting that to SQLite/D1 is a
rewrite of the data layer, not a runtime port. This tree therefore keeps LobeHub on Postgres (through
Hyperdrive or Neon, both first-class on Workers) and uses **D1 for the QwkSearch-specific tables**
(`articleCache`, `articleQA`, `favorites`, `documents`, `research_quotes`, `share_tokens`,
`google_docs_sync`) — the same `qwksearch-new` database the QwkSearch Worker already uses, so existing
data is reused as-is.

## QwkSearch features added to LobeHub

- **Article extract side panel** (`src/features/QwkSearch/ArticlePanel`): any external link clicked
  inside a chat message opens in a resizable right-hand panel instead of a new tab (modifier/middle
  clicks keep the browser default). The panel extracts the page through
  `GET /api/doc/article`, shows a citation, supports favorites (`/api/doc/favorites`), Q&A
  (`POST /api/agent/article-qa`) and follow-up questions (`POST /api/agent/article-followups`).
  Q&A/follow-ups run through LobeHub's `AiGenerationService`, so the user's own providers and key
  vaults apply. Programmatic open: `window.dispatchEvent(new CustomEvent('qwksearch:open-article', { detail: { url } }))`.
- **Docs** (`/docs`, `src/features/QwkSearch/Docs`): Markdown research documents stored in D1
  (`/api/doc/documents`), listed in the nav panel, autosaved, with write/preview modes.
- **QwkSearch search provider** (`apps/server/src/services/search/impls/qwksearch/`): a
  `SearchServiceImpl` that backs LobeHub's web-browsing tool with QwkSearch's own fan-out
  (`search-web-api`, 100+ engines) instead of a single upstream provider. Enable it with
  `SEARCH_PROVIDERS=qwksearch`; it calls `GET /api/agent/search` on the QwkSearch Worker
  (`QWKSEARCH_SEARCH_URL`, default `https://qwksearch.com/api/agent/search`, optional
  `QWKSEARCH_API_KEY`). Requested categories are normalized across three vocabularies
  (LobeHub's manifest, QwkSearch's 13-category registry, SearXNG's), fanned out one request per
  category (3 by default) and merged by URL — highest score wins, engine lists union. Everything
  the request carries is resolved by `searchSettings.ts`, layering shipped defaults under Worker
  env under the user's preferences under the tool call's own arguments; the vars are below.
- **Extraction chain** (`worker/qwksearch/extract.ts`): QwkSearch's own `extract-webpage`
  → Cloudflare Puppeteer scraper (`SCRAPER_URL`, 8s deadline) → Tavily (`TAVILY_API_KEY`) →
  LobeHub's own `@lobechat/web-crawler` (fetch + readability). The chain is routed per URL kind
  by `tiersForUrl`:
  - **Articles** run the whole chain. Tier 0 gives citation extraction — author, `author_cite`,
    `author_short`, `author_type`, date and source resolved against a 90k-name database — so the
    panel's `cite` is a real APA citation rather than `hostname (no date)`. When tier 0 fails and
    the Puppeteer scraper gets past the bot check, the rendered HTML still goes through that same
    citation extraction (`articleFromRenderedHtml`), falling back to LobeHub readability.
  - **YouTube** URLs are extracted as transcripts through `extract-youtube`, and **PDF/arXiv**
    URLs through `extract-pdf`. Both run tier 0 alone: the later tiers render HTML, which for
    these URLs is page chrome rather than the transcript or the document.
  - Search-engine result pages, malformed URLs, and video hosts with no transcript route
    (Vimeo, Dailymotion, Twitch) are still rejected up front.

  `extract-webpage` is loaded through a lazy, injectable loader (`worker/qwksearch/extractQwkSearch.ts`),
  so a missing or broken install degrades to the next tier instead of taking the Worker down.
- **Extraction settings** (`worker/qwksearch/extractSettings.ts`): the chain's knobs — transcript
  language, citation style, render backend, PDF OCR mode, which tiers run — are resolved rather
  than hard-coded, layering operator config over the shipped defaults and then per-request
  preferences over that. Every value is validated on the way in, and an unparseable one falls back
  to the layer below instead of failing the request. `GET /api/doc/article` accepts exactly two of
  them as query parameters, `cite` (`apa` | `mla` | `chicago`) and `lang` (comma-separated
  transcript languages); hosts, credentials and the OCR mode are environment-only, because a
  caller-supplied backend URL would make the endpoint an open request proxy.
- **Extraction preferences** (`worker/qwksearch/extractionPreferences.ts`,
  `GET`/`PUT`/`DELETE /api/doc/extraction-settings`): the signed-in user's half of those settings,
  stored as JSON on the D1 `extraction_settings` table and folded into every article extraction
  between the operator's environment and the request's query parameters. The API returns what the
  user set, what is actually in force, and the enums and bounds a settings pane needs — with every
  host and credential reduced to a presence flag, never a value. This is the sink the Extraction
  settings pane writes to. Reads never fail an extraction: an unreadable row falls
  back to the operator's configuration, and a request with no session cookie skips the lookup.
- **Search preferences** (`apps/server/src/services/search/impls/qwksearch/searchPreferences.ts`,
  `GET`/`PUT`/`DELETE /api/doc/search-settings`): the same thing for the search fan-out, on the D1
  `search_settings` table, with the same three-part response and the same never-fail reads. The
  signed-in user's categories, language, recency, safe-search, fan-out bound and result cap sit
  between the operator's environment and the tool call's own arguments; the endpoint and the API
  key cannot be stored here at all. The user id reaches the fan-out from the tool-execution
  context through `SearchService`, and the row is read once per tool execution rather than per
  query.
- **Settings panes** (`src/features/Settings/extraction/`, `src/features/Settings/search/`):
  `/settings/extraction` and `/settings/search`, the two forms over the preferences APIs above,
  living inside LobeHub's own settings shell rather than beside it. Both are built the same way and
  the shape is worth knowing before touching either: the `GET` response's `options` block carries
  every enum and bound, so a new category or citation style needs no UI edit; every input has an
  explicit *inherit* state and the PUT body **omits** what the user has not set, because an absent
  key is the only way to say "follow the operator's configuration"; the inputs seed from
  `overrides` and never from `effective`, so saving one field cannot silently pin the rest to
  today's server config; and the form re-renders from the response, because `PUT` validates and
  trims. Hosts and credentials appear only as read-only "configured / not configured" rows. Each
  pane's `contract.test.ts` is the drift guard — it imports the real resolver, rebuilds the exact
  document its route returns, and fails if the client's restated types fall behind.
- **The legacy settings map** (`src/features/Settings/qwksearch/legacySettingsMap.ts`): not a
  feature — a migration artifact with a test. It carries all nine sections of the old
  qwksearch.com settings surface (`packages/research-agent-ui/src/settings/sections.json`) and all
  22 fields of its flat "Search Settings" list, each with what stores it today, the engine tabs
  that take it over, and what is still missing before the old surface can be deleted.
  `retirementBlockers()` returns the sections that are not covered yet — nine of nine today — so
  "may we delete it?" is answerable from code. `legacySettingsMap.contract.test.ts` reads both
  JSON schemas, the legacy components and `componentMap.ts` from disk and fails when either side
  moves, which is the difference between a map and a stale paragraph. Both files are deleted along
  with the surface they describe.
- **Branding**: `BRANDING_NAME`/`ORG_NAME` = QwkSearch, QwkSearch favicons under `public/`,
  support/social URLs point at qwksearch.com.

## Build & deploy

```bash
cd packages-lobe
pnpm install                       # LobeHub workspace (pnpm, not bun)

# 1. SPA bundles + static assets → dist/client
bun run build:spa                  # dist/desktop  (main app, base /_spa/)
bun run build:spa:auth             # dist/auth     (sign-in app, base /_spa-auth/)
tsx scripts/buildWorkerAssets.mts  # public/ + dist/desktop + dist/auth → dist/client

# 2. Worker bundle → dist/worker/index.js (single ES module, ~7.9 MB gzipped,
#    against Cloudflare's 10 MB compressed Worker limit)
bun run build:worker:server

# or all of the above:
bun run build:worker

# 2b. Check the bundle against Cloudflare's compressed-size limit before
#     spending a deploy on finding out. Warns under ~1 MB of headroom, fails
#     over the limit. `WORKER_BUDGET_MB` / `WORKER_BUDGET_WARN_MB` override.
bun run cf:budget

# 3. D1 tables (both migration files, idempotent; safe on the existing
#    qwksearch-new database)
bun run cf:d1:migrate              # remote
bun run cf:d1:migrate:dev          # local wrangler dev

# 4. Deploy
bun run cf:deploy                  # default env
bun run cf:deploy:production       # `production` env in wrangler.jsonc
```

Local run: `bun run cf:dev` starts `wrangler dev --local` with `wrangler.local.jsonc` (dummy secrets,
local D1/KV, no Cloudflare account needed); run `bun run cf:d1:migrate:dev` once to create the D1
tables locally. The Worker needs `dist/client/_spa/index.html` to serve pages, so run the SPA build
first. Postgres-backed routes need a reachable `DATABASE_URL` (set it in `wrangler.local.jsonc` vars).
Verified locally: `/api/version`, `/api/health`, `/api/auth/get-session`, `/trpc/lambda/config.getGlobalConfig`,
`/api/v1/docs`, `/api/doc/documents` (D1), `/signin` renders the sign-in SPA in headless Chromium, and
protected pages redirect to `/signin`.

### Cloudflare Workers Builds

The build image resolves the Node version from `.nvmrc` and installs it by exact
version, so an nvm alias such as `lts/krypton` fails at `Installing nodejs
lts/krypton` before a single dependency is fetched. `packages-lobe/.nvmrc` pins
`24.20.0` (the current Krypton LTS release, so local nvm users stay on the same
runtime); bump it to another exact version, or override it with a `NODE_VERSION`
build variable in the project settings.

Project settings for a Workers Builds deploy of this tree:

| Setting | Value |
| --- | --- |
| Root directory | `packages-lobe` |
| Install command | `pnpm install --no-frozen-lockfile` |
| Build command | `pnpm run build:worker` |
| Deploy command | `pnpm exec wrangler deploy` |

Enter all four. The default build command is `npm run build`, which is the Next build, not the
Worker build: it writes `.next/` and never `dist/worker/index.js`, so the deploy step that follows
has nothing to upload and fails with `The entry-point file at "dist/worker/index.js" was not
found`. A deploy left on the defaults now recovers instead of failing: `wrangler.jsonc` declares a
custom build command, `node scripts/ensureWorkerBuild.mjs`, which `wrangler deploy` runs first — it
checks for `dist/worker/index.js` and `dist/client/_spa/index.html`, and runs `build:worker` itself
(saying so in the log) when either is missing. It is a two-`stat` no-op on the recipe above, where
the build step already produced them, and `WORKER_BUILD_FALLBACK=0` turns it into a bare check that
fails rather than builds. Setting the build command is still the right fix: the fallback runs
*after* the default `npm run build` has already spent three minutes on a Next build nothing uploads.

The default build command is also how a Workers build ends at `Failed to
collect page data for /api/auth/resolve-username` — `next build` imports every route to read its
config, and importing a route that talks to Postgres used to construct the connection pool, which
throws when `KEY_VAULTS_SECRET` is unset. The pool is now built on first query
(`packages/database/src/core/db-adaptor.ts`), so neither build needs runtime secrets; `build:worker`
is still the only one whose output `wrangler deploy` uploads.

The repo root's `packageManager` (`bun@1.4.0`) and this tree's
(`pnpm@10.33.0`) are both detected and both are installed, and the build image
picks the repo root's bun unless the install command is set explicitly. Prefer
pnpm here: `pnpm-workspace.yaml` carries the `overrides` (react 19.2.4, jose,
pdfjs-dist) and the `@upstash/qstash` patch that bun does not read, so a bun
install resolves a different tree than every other consumer of this workspace.

Whichever installer runs, the `workspaces` list in `package.json` has to match
the directories actually vendored here: bun fails the install outright on a
literal entry with no directory behind it (`error: Workspace not found "e2e"`),
where pnpm skips it. The upstream `e2e` tree is not vendored, so neither the
workspace entry nor its scripts are kept.

### Required bindings / secrets

Bindings are declared in `wrangler.jsonc` (identical IDs to `apps/qwksearch-web/wrangler.jsonc` for
KV and D1). Postgres comes from the `DATABASE_URL` secret, read by the Neon serverless driver
(`DATABASE_DRIVER=neon`). To pool through Hyperdrive instead, create a config and add the binding
with the id it prints — a placeholder id is not deployable, wrangler rejects the whole upload, so
the binding is left out until there is a real config behind it:

```bash
wrangler hyperdrive create qwksearch-lobehub-pg --connection-string="postgres://user:pass@host:5432/lobehub"
# then, in wrangler.jsonc:
#   "hyperdrive": [{ "binding": "HYPERDRIVE", "id": "<the id it prints>" }]
```

Secrets (`wrangler secret put …`):

| Secret | Purpose |
| --- | --- |
| `KEY_VAULTS_SECRET` | encrypts stored provider keys (`openssl rand -base64 32`) |
| `AUTH_SECRET` | Better Auth signing secret |
| `DATABASE_URL` | the Postgres connection (e.g. Neon URL, `DATABASE_DRIVER=neon`); optional only when a `HYPERDRIVE` binding is bound |
| `S3_*` | uploads — point at the `qwksearch-uploads` R2 bucket via its S3 API |
| `TAVILY_API_KEY`, `SCRAPER_API_KEY` | article extraction fallbacks |
| provider keys (`OPENAI_API_KEY`, …) | server-side model providers, same as LobeHub |
| `QSTASH_TOKEN`, `QSTASH_*_SIGNING_KEY` | LobeHub workflows (Upstash QStash) |

Plain vars (`APP_URL`, `DATABASE_DRIVER`, `DISABLE_REDIS`, `EMAIL_SERVICE_PROVIDER`, `SMTP_FROM`,
`SCRAPER_URL`, `SEARCH_PROVIDERS`, `QWKSEARCH_SEARCH_URL`) are in `wrangler.jsonc`; `keep_vars` keeps dashboard-entered vars across deploys.

Extraction is tuned by an optional group of vars, all defaulted (`worker/qwksearch/extractSettings.ts`):

| Var | Default | Meaning |
| --- | --- | --- |
| `QWKSEARCH_CITATION_STYLE` | `apa` | `apa`, `mla` or `chicago` |
| `QWKSEARCH_EXTRACT_LANGUAGES` | `en` | preferred YouTube transcript languages, most-preferred first (max 5) |
| `QWKSEARCH_EXTRACT_TIMEOUT` | `10` | `extract-webpage` request timeout, seconds (1–60) |
| `QWKSEARCH_EXTRACT_TIERS` | all four | which tiers may run, in order: `qwksearch,scraper,tavily,crawler` |
| `QWKSEARCH_SCRAPER_DEADLINE_MS` | `8000` | Puppeteer render budget (1000–30000) |
| `PDF_PROCESSOR` | `frontend` | `extract-pdf` OCR mode: `frontend` (none), `hybrid`, `docling` |
| `PDF_PROCESSOR_URL` | — | remote docling-compatible processor for `hybrid`/`docling` |
| `QWKSEARCH_EXTRACT_PROXY` | — | outbound proxy for the extractor's own fetches |
| `QWKSEARCH_EXTRACT_THIRD_PARTY_BACKUP` | `false` | let the extractor fall back to a third-party reader |

Search is tuned by the same kind of group, also all defaulted
(`apps/server/src/services/search/impls/qwksearch/searchSettings.ts`):

| Var | Default | Meaning |
| --- | --- | --- |
| `QWKSEARCH_SEARCH_CATEGORIES` | `general` | categories searched when the tool call names none |
| `QWKSEARCH_SEARCH_MAX_CATEGORIES` | `3` | most categories fanned out per query (1–10) |
| `QWKSEARCH_SEARCH_LANGUAGE` | `en-US` | BCP-47 tag sent as `lang` |
| `QWKSEARCH_SEARCH_TIME_RANGE` | — | default recency when the call names none: `day`, `week`, `month`, `year` |
| `QWKSEARCH_SEARCH_SAFE` | `false` | ask the engines to filter adult content |
| `QWKSEARCH_SEARCH_PUBLIC_INSTANCES` | `false` | let the fan-out fall back to public SearXNG instances |
| `QWKSEARCH_SEARCH_RESULT_LIMIT` | — | keep at most this many merged results (1–200) |

Every row above is the operator's default. A signed-in user can override all seven through
`/api/doc/search-settings`; `QWKSEARCH_SEARCH_URL` and `QWKSEARCH_API_KEY` are environment-only,
since a user-supplied backend would leak the configured bearer token to a host of their choosing.

Run
LobeHub's Postgres migrations once against the database: `bun run db:migrate` with `DATABASE_URL` set.

## Tests

```bash
# Everything QwkSearch added to the engine, in one command -- 589 tests in 39
# files, about a minute. This is what CI runs (.github/workflows/lobehub-engine.yml),
# and the path list lives in the script so the workflow and the docs cannot drift.
bun run test:qwksearch

# Types for every QwkSearch-owned file -- worker/, src/features/QwkSearch/ and
# the two settings panes with the controls they share. The repo-wide
# `bun run type-check` covers them in principle but OOMs at ~13.8 GB RSS; this
# one takes about a minute and reports clean. Also in CI.
bun run type-check:qwksearch

# The same script narrowed to the Worker, for iterating on worker/.
bun run type-check:worker
```

The individual recipes below are the same paths split up, for iterating on one
seam:

```bash
# Worker + Cloudflare adapters + QwkSearch UI (root vitest config)
bunx vitest run worker src/features/QwkSearch src/libs/better-auth/utils/kvSecondaryStorage.test.ts \
  scripts/ensureWorkerBuild.test.ts \
  apps/server/src/services/email/impls/cloudflare apps/server/src/services/search/impls/qwksearch

# the two settings panes, including their contract drift guards
bunx vitest run src/features/Settings/extraction src/features/Settings/search

# routes/nav registration touched by /docs
bunx vitest run src/spa/router/desktopRouter.sync.test.tsx src/features/NavPanel/routeKey.test.ts

# database bridge
cd packages/database && bunx vitest run src/core/cloudflare.test.ts src/core/db-adaptor.test.ts
```

Coverage includes SPA locale/device/route resolution, the extraction fallback chain, the article and
docs stores, chat-link interception, KV secondary storage, the Cloudflare email provider, the
Hyperdrive bridge, rendered-component tests for the article panel and the docs editor, and both
settings panes end to end — client, form state, rendered form, and a contract test per pane that
rebuilds its route's response from the real resolver. The deploy-time build guard
(`scripts/ensureWorkerBuild.test.ts`) runs the real script against a stub `build:worker`, so the
cases that matter for a deploy — no outputs, half the outputs, a failing build, a green build that
writes nothing — are checked without spending a Worker build.

## What changed vs. upstream LobeHub

- `packages/database/src/core/web-server.ts`: Hyperdrive branch (`resolveHyperdriveConnectionString`).
- `packages/database/src/core/db-adaptor.ts`: `serverDB` is a lazy proxy instead of a
  `getDBInstance()` call evaluated at module scope, so importing a module cannot build a
  connection pool. It resolves on first property access, to the one instance `getServerDB()`
  caches. Upstream's eager export fails any `next build` that runs without `KEY_VAULTS_SECRET`,
  while it is merely collecting a route's page data.
- `src/libs/better-auth/utils/config.ts`: KV-backed `secondaryStorage` (`createKVSecondaryStorage`).
- `apps/server/src/services/email/*`: `cloudflare` provider (Email Routing binding), default on Workers.
- `apps/server/src/services/search/impls/`: new `qwksearch` provider (`SearchImplType.QwkSearch`),
  plus its settings resolver and D1-backed user preferences. Upstream edits there and around it
  are all one-liners carrying the caller's user id to the provider, so the signed-in user's search
  preferences apply: the factory switch and enum (`impls/index.ts`, which also gains a
  `SearchImplOptions` argument), the `SearchService` constructor
  (`services/search/index.ts`), the runtime that builds it
  (`services/toolExecution/serverRuntimes/webBrowsing.ts`), and five assertions on the factory's
  arity in `services/search/index.test.ts`.
- `worker/qwksearch/schema.ts`: re-exports the `search_settings` table from the search impl rather
  than declaring it, because the impl reads it too and the dependency runs worker → `@/server/*`
  and never back. See §F5b of the integrations reference.
- `packages/builtin-tool-web-browsing/`: new `src/searchCategories.ts`; `manifest.ts` swaps the
  hard-coded `searchCategories` enum for `resolveSearchCategories()` (import + expression) and
  `src/index.ts` gains one export line. No upstream file there changed for the search settings
  layer — only a doc comment in `searchCategories.ts`, which is a QwkSearch-added file.
- Settings-tab registration for the two QwkSearch panes — five points, no logic, and the same five
  for each: the `SettingsTabs.Extraction` / `SettingsTabs.Search` enum members
  (`src/store/global/initialState.ts`), an entry in `src/features/Settings/features/componentMap.ts`
  and `componentMap.desktop.ts` (kept in step by `componentMap.sync.test.ts`), the sidebar items in
  `src/features/Settings/hooks/useCategory.tsx`, and the compact-header title map in
  `src/features/Settings/features/SettingsContent.tsx`. No route file: `/settings/:tab` already
  dispatches by enum value.
- `src/features/Settings/qwksearch/`: new, and entirely QwkSearch's — the controls both panes
  share (an ordered drag-sortable list for `tiers`/`categories`, and BCP-47 language fields for
  `languages`/`language`). No upstream file changed for it; the two panes are QwkSearch-added
  files and import it through the barrel. See §F5d of the integrations reference, which also
  records why the language fields use base-ui's `AutoComplete` and not a tags `Select`.
  `legacySettingsMap.ts` and its contract test live in the same directory and change no upstream
  file either — they only *read* `componentMap.ts` as text, which is the point: the guard notices
  when upstream renames or drops a pane the migration was counting on (§F5e).
- `packages/env/src/email.ts`: accepts `EMAIL_SERVICE_PROVIDER=cloudflare`.
- `packages/business/const/src/branding.ts`, `packages/const/src/url.ts`: QwkSearch branding.
- `packages/locales/src/default/{electron,qwksearch}.ts` + `locales/{en-US,zh-CN}`: new keys.
- `src/routes/(main)/_layout/index.tsx`: mounts the article panel; `src/spa/router/desktopRouter.shared.tsx`
  and `src/features/NavPanel/routeKey.ts`: `/docs` route + nav key.
- `packages/file-loaders`, `packages/eval-dataset-parser`: `xlsx` pinned to the npm registry build
  (the SheetJS CDN tarball is not reachable from the build environment).
- `package.json`: `build:worker*`, `cf:*` scripts; `wrangler`/`@cloudflare/workers-types` dev deps;
  `worker/cf/globals.ts` registered in `sideEffects`; `extract-webpage` dependency (tier 0 of the
  extraction chain); `type-check:worker`, `type-check:qwksearch`; `test:qwksearch` — one script
  running every path the recipes above list separately, so the workflow, this README and §6 of the
  integrations reference have a single source of truth for what "the integration's tests" means.
- `.github/workflows/lobehub-engine.yml` (outside this directory, and the only CI job that installs
  this workspace at all — every other workflow installs with bun at the repo root, where
  `packages-lobe` is not in `workspaces`). Path-filtered to `packages-lobe/**`; runs
  `type-check:qwksearch` and `test:qwksearch` on an `--ignore-scripts` pnpm install. It does **not**
  run `cf:budget`: that needs `build:worker`, which needs a full install
  (`build:worker:server` dies at `[UNLOADABLE_DEPENDENCY] @napi-rs/canvas` otherwise) and 8 GB of
  heap. Note that `pnpm/action-setup` has to be pointed at *this* `package.json` for the pinned
  pnpm, since the repo root pins bun, and that `lockfile: false` here means there is no lockfile to
  cache on or install `--frozen` against.
- `tsconfig.worker.json`, `tsconfig.qwksearch.json` + `scripts/typeCheckScoped.mts`: new, all three
  QwkSearch's. They type-check the QwkSearch code on its own — `worker/` for the first config,
  plus `src/features/QwkSearch/` and the three settings directories for the second — counting and
  ignoring the ~500 pre-existing errors in the upstream files those imports pull in, so only
  QwkSearch paths decide the exit code. One script, the prefixes as arguments. It exists because
  the repo-wide `bun run type-check` OOMs at ~13.8 GB RSS and until the workflow above no CI job
  installed this workspace at all — so nothing had ever checked those files, and an unreachable
  extraction chain calling two identifiers that exist nowhere in the repo lived in
  `worker/qwksearch/extract.ts` until it was deleted. `tsconfig.worker.json` is also the only place
  that pulls in `@cloudflare/workers-types`, without which `D1Database`, `KVNamespace`,
  `Hyperdrive`, `R2Bucket`, `Fetcher` and `ExecutionContext` resolve to nothing. No upstream file
  is edited: `tsconfig.json` is extended, not changed.
- `scripts/ensureWorkerBuild.mjs` + the `build` command in `wrangler.jsonc`: new, QwkSearch's. Every
  `wrangler deploy` checks for `dist/worker/index.js` and `dist/client/_spa/index.html` first and
  runs `build:worker` when they are missing, so a Workers Builds project left on the default
  `npm run build` deploys instead of failing on a missing entry point. Plain `.mjs` run by `node`
  rather than a `.mts` run by `tsx` like the rest of `scripts/`: it is the first thing a deploy
  runs, so it assumes nothing but node.
- `wrangler.jsonc`: no `hyperdrive` binding. It carried a `REPLACE_WITH_HYPERDRIVE_ID` placeholder
  in both environments, which wrangler rejects — an id that resolves to no config fails the whole
  upload, so neither environment could deploy as written. `DATABASE_DRIVER=neon` and the
  `DATABASE_URL` secret are the configured path anyway, and `HYPERDRIVE` is optional at runtime
  (`web-server.ts` falls back when the binding is absent). The README says how to add it back.
- `vite.worker.config.ts`: `linkedom` is no longer aliased to a shim. It is pure JS and runs on
  workerd, and `extract-webpage` parses every page with it; LobeHub only reached it from the
  dev-server template rewriter, which is why it used to be stubbed. `worker/shims/linkedom.ts`
  is deleted. Cost: the Worker bundle goes from 7.39 MB to 7.93 MB gzipped against Cloudflare's
  10 MB limit (linkedom, plus the Prism grammars `extract-webpage` uses to highlight code blocks).

Everything under `worker/`, `src/features/QwkSearch/`, `src/features/Settings/extraction/` and
`src/features/Settings/search/` is new.

## Known gaps

- **OIDC / CLI & desktop sign-in**: `oidc-provider` cannot run on workerd → `/oidc/*` returns 501.
- **Redis-backed features** (agent runtime stream fan-out across isolates, edit locks, some rate
  limits) run on in-memory fallbacks; a single Worker isolate is not shared state. Add an
  HTTP Redis provider (Upstash) to `src/libs/redis` to restore multi-isolate coordination.
- **Mobile SPA**: `build:spa:mobile` output is served when present (`dist/client/_spa-mobile`);
  otherwise mobile visitors get the desktop bundle.
- **SEO strings** in the HTML shell are English-only on Workers (`worker/shims/serverTranslation.ts`);
  the SPA itself is fully localized.
- **Sharp / native image processing** is unavailable; avatar processing falls back to the original image.
- The REASON editor (`../packages/reason-editor`) is not embedded; Docs uses LobeHub's Markdown
  renderer with a plain editor. The D1 `documents` table and API are shared, so the REASON UI can
  be mounted on the same data later.
