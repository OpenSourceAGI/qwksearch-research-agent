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
- `worker/index.ts` is documented house style for a reason — read its comments
  before changing the entrypoint.
- The `test-web-api.yml` workflow is path-filtered to this app and two packages;
  a change elsewhere won't run it.

## Commands

```bash
bun run dev        # from the root: turbo dev --filter=qwksearch-web
bun run build
bun run test
```
