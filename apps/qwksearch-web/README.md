# `qwksearch-web`

The deployed application: [qwksearch.com](https://qwksearch.com). The chat and
search UI, the public `/api`, the docs site, the D1 schema, and the Worker that
serves all of it.

This is the shell the `packages/*` libraries are mounted into — almost no
behaviour lives here. Search engines, extraction, the editor and the agent
toolkit are all in packages; find the owning package before editing anything
in `app/`.

## What it does

| Area | Route | What you get |
| --- | --- | --- |
| Research chat | `/`, `/c/[id]` | The agent loop from `packages/chat-agent-toolkit`, over 75+ engines via `packages/search-web-api`, rendered by `packages/research-agent-ui`. |
| Document editor | `/workspace` | REASON — `packages/reason-editor` and its sidebar, with optional live collaboration. |
| Library | `/library` | Saved documents, uploads and extractions, backed by D1 and R2. |
| Extraction | `/api/doc`, `/api/scraper` | URL, PDF and YouTube extraction from `packages/extract-*`. |
| Search API | `/api/search` | The dedupe-and-rank pipeline, described by `/api/openapi`. |
| News | `/news` | The trending-news widget, served by `/api/news/trending` so keys stay server-side. |
| Docs | `/docs` | Fumadocs over `packages/user-help-docs`. |
| Accounts | `/login`, `/settings` | better-auth — Google, Discord and LinkedIn OAuth, plus email via Resend. |
| Collaboration | `/api/collaboration/session`, `/api/collaboration/access` | Who is connecting, and what they may do to a document — the two questions the [collaboration server](./collaboration/) asks before a Yjs room syncs. |
| Admin | `/admin` | Gated on `ADMIN_EMAILS`; nobody is an admin when it is unset. |
| Marketing | `/features`, `/enterprise`, `/legal` | Static pages. |

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js App Router, built by [vinext](https://github.com/cloudflare/vinext) (Vite) rather than `next build` |
| Runtime | Cloudflare Workers (`workerd`) |
| Database | Cloudflare D1 via Drizzle ORM, with the [D1 Sessions API](https://developers.cloudflare.com/d1/best-practices/read-replication/) for read replication |
| Storage | R2 (`qwksearch-uploads`) for uploads, KV for caching, Images for transforms |
| Auth | [better-auth](https://better-auth.com) |
| Email | Cloudflare Email Workers (`EMAIL` binding) |
| Tests | Vitest |

## Quick start

From the repository root:

```bash
bun install                      # never npm or yarn
cp apps/qwksearch-web/.env.example apps/qwksearch-web/.env
bun run dev                      # http://localhost:3000
```

`BETTER_AUTH_SECRET` is the only variable worth setting before your first run —
generate one with `openssl rand -base64 32`. Everything else is optional and
disables exactly one feature when missing.

For a local D1 instead of the SQLite fallback:

```bash
cd apps/qwksearch-web
bun run db:migrate:local         # applies drizzle/ to the Miniflare D1
bun run dev:cf                   # vinext build + wrangler dev --local
```

## Environment variables

Local values go in `apps/qwksearch-web/.env`; the annotated template is
[`.env.example`](./.env.example). Deployed values go behind
`wrangler secret put <NAME>` — this app's `wrangler.jsonc` deliberately defines
no `vars`, and sets `keep_vars: true` so that plaintext variables entered in the
Cloudflare dashboard survive each deploy.

### App URLs

| Variable | Enables | Where to get it |
| --- | --- | --- |
| `NEXT_PUBLIC_BASE_URL` | Absolute links, OAuth callbacks, OG images. | Your own origin — `http://localhost:3000` in development. |
| `NEXT_PUBLIC_HOCUSPOCUS_URL` | Live collaborative editing in the workspace. Unset, the editor is single-player. | The URL of your [collaboration server](./collaboration/) — `ws://127.0.0.1:1234` once `bun run collab:dev` is up. |

### Auth

| Variable | Enables | Where to get it |
| --- | --- | --- |
| `BETTER_AUTH_SECRET` | Session signing. Without it nobody stays signed in. | Generate one: `openssl rand -base64 32`. See [better-auth installation](https://www.better-auth.com/docs/installation). |
| `BETTER_AUTH_TRUSTED_ORIGINS` | Extra comma-separated origins allowed to make authenticated requests. The apex domain, its subdomains and `http://localhost:3000` are trusted already. | Your own preview or custom-domain hosts. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | "Sign in with Google". | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → APIs & Services → Credentials → Create Credentials → OAuth client ID. |
| `AUTH_DISCORD_ID` / `AUTH_DISCORD_SECRET` | "Sign in with Discord". | [discord.com/developers/applications](https://discord.com/developers/applications) → your app → OAuth2 → General Information. |
| `AUTH_LINKEDIN_ID` / `AUTH_LINKEDIN_SECRET` | "Sign in with LinkedIn". | [linkedin.com/developers](https://www.linkedin.com/developers/) → your app → Auth. |
| `AUTH_RESEND_KEY` | Verification and magic-link email. | [resend.com/api-keys](https://resend.com/api-keys) |
| `ADMIN_EMAILS` (legacy `ADMIN_EMAIL` is merged in) | `/admin` and the admin API routes, for the comma-separated addresses listed. Unset, nobody has admin access. | Your own addresses. |

### Model and search providers

At least one model provider is needed for the agent to answer.

| Variable | Enables | Where to get it |
| --- | --- | --- |
| `OPENROUTER_API_KEY` | Most models, through one gateway. | [openrouter.ai/keys](https://openrouter.ai/keys) |
| `ANYAPI_API_KEY` | AnyAPI models. Its free plan gives 100,000 tokens/day with no card. | [anyapi.ai/pricing](https://anyapi.ai/pricing) |
| `DEEPSEEK_API_KEY` | DeepSeek models. | [platform.deepseek.com](https://platform.deepseek.com/api_keys) |
| `NVIDIA_API_KEY` | Models on the NVIDIA API catalog. | [build.nvidia.com](https://build.nvidia.com) |
| `OOMOL_API_KEY` | OOMOL models. | Your OOMOL account dashboard. |
| `TAVILY_API_KEY` | Tavily as a search backend. The other engines in `packages/search-web-api` need no key. | [app.tavily.com](https://app.tavily.com/) · [docs](https://docs.tavily.com/documentation/quickstart) |
| `THENEWSAPI_API_KEY` | The homepage trending-news widget. Without it the widget does not render; nothing else changes. | [thenewsapi.com](https://www.thenewsapi.com/) |

### Extraction and storage

| Variable | Enables | Where to get it |
| --- | --- | --- |
| `SCRAPER_URL` / `SCRAPER_API_KEY` | Points extraction at a self-hosted scraper Worker instead of the default. Both optional. | Your own deployment of `packages/render-url-to-html`. |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | Uploads over R2's S3-compatible API, used only when the native `R2` binding is unavailable (that is, outside Workers). On Workers the binding handles it and none of these are needed. | [Cloudflare dashboard](https://dash.cloudflare.com) → R2 → **Manage R2 API Tokens** (Object Read & Write); the account ID is in any zone's sidebar. |
| `R2_UPLOADS_BUCKET` | A bucket other than `qwksearch-uploads`. | The name you created. |
| `DATABASE_URL` | A libSQL/SQLite file outside Workers. Defaults to `file:./data/qwksearch.db`. On Workers the `DB` binding is used instead. | — |

### D1 read replication

| Variable | Enables | Where to get it |
| --- | --- | --- |
| `D1_SESSION_MODE` | Overrides the per-request replication choice: `auto` (default), `primary`, `unconstrained`, or `off` as a rollback switch. It is a plain Worker variable so it can be flipped in the dashboard without a redeploy. | Your own choice — see [`lib/database/d1-session.ts`](./lib/database/d1-session.ts). |
| `D1_SESSION_DEBUG` | Logs the bookmark and replica decision per request. | — |

### Bot gate — Cloudflare Turnstile

Optional. With both keys unset the gate never runs. Set both to challenge a
desktop browser's first HTML page view; phones, crawlers, `/api/*`, assets and
RSC fetches are never challenged.

| Variable | Enables | Where to get it |
| --- | --- | --- |
| `TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | The gate. | [Cloudflare dashboard](https://dash.cloudflare.com) → Turnstile → Add widget (Managed). |
| `TURNSTILE_ENABLED` | `"false"` switches it off while keeping the keys. | — |
| `TURNSTILE_TTL_SECONDS` | How long one pass lasts. Default 604800 (7 days), clamped to 5 minutes – 30 days. | — |
| `TURNSTILE_COOKIE_DOMAIN` | Shares one pass across subdomains, e.g. `.qwksearch.com`. | — |

### Collaboration server

Read by the `bun run collab` process rather than the Worker — see
[`collaboration/`](./collaboration/). Every one of them points at something you
run, so none is fetched from a third party.

| Variable | Default | Enables | Where to get it |
| --- | --- | --- | --- |
| `PORT` | `1234` | The listen port. | Your own choice. |
| `REASON_SQLITE_PATH` | `./data/reason-editor.sqlite` | Where room state is persisted. | A path on a **persistent** volume — a container's ephemeral filesystem loses every document on restart. |
| `QWKSEARCH_API_URL` | — | Wires both endpoints below up at once. | This app's own origin. |
| `REASON_COLLAB_SECRET` | — | Authenticates the server to `/api/collaboration/access`. Set the same value on the Worker. | Generate one: `openssl rand -base64 32`. |
| `REASON_AUTH_URL` | derived | Overrides the session endpoint, to verify tokens elsewhere. Called as `GET <url>` with `Authorization: Bearer <token>`; returns `{ id, name }`, or a non-2xx to refuse. | An endpoint on your own deployment. |
| `REASON_DOCUMENT_ACL_URL` | derived | Overrides the document ACL endpoint. Called as `GET <url>?documentId=…&userId=…`; returns `{ role: "read" \| "write" }`, or a non-2xx to deny. | The same — an endpoint next to your document store. |

**`QWKSEARCH_API_URL` (or `REASON_AUTH_URL`) is required when
`NODE_ENV=production`.** Unset, the server runs in demo mode, where the token
*is* the user id — anyone can claim any identity. Rather than carry that into
production it throws on startup. `/api/collaboration/access` refuses to answer
in production until `REASON_COLLAB_SECRET` is set, so it never becomes an open
"who can read what" oracle.

## Scripts

Run from the repository root so Turborepo builds the workspace packages first,
or from this directory with `bun run <script>`.

| Script | What it does |
| --- | --- |
| `dev` | `next dev` on port 3000, opening a browser when ready. |
| `build` | `vinext build` → `dist/client` + the Worker bundle. `prebuild` builds the workspace packages first. |
| `dev:cf` | Builds, then `wrangler dev --local` — the real Worker with local bindings. |
| `deploy` / `deploy:staging` | `vinext deploy`, optionally against the `staging` environment. |
| `db:generate` | Generates a Drizzle migration into `drizzle/`. |
| `db:migrate` / `db:migrate:local` / `db:migrate:status` | Applies or lists migrations with Wrangler. |
| `db:studio` | Drizzle Studio. |
| `collab` / `collab:dev` | The Hocuspocus collaboration server on port 1234, the second with `--watch`. |
| `test` / `test:coverage` | Vitest. |

## Deploying

Target: Cloudflare Workers. Once, per account:

```bash
bunx wrangler login
bunx wrangler d1 create qwksearch-new         # paste the id into wrangler.jsonc
bunx wrangler r2 bucket create qwksearch-uploads
bunx wrangler kv namespace create KV          # paste the id into wrangler.jsonc
bun run db:migrate                            # apply drizzle/ to the remote D1
```

Then the secrets — only `BETTER_AUTH_SECRET` is needed for a usable deploy:

```bash
for NAME in BETTER_AUTH_SECRET GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET \
            AUTH_RESEND_KEY OPENROUTER_API_KEY TAVILY_API_KEY; do
  bunx wrangler secret put "$NAME"
done
```

Also enable [Email Routing](https://developers.cloudflare.com/email-routing/)
on the zone and verify the `send_email` destination in
[`wrangler.jsonc`](./wrangler.jsonc), or outbound mail fails.

Ship it:

```bash
bun run build
bun run deploy                 # or deploy:staging for the staging environment
```

Two constraints worth knowing before a deploy fails on you:

- **`upload_source_maps` is off on purpose.** The unminified rsc/ssr bundles
  produced ~15.4 MB of maps, over Cloudflare's 15 MB gzipped cap, and the
  deploy was rejected with API error 10021.
- **`keep_vars: true` is load-bearing.** This config defines no `vars`, so
  without it every deploy would delete the plaintext variables set in the
  dashboard. Secrets survive either way.

### The collaboration server

It is not part of the Worker deploy. `bun run collab` is a long-lived Bun
process, so run it anywhere that gives you one (a VM, a container host, Fly,
Railway, Render) — there is no Dockerfile or host config committed here.
Whatever you pick:

1. Set `NODE_ENV=production` and `QWKSEARCH_API_URL`; the process refuses to
   start without a way to verify tokens, by design. Set `REASON_COLLAB_SECRET`
   here and on the Worker, or the ACL endpoint will not answer it.
2. Mount a persistent volume and point `REASON_SQLITE_PATH` at it. SQLite on an
   ephemeral disk means every collaborative document disappears on the next
   deploy.
3. **Terminate TLS and serve `wss://`.** A page on `https://` cannot open a
   `ws://` socket, so a plaintext listener does not merely leak — it does not
   work at all from the deployed app.
4. Make sure your proxy passes WebSocket upgrades through and does not cap idle
   connections at something short; these sockets are meant to stay open.
5. Set `NEXT_PUBLIC_HOCUSPOCUS_URL` on the Worker to the `wss://` origin.

Run one instance. Hocuspocus keeps room state in memory backed by the local
SQLite file, so two instances behind a round-robin load balancer would give the
same document two divergent histories.

## Tests

```bash
bun run test                                  # this app
bunx vitest run app/api/__tests__/some.test.ts
```
