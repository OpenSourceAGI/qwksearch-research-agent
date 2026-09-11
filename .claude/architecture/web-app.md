# `apps/qwksearch-web` — The Deployed Product

Next.js (App Router) compiled by **vinext** and deployed to a **Cloudflare
Worker**. This is the only app most changes reach production through, and the
Workers runtime is the source of most of its surprises.

## Layout

```
app/                Next.js App Router
  api/              route handlers — thin wrappers over packages/*
    agent/ auth/ search/ scraper/ doc/ docs/ speech/ news/
    notebooklm/ geolocation/ openapi/ admin/ config/ user/
  docs/             the help site (see documentation.md)
  admin/ c/ enterprise/ features/ legal/ library/ login/
  news/ settings/ workspace/
lib/                the app's own logic
  auth/             Better Auth setup, session helpers, admin gate
  database/         Drizzle schema, D1 session wrapper, Turso client
  cloudflare/ chat/ scraper/ storage/ uploads/ integrations/
  mcp-servers/ rate-limit/ news/ notebooklm/ config/ hooks/ utils/
drizzle/            D1 SQL migrations
worker/index.ts     Cloudflare Worker entry
wrangler.jsonc      bindings and deploy config
```

Route handlers should stay thin. If you are writing extraction, search or
generation logic inside `app/api/`, it belongs in a package instead.

## Bindings

| Binding | What |
| --- | --- |
| `DB` | D1, database `qwksearch-new`, migrations in `drizzle/` |
| `KV` | Cloudflare KV |
| `R2` | bucket `qwksearch-uploads` |
| `IMAGES` | Cloudflare Images, used by the Worker's image optimizer |
| `EMAIL` | Email Routing, sends as `noreply@qwksearch.com` |
| `ASSETS` | static client bundle, `dist/client` |

A `production` env overrides `KV` (different namespace) and re-declares `DB` and
`IMAGES`. Bindings are **not** inherited into a named env — anything the
production Worker needs has to appear there too.

## D1 read replication

The primary lives in WNAM; replicas answer nearby reads. A replica can lag, so
every request that touches D1 runs inside a **D1 session** carrying a bookmark:

1. `worker/index.ts` opens the scope with `runWithD1Session`, seeded from the
   bookmark the client returned last time.
2. `sessionedD1()` wraps the raw binding so every Drizzle statement joins that
   session.
3. `applyD1Bookmark` writes the closing bookmark back onto the response.

Outside a session scope (prerender, scripts, unit tests) the wrapper is a
pass-through. Auth paths opt out of replica reads entirely
(`PRIMARY_ONLY_PATH_PREFIXES` in `lib/database/d1-session.ts`). Tunable at runtime
with the `D1_SESSION_MODE` variable (`auto` | `primary` | `unconstrained` | `off`)
and `D1_SESSION_DEBUG`. Background:
[user-help-docs → Architecture → D1 Read Replication](../../packages/user-help-docs/content/docs/architecture/d1-read-replication.mdx).

## Auth

**Better Auth** over the Drizzle/D1 adapter, with the `oneTap`, `openAPI`,
`magicLink` and `anonymous` plugins, plus VPN/location detection on sign-in.
Trusted origins are compared as bare origins — a trailing slash or a path in a
configured origin silently never matches.

## Commands

```bash
bun run dev                # next dev
bun run build              # vinext build (prebuild rebuilds sibling packages)
bun run deploy             # vinext deploy
bun run dev:cf             # build, then wrangler dev --local

bun run db:generate        # drizzle-kit generate — new migration from schema
bun run db:migrate         # apply to remote D1
bun run db:migrate:local   # apply to the local D1
bun run db:migrate:status
bun run db:studio
```

Schema changes are: edit `lib/database/schema.ts` → `db:generate` → commit the
generated SQL in `drizzle/` → `db:migrate`. Never hand-edit an applied migration.

## Workers-runtime rules

These are not style preferences; each one has already broken production here.

- **No filesystem.** No `fs`, no `import.meta.url` path resolution at module
  scope. Resolving one anyway threw `TypeError: The "path" argument must be of
  type string or an instance of URL. Received undefined` and took down every
  route bundled into the same chunk. Inline content at build time instead.
- **No runtime code generation.** `new Function` / `new AsyncFunction` throws
  `EvalError: Code generation from strings disallowed for this context`. Anything
  that compiles at request time has to move into the bundler.
- **`keep_vars: true` is load-bearing.** This config declares no `vars`, so
  without it every `wrangler deploy` would delete the plaintext Variables set in
  the dashboard. It is a top-level-only key — Wrangler ignores it inside a named
  env. See
  [user-help-docs → Architecture → Cloudflare Worker Variables](../../packages/user-help-docs/content/docs/architecture/cloudflare-env-vars.mdx).
- **Source maps stay off** (`upload_source_maps: false`). The unminified rsc/ssr
  bundles produced ~15.4MB of maps against a 15MB cap and the deploy was rejected
  with API error 10021.
- Tests run under Node and will happily pass code that cannot run on Workers.
  A green suite is not evidence the Worker boots.
