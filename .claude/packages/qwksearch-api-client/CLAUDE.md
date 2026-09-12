# CLAUDE.md — `qwksearch-api-client`

**Read [`skills/ask-qwksearch-api-client`](../../../skills/ask-qwksearch-api-client/SKILL.md)
first.**

The typed API client, **generated from `openapi-docs.yml`**. Published.

## Do not hand-edit generated files

They are output; the next regeneration silently reverts your change. To change
the client:

1. Change the route in `apps/qwksearch-web/app/api/…`.
2. Update the OpenAPI spec.
3. Regenerate, and commit the result with the same change.

Hand-written helpers go in a separate, clearly non-generated file.

Keeping the spec honest matters beyond this package: `qwksearch-mcp-server`
exposes the same surface.

## Regeneration is two steps — use `codegen`, not `openapi-ts`

`bun run codegen` (and `build:api`) runs:

```
openapi-ts && api2client --rewire-only ./src
```

`openapi-ts` writes Hey API's bundled **fetch** client into
`src/client/client.gen.ts`; the second step replaces just that file with a
re-export of [api2client](https://github.com/OpenSourceAGI/GRAB-URL/tree/master/packages/api2client)'s
client, so every operation sends through [`grab`](https://grab.js.org) and
inherits its caching, retries, rate limiting, dedupe and `grab.mock`. Run
`openapi-ts` alone and you silently ship the fetch client again.

Nothing else about the Hey API contract changes — same functions, same
`{ data, error, request, response }`. Two things do:

- `api2client` and `grab-url` are **external** in `vite.config.ts`. Bundling
  either would give this package a private grab instance, and grab's cache,
  dedupe and mock registry are per-instance — a consumer using grab has to be
  looking at the same one.
- Reading the HTTP status and the parsed error body off a failed call needs
  grab's `onRawResponse` hook, i.e. **grab-url >= 1.6.23**. Below that,
  `result.response` is `undefined` and `result.error` is grab's
  `"HTTP error: <status>"` string. `test/error-result-shape.test.ts` probes
  `grab.supports.onRawResponse` and skips rather than assert against a
  transport that cannot satisfy it.

## The published dist is hand-built

There is no `build` script, so the workspace chain never rebuilds this package
— the committed `dist/` is what consumers get, and `ship` runs `build:api`
before `npm publish` so a stale one cannot go out. `dist/index.d.ts` is the
file consumers' typechecking needs; it only appears when `vite-plugin-dts` gets
`bundleTypes` (its 5.x name for `rollupTypes`) *and* `@microsoft/api-extractor`
is installed. Missing either, it quietly emits per-file types under `dist/src/`
and every consumer falls back to `declare module "qwksearch-api-client"`.
