# `test-reports`

Infrastructure only. A Cloudflare Worker whose entire job is to serve the
Vitest HTML report at a URL, so a failing suite can be read in a browser
instead of in CI log scrollback.

**There is no product code here and nothing to test.** If you are here because
a test is failing, the failure belongs to the package that owns the test.
Changing this Worker changes where the report is *served*, never what it says.

## What it does

`wrangler.jsonc` declares no `main` — it is a static-assets Worker. Everything
in `./dist` is served, with `not_found_handling: "single-page-application"` so
the report's client-side routes resolve.

`dist/` is generated, never committed: the `generate` script runs the repo's
Vitest suite from the root with `VITEST_HTML_REPORT_DIR` pointed here.

## Setup

```bash
bun install                  # from the repo root
cd apps/test-reports

bun run generate             # run the suite, write dist/
bun run generate:coverage    # the same, with coverage
bun run preview              # wrangler dev — serve dist/ locally
```

## Environment variables

**The Worker itself reads none** — it serves static files and runs no code of
its own. `keep_vars: true` is set only so that a `wrangler deploy` does not
delete variables someone added in the Cloudflare dashboard.

Deploying needs two credentials, and they belong in your shell or in CI
secrets, never in `wrangler.jsonc`:

| Variable | Enables | Where to get it |
| --- | --- | --- |
| `CLOUDFLARE_API_TOKEN` | `wrangler deploy` without an interactive login. Needs the **Workers Scripts: Edit** permission. | [Cloudflare → My Profile → API Tokens](https://dash.cloudflare.com/profile/api-tokens) → Create Token → *Edit Cloudflare Workers*. |
| `CLOUDFLARE_ACCOUNT_ID` | Which account to deploy into. | [Cloudflare dashboard](https://dash.cloudflare.com) → any zone → Account ID in the right-hand sidebar, or `bunx wrangler whoami`. |

Locally you can skip both and use `bunx wrangler login` instead.

## Deploying

```bash
bun run deploy               # wrangler deploy
```

In practice you do not run this by hand. `.github/workflows/deploy-test-reports.yml`
does it on every push to `master` (and on `workflow_dispatch`), reading
`CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` from repository secrets — set
them under **Settings → Secrets and variables → Actions**.

Two things in that workflow are deliberate and worth keeping:

- The test step uses `continue-on-error`, so a **red suite still publishes its
  report**. That is the point of the app.
- A placeholder `dist/index.html` is written when Vitest produced no report.
  `wrangler deploy` treats a missing `assets.directory` as a hard error, so
  without it the run would end on a config failure instead of on the test
  signal.
