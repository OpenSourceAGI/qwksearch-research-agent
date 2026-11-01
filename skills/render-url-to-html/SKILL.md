---
name: ask-render-url-to-html
description: Guide to render-url-to-html (packages/render-url-to-html), the two self-hosted page-rendering services — scraper-puppeteer, a Dockerised Koa proxy running puppeteer-extra with the stealth plugin to get past Cloudflare bot checks, and scraper-jsdom, a JSDOM-based scraper with scripted automation steps and a Next.js demo. Use when extract-webpage's plain fetch gets a bot-check interstitial, when a JS-rendered page comes back empty, when choosing between the JSDOM, Puppeteer and Cloudflare rendering paths, or when running either service in Docker.
---

# Working With render-url-to-html

`packages/render-url-to-html` is a folder of **two independent workspaces**, not one
package (the root `package.json` globs `packages/render-url-to-html/*`). Neither is
published to npm; both are services you run.

| Directory | Package name | What it is |
| --- | --- | --- |
| `scraper-puppeteer/` | `tardigrade-html-renderer` | Koa HTTP proxy over puppeteer-extra + stealth, in Docker |
| `scraper-jsdom/` | `jsdom-scraper` | A `JSDomScraper` class plus a Next.js demo UI |

For the **Cloudflare Worker** rendering path (Durable Objects, sessions, cookie
persistence, an OpenAPI surface) see **ask-html-renderer-api** instead — that is the
one the MCP server's `render_page_with_javascript` tool calls.

## Choosing a renderer

| Situation | Use |
| --- | --- |
| Static HTML, no JS needed | `extract-webpage`'s `scrapeURL` — no renderer at all |
| Page needs scripts but no evasion, and you want a library call | `scraper-jsdom` |
| Cloudflare/bot interstitial, real Chromium required | `scraper-puppeteer` |
| Same, but serverless and session-aware | `html-renderer-api` |

## scraper-puppeteer

A transparent proxy: send `http://localhost:3000/?url=https://example.org` and get the
rendered response back, with hop-by-hop request/response headers stripped
(`host`, `user-agent`, `accept-encoding`, `x-forwarded-*`, `set-cookie`, …).

```bash
docker network create caddy        # the compose file joins an *external* network
cd packages/render-url-to-html/scraper-puppeteer && docker compose up -d --build
```

`compose.yml` runs the scraper on `:3000` behind a caddy-docker-proxy container; the
SearXNG and Scrapoxy services in the file are commented out.

- `puppeteer-extra-plugin-stealth` is enabled; the adblocker plugin is present as a
  dependency but commented out in the source.
- Chromium is expected at `/usr/bin/chromium-browser` (the Docker image's path) —
  the executable path is set unconditionally, which is why running it bare on a host
  without that binary fails.
- `PROXY_URL` in the environment appends `--proxy-server=` for residential-IP rotation.
- Swagger deps (`swagger-jsdoc`, `swagger-ui-koa`) are present for the docs route.

## scraper-jsdom

```ts
import { JSDomScraper } from "jsdom-scraper";

const scraper = new JSDomScraper({ timeout: 30000, headers: { /* … */ } });
const result = await scraper.scrape(url, {
  automation: [{ action: "click", selector: "#more" }, { action: "waitFor", selector: ".body" }],
  customScript: "return document.querySelectorAll('p').length",
});
// { url, title, metaDescription, html, textContent, links: [{ text, href }], scriptResult? }
```

JSDOM runs with scripts and external resources enabled. `automation` steps are
`click` / `type` / `waitFor` against selectors; `customScript` runs last and its return
value lands in `scriptResult`. Default UA is a desktop Chrome string, default timeout
30 s. `bun run dev` starts the Next.js demo in `demo/`.

## Troubleshooting

| Symptom | Cause → fix |
| --- | --- |
| `bun run start` in `scraper-puppeteer` fails immediately | The script is `bun crawler.js`, but the file is `scraper-puppeteer.js` — the script name is stale. Run the file directly, or use Docker (`compose.yml` / `Dockerfile`), which is the supported path. |
| Chromium not found outside Docker | `options.executablePath = "/usr/bin/chromium-browser"` is set unconditionally. Install Chromium at that path, edit it, or run the container. |
| Still bot-blocked with stealth on | Stealth defeats fingerprinting, not IP reputation. Add a residential proxy via `PROXY_URL` (Scrapoxy et al. are what the source's own notes recommend). |
| JSDOM returns an empty body on a React/Vue page | JSDOM executes scripts but is not a browser — no layout, no real timers-driven rendering, patchy web APIs. Escalate to Puppeteer or `html-renderer-api`. |
| A `waitFor` step never resolves | The element is produced by an API call JSDOM could not make. Raise `timeout`, or use a real browser. |
| `docker compose up` fails on a missing network | The compose file declares `caddy` as `external`. Run `docker network create caddy` first. |
| Neither package resolves as a dependency | Both are private workspaces with no `main`/`exports` for publishing. Import from source, or run them as services. |
| `bun install` at the root seems to skip them | They match the `packages/render-url-to-html/*` workspace glob specifically, not `packages/*`. Keep that glob if you move things. |
| The `scraper-jsdom` dependency list looks enormous | Most of it belongs to the shadcn-based `demo/` Next.js app; the scraper itself only needs `jsdom`. |
