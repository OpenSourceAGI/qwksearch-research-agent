# Hosting Vitest UI on Cloudflare Workers

This guide explains how to generate a static Vitest HTML test report from all monorepo packages and deploy it to Cloudflare Workers.

## How It Works

1. **Vitest workspace** (`vitest.workspace.ts`) aggregates all packages with tests
2. **`@vitest/ui` HTML reporter** generates a self-contained SPA (Vue app + gzipped test results JSON)
3. **Cloudflare Workers** serves the static assets with SPA fallback routing

The output is a fully interactive dashboard showing test results, durations, module graphs, and optionally code coverage — accessible from any browser without running a local server.

## Quick Start

```bash
# Generate the report
bun run test:report

# Preview locally
cd apps/test-reports && npx wrangler dev

# Deploy to Cloudflare Workers
bun run deploy:test-reports
```

## Commands

| Command | Description |
|---------|-------------|
| `bun run test` | Run all tests (no report) |
| `bun run test:ui` | Open interactive Vitest UI locally (dev mode) |
| `bun run test:report` | Run tests + generate static HTML report |
| `bun run test:report:coverage` | Same as above + V8 coverage report |
| `bun run deploy:test-reports` | Deploy generated report to CF Workers |

## Project Structure

```
├── vitest.workspace.ts          # Workspace aggregating all test packages
├── apps/test-reports/
│   ├── wrangler.jsonc           # CF Workers config (static assets)
│   ├── package.json             # Generate/deploy scripts
│   └── dist/                    # Generated report output (gitignored)
│       ├── index.html           # Vitest UI entry point
│       ├── html.meta.json.gz    # All test results (gzipped JSON)
│       └── ...                  # UI assets (JS, CSS)
```

## Adding a New Package to the Report

1. Ensure the package has a `vitest.config.ts`
2. Add the package path to `vitest.workspace.ts`:
   ```ts
   export default defineWorkspace([
     // ...existing packages
     'packages/your-new-package',
   ])
   ```
3. Run `bun run test:report` to verify it appears in the dashboard

## Deploying to Your Own Cloudflare Account

### Prerequisites

- A Cloudflare account
- `wrangler` CLI authenticated (`npx wrangler login`)

### Manual Deploy

```bash
bun run test:report
bun run deploy:test-reports
```

Wrangler will output the deployed URL (e.g., `https://qwksearch-test-reports.<your-subdomain>.workers.dev`).

### CI/CD Deploy

The `.github/workflows/deploy-test-reports.yml` workflow deploys on every push to `master`. Set these repository secrets:

- `CLOUDFLARE_API_TOKEN` — API token with Workers Scripts:Edit permission
- `CLOUDFLARE_ACCOUNT_ID` — Your Cloudflare account ID

### Custom Domain

Add a route or custom domain in `apps/test-reports/wrangler.jsonc`:

```jsonc
{
  "routes": [
    { "pattern": "tests.yourdomain.com", "zone_name": "yourdomain.com" }
  ]
}
```

## Restricting Access

To make the test dashboard private, add [Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/applications/configure-apps/self-hosted-apps/) in front of the Worker via the Cloudflare dashboard or wrangler config.

## Architecture Notes

- The HTML reporter is provided by `@vitest/ui` — the same package that powers `vitest --ui`
- `--reporter=html` writes a static build of the Vue UI plus `html.meta.json.gz` containing serialized test results
- The `not_found_handling: "single-page-application"` setting in wrangler ensures client-side routing works (all paths resolve to `index.html`)
- Report size is typically under 5MB for the full monorepo — well within Workers free tier (25MB static assets)
- Coverage HTML (when using `--coverage`) is embedded as a subdirectory in the same output

## Troubleshooting

**"Cannot find module @vitest/ui"** — Run `bun install` from the repo root to install workspace devDependencies.

**Empty report** — Ensure `vitest.workspace.ts` lists the correct package paths and each has a valid `vitest.config.ts`.

**404 on sub-routes after deploy** — Verify `not_found_handling` is set to `"single-page-application"` in `wrangler.jsonc`.

**Tests timeout in CI** — Some packages (e.g., `search-web-api`) have network-dependent tests. Use `--project` flag to exclude them: `vitest run --project=chat-agent-toolkit --project=write-language ...`
