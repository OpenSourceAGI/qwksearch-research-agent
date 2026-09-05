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
├── wrangler.jsonc             # bindings: DB (D1), KV, R2, EMAIL, HYPERDRIVE, ASSETS
└── scripts/buildWorkerAssets.mts
```

## How it runs on Workers

| Concern | LobeHub default | On Cloudflare (this tree) |
| --- | --- | --- |
| HTTP shell | Next.js route handlers + middleware | One Hono app (`worker/app.ts`) mounting the same handlers: Better Auth, tRPC (lambda/tools/mobile/async), `/webapi/*`, `/api/v1` OpenAPI, agent/workflow/webhook Hono apps, `/f/:id`, SPA shells |
| Database | Postgres via Neon serverless or `pg` | Same Postgres schema. `HYPERDRIVE` binding → `pg` pool, or `DATABASE_URL` (Neon serverless driver works natively on Workers) |
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
- **Extraction chain** (`worker/qwksearch/extract.ts`): Cloudflare Puppeteer scraper
  (`SCRAPER_URL`, 8s deadline) → Tavily (`TAVILY_API_KEY`) → LobeHub's own `@lobechat/web-crawler`
  (fetch + readability). Search-engine result pages and video hosts are rejected up front.
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

# 2. Worker bundle → dist/worker/index.js (single ES module, ~7.4 MB gzipped)
bun run build:worker:server

# or all of the above:
bun run build:worker

# 3. D1 tables (idempotent; safe on the existing qwksearch-new database)
bun run cf:d1:migrate              # remote
bun run cf:d1:migrate:local        # local wrangler dev

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

### Required bindings / secrets

Bindings are declared in `wrangler.jsonc` (identical IDs to `apps/qwksearch-web/wrangler.jsonc` for
KV and D1). Create the Hyperdrive config and paste its id:

```bash
wrangler hyperdrive create qwksearch-lobehub-pg --connection-string="postgres://user:pass@host:5432/lobehub"
```

Secrets (`wrangler secret put …`):

| Secret | Purpose |
| --- | --- |
| `KEY_VAULTS_SECRET` | encrypts stored provider keys (`openssl rand -base64 32`) |
| `AUTH_SECRET` | Better Auth signing secret |
| `DATABASE_URL` | only when not using Hyperdrive (e.g. Neon URL, `DATABASE_DRIVER=neon`) |
| `S3_*` | uploads — point at the `qwksearch-uploads` R2 bucket via its S3 API |
| `TAVILY_API_KEY`, `SCRAPER_API_KEY` | article extraction fallbacks |
| provider keys (`OPENAI_API_KEY`, …) | server-side model providers, same as LobeHub |
| `QSTASH_TOKEN`, `QSTASH_*_SIGNING_KEY` | LobeHub workflows (Upstash QStash) |

Plain vars (`APP_URL`, `DATABASE_DRIVER`, `DISABLE_REDIS`, `EMAIL_SERVICE_PROVIDER`, `SMTP_FROM`,
`SCRAPER_URL`) are in `wrangler.jsonc`; `keep_vars` keeps dashboard-entered vars across deploys. Run
LobeHub's Postgres migrations once against the database: `bun run db:migrate` with `DATABASE_URL` set.

## Tests

```bash
# Worker + Cloudflare adapters + QwkSearch UI (root vitest config)
bunx vitest run worker src/features/QwkSearch src/libs/better-auth/utils/kvSecondaryStorage.test.ts \
  apps/server/src/services/email/impls/cloudflare

# database bridge
cd packages/database && bunx vitest run src/core/cloudflare.test.ts
```

## What changed vs. upstream LobeHub

- `packages/database/src/core/web-server.ts`: Hyperdrive branch (`resolveHyperdriveConnectionString`).
- `src/libs/better-auth/utils/config.ts`: KV-backed `secondaryStorage` (`createKVSecondaryStorage`).
- `apps/server/src/services/email/*`: `cloudflare` provider (Email Routing binding), default on Workers.
- `packages/env/src/email.ts`: accepts `EMAIL_SERVICE_PROVIDER=cloudflare`.
- `packages/business/const/src/branding.ts`, `packages/const/src/url.ts`: QwkSearch branding.
- `packages/locales/src/default/{electron,qwksearch}.ts` + `locales/{en-US,zh-CN}`: new keys.
- `src/routes/(main)/_layout/index.tsx`: mounts the article panel; `src/spa/router/desktopRouter.shared.tsx`
  and `src/features/NavPanel/routeKey.ts`: `/docs` route + nav key.
- `packages/file-loaders`, `packages/eval-dataset-parser`: `xlsx` pinned to the npm registry build
  (the SheetJS CDN tarball is not reachable from the build environment).
- `package.json`: `build:worker*`, `cf:*` scripts; `wrangler`/`@cloudflare/workers-types` dev deps;
  `worker/cf/globals.ts` registered in `sideEffects`.

Everything under `worker/` and `src/features/QwkSearch/` is new.

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
