---
name: ask-html-renderer-api
description: Guide to html-renderer-api (packages/html-renderer-api), the Cloudflare Worker page-rendering service — the /api/render, /api/login and /api/fetch routes, Bearer/query/body authentication against SCRAPER_API_KEY, the BrowserDurableObject browser pool with per-sessionId cookie persistence, Cloudflare-challenge bypass and 2captcha, resource blocking, and the Swagger/OpenAPI surface. Use when a JS-heavy or bot-protected page must be rendered, when the MCP render tool or research-agent-ui's scraper returns 401/404, when scraping content behind a login, or when deploying or configuring the worker.
---

# Working With html-renderer-api

`packages/html-renderer-api` is a **Cloudflare Worker**, not a library: `@cloudflare/puppeteer`
driving Cloudflare Browser Rendering, with a Durable Object holding the browser and the
cookie jar. This is the service behind `render_page_with_javascript` in the MCP server
and behind `SCRAPER_URL` in the app (default deployment
`https://scraper.qwksearch.workers.dev`).

For self-hosted Puppeteer/JSDOM instead, see **ask-render-url-to-html**.

## Routes

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/render` or `/` | GET, POST | Render a page and return HTML or JSON |
| `/api/login` | POST | Drive a login flow and persist the resulting cookies |
| `/api/fetch` | POST | Fetch as a previously logged-in session |
| `/api/swagger`, `/swagger` | GET | Swagger UI |
| `/api/openapi.json` | GET | The spec |

Everything except the docs routes is authenticated **before** it reaches the Durable
Object. The key may arrive as `Authorization: Bearer <key>`, as a `SCRAPER_API_KEY` /
`scraper_api_key` query parameter, or in the POST body; it is compared to the
`SCRAPER_API_KEY` binding. Anything else 404s.

## Calling it

```bash
curl -X POST https://your-worker/api/render \
  -H "Authorization: Bearer $SCRAPER_API_KEY" -H "content-type: application/json" \
  -d '{"url":"https://example.com","format":"json","blockImages":true,
       "waitUntil":"networkidle2","timeout":30000,"sessionId":"default","bypassCaptcha":true}'
```

Query parameters and POST body are merged, so either style works. `format: "json"`
returns `{ url, title, html, loadTime, cookies }`; the default `"html"` returns the
document itself, with `X-Session-Id` on the response.

| Parameter | Default | Meaning |
| --- | --- | --- |
| `url` | — | Required |
| `sessionId` | `"default"` | One Durable Object instance and cookie jar per id |
| `wait` | `0` | Extra milliseconds after load |
| `timeout` | — | Navigation timeout in ms |
| `waitUntil` | — | `domcontentloaded` / `load` / `networkidle0` / `networkidle2` |
| `blockImages` | `false` | Block image requests to save bandwidth |
| `cookies` | — | JSON-serialised cookie array injected before navigation |
| `headers` | `{}` | Extra request headers |
| `format` | `"html"` | `"html"` or `"json"` |
| `bypassCaptcha` | `false` | Attempt Cloudflare-challenge bypass |
| `challengeMatch`, `maxRetries`, `challengeTimeout` | — | Challenge-detection tuning |
| `proxyUrl` / `proxyUser` / `proxyPass` | from env | Per-request proxy override |
| `twoCaptchaKey` | from env | 2captcha for reCAPTCHA / Turnstile |

## Bindings

`SCRAPER_API_KEY` (auth; optional — omit it and the service is open),
`MYBROWSER` (Cloudflare Browser binding), `BROWSER_DO` (Durable Object namespace),
`PROXY_URL` / `PROXY_USER` / `PROXY_PASS`, `TWO_CAPTCHA_KEY`, `CHALLENGE_MATCH`.

## Recipes

**Scrape behind a login.** `POST /api/login` with the credentials and a `sessionId`
(defaults to `"login"`), then `POST /api/fetch` with that same `sessionId`. Cookies are
saved into Durable Object storage after every render and re-loaded on the next one, so
the session survives across requests.

**Browser reuse.** One Durable Object instance per `sessionId` keeps the browser warm.
Reusing an id is much faster than a cold launch; use distinct ids to keep cookie jars
apart.

## Troubleshooting

| Symptom | Cause → fix |
| --- | --- |
| The MCP `render_page_with_javascript` tool refuses to run | `SCRAPER_API_KEY` is unset in the MCP server's environment — it fails fast rather than calling unauthenticated. Set `SCRAPER_API_KEY` (and `SCRAPER_URL` for a self-hosted worker). |
| `401` with a key that looks right | The key must match the `SCRAPER_API_KEY` binding exactly. Auth runs before routing, including on `/api/login` and `/api/fetch`. |
| `404 Not Found` on a URL you expect to work | Only `/`, `/api/render`, `/api/login`, `/api/fetch` and the two docs routes exist; everything else 404s. |
| `bun run start` fails | `package.json`'s `main` and `start` point at `src/scrapers/scraper-cloudflare.**js**`, but the source is `.ts`. This is a Worker — use `wrangler dev` / `wrangler deploy`. |
| `wrangler deploy` cannot find a config | No `wrangler.toml`/`wrangler.jsonc` is committed. Create one that binds `MYBROWSER`, the `BROWSER_DO` namespace to the re-exported `BrowserDurableObject` class, and `SCRAPER_API_KEY`. `readme.md` and `QUICKSTART.md` have the template. |
| A TypeScript build fails on `./scraper-utils.js` | `src/scrapers/scraper-cloudflare.ts` imports it from `./`, but the file lives in `src/utils/`. Fix the specifier to `../utils/scraper-utils.js`. |
| Cookies vanish between requests | You changed `sessionId` (or omitted it, getting `"default"`). Persistence is per session id. |
| Still hitting a Cloudflare challenge | Set `bypassCaptcha: true` and, for reCAPTCHA/Turnstile, a `twoCaptchaKey`; tune `challengeMatch` when the interstitial's markup is unusual. |
| Renders are slow or time out | Set `blockImages: true`, drop `waitUntil` to `domcontentloaded`, and reuse a warm `sessionId`. |
