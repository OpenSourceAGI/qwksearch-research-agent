# CLAUDE.md — `apps/qwksearch-web`

The deployed product: Next.js (App Router) via **vinext** on **Cloudflare
Workers**, with D1 (Drizzle), KV, R2 and Better Auth. Full notes in
[`../../.claude/architecture/web-app.md`](../../.claude/architecture/web-app.md).

## Wire up, don't reimplement

Route handlers under `app/api/*` are **thin**: parse, authorize, delegate to a
`packages/*` library, serialize. The UI is not here either —
`packages/research-agent-ui` owns the chat window, result list, reader and
uploads; `packages/reason-editor` owns the writing surface.

If you are writing extraction, ranking, agent or editor logic inside this app,
it belongs in a package.

## Things that bite

- **Bindings changed → regenerate the Cloudflare types** and commit them.
- **Never edit an applied migration.** Change the schema, generate, commit the
  new migration.
- **Tests run under Node — that does not prove the code runs on a Worker.**
  Node APIs outside `nodejs_compat`, filesystem assumptions and long CPU work
  all pass locally and fail in production. See
  [`web-app.md`](../../.claude/architecture/web-app.md).
- **Mount the research workspace through `components/layout/WorkspaceMount`**,
  never by importing `research-agent-ui/workspace` into a route. That entry
  carries the REASON editor's whole dependency tree, and a static import of it
  turns one dependency's module-scope `document` read into a 500 for the entire
  page. The mount loads it lazily inside a Suspense boundary, so the same
  failure costs a flash of skeleton instead.
- **The two builds do not fail the same way.** `bun run dev` is Turbopack;
  `bun run build` is vite/rolldown. An unresolvable
  `new URL("x", import.meta.url)` inside a dependency is a warning to rolldown
  and a fatal `Module not found` to Turbopack, which 500s the whole route that
  imported it — the root layout's `Providers` included, i.e. every page. The
  `turbopack.resolveAlias` entries in `next.config.mjs` exist for exactly that
  (see `lib/onnx/ort-bundle-stub.mjs`). A green `build` is not evidence `dev`
  boots, and vice versa.
- `worker/index.ts` is documented house style for a reason — read its comments
  before changing the entrypoint.
- **The Turnstile gate runs first in `worker/index.ts`** (`lib/turnstile`). It
  only ever interrupts a desktop browser's first HTML page view, and it is a
  no-op until `TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` are set. Adding a
  path that must answer machines — a webhook, a feed, a health check — outside
  `/api/*` means adding it to the exempt list in
  `lib/turnstile/request-filter.ts`.
- The `test-web-api.yml` workflow is path-filtered to this app and two packages;
  a change elsewhere won't run it.

## Commands

```bash
bun run dev        # from the root: turbo dev --filter=qwksearch-web
bun run build
bun run test
```

## Debugging a server-render 500

A render failure on this stack is silent by default. vinext hands React's
`onError` to a renderer that only looks for redirect/not-found digests, and
when the app has no `global-error.tsx` a **shell** error is swallowed into a
built-in error document with `status: 500`. Cloudflare then records the
invocation as a bare `GET https://…/ → 500` — no message, no route, no stack.

Four pieces now make that failure legible. Read them together:

| Piece | Catches |
| --- | --- |
| `instrumentation.ts` → `onRequestError` | every unhandled render error, **unredacted**, with the route that was rendering |
| `app/global-error.tsx` | the shell error itself — its existence is what makes vinext rethrow instead of swallowing |
| `lib/debug/ssr-trace.ts` | `[ssr-trace]` breadcrumbs and `[ssr-error]` failures, on the Worker and in the browser |
| `lib/debug/marks/*` | import-order markers, so a module that throws *while being evaluated* is named |

How to read a trace:

- Join it to Cloudflare's invocation log by `cf-ray`, which `worker:request`
  prints first.
- **Read it by its last line.** A `…:begin` marker with no matching `:end`
  means a module in that import graph threw while being evaluated — the failure
  that 500s the whole route before React has a boundary (see #440, #451).
- A trace that reaches `layout:render:returning-tree` but never `home:page:render`
  puts the failure in the provider stack, not the page. The
  `home:stack:use*` breadcrumbs sit between the context hooks for the same
  reason: the missing one names the hook that threw.
- The `#N` counter restarts per module graph — the RSC and SSR environments
  each hold their own copy of the tracer, so one render prints two `#1`s. Order
  by the `+Nms` stamp, not by the counter.
- `worker:error-body` quotes the first ~1.2KB of any 5xx body, which tells
  vinext's built-in error document apart from this app's `global-error.tsx`.

Breadcrumbs are **on by default** — a trace that has to be enabled first is one
nobody has when it matters. Set the plain Worker Variable `QS_SSR_TRACE=off` in
the dashboard to silence them without a redeploy; `[ssr-error]` lines are never
silenced.
