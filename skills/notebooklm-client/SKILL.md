---
name: ask-notebooklm-client
description: Guide to notebooklm-api-client (packages/notebooklm-api-client), the Cloudflare Worker + Container bridge to Google NotebookLM — the single POST endpoint and its `action` verbs (login, list, create, ask, summarize, delete), the Puppeteer-driven Google sign-in that captures cookies and localStorage, the NotebookRunner container that sleeps after 5 minutes, and the API_TOKEN / GOOGLE_EMAIL / GOOGLE_PASSWORD bindings. Use when wiring NotebookLM into the app, when a notebook action 401s or times out, when the stored auth expires, or when deploying the container.
---

# Working With notebooklm-api-client

`packages/notebooklm-api-client` is a **Cloudflare Worker plus a Container**, not a
client library — the npm name is misleading, and `packages/readme.md`'s "placeholder"
line is stale. Shape:

```
POST → Worker (auth + routing) → NotebookRunner container (FastAPI + notebooklm-py) → JSON
                                        ↕ sleeps after 5 minutes idle
```

The Worker also owns a Puppeteer login flow, because NotebookLM has no public API: it
signs into Google in a real browser and hands the resulting cookies to the container.

## Setup

Bindings (`Env` in `src/index.ts`): `NOTEBOOK_RUNNER` (Durable Object namespace for the
`NotebookRunner` container class), `BROWSER` (Cloudflare Browser binding),
`API_TOKEN`, `GOOGLE_EMAIL`, `GOOGLE_PASSWORD`.

```bash
bunx wrangler dev       # needs Docker running locally
bunx wrangler deploy
bunx wrangler types
```

## The API

One route. **POST only** — every other method returns 405, and `OPTIONS` gets CORS
headers. Auth is `Authorization: Bearer <API_TOKEN>`, checked before anything else.

```bash
curl -X POST https://your-worker -H "Authorization: Bearer $API_TOKEN" \
  -H "content-type: application/json" -d '{"action":"ask","notebookId":"…","prompt":"…"}'
```

| `action` | Handled by | Fields |
| --- | --- | --- |
| `login` | The **Worker** (Puppeteer) | `securityCode` for 2FA |
| `list` | Container | — |
| `create` | Container | `title`, `sourceUrls` |
| `ask` | Container | `notebookId`, `prompt` |
| `summarize` | Container | `notebookId` |
| `delete` | Container | `notebookId` |

Non-`login` actions are proxied to `http://container/run` on the Durable Object stub
named `"default"` — so **all traffic shares one container instance and one auth state**.

## Recipes

**Log in.** POST `{"action":"login"}`. The Worker drives the Google sign-in with the
`GOOGLE_EMAIL`/`GOOGLE_PASSWORD` bindings, retries with `securityCode` when 2FA
prompts, then extracts cookies **and** localStorage and POSTs them to the container's
`/store-auth`. The container writes them to `/app/.auth.json` and exports
`NOTEBOOKLM_AUTH_JSON` for `notebooklm-py`. Re-run `login` whenever the session expires.

**The container.** `Dockerfile` is `python:3.12-slim` + `notebooklm-py fastapi uvicorn`,
serving `container/server.py` on `:8080` (`/health`, `/store-auth`, `/run`). Each
container action shells out to the `notebooklm-py` CLI. `NotebookRunner` sets
`defaultPort = 8080`, `sleepAfter = "5m"` and starts with `enableInternet: true`.

## Troubleshooting

| Symptom | Cause → fix |
| --- | --- |
| `401 Unauthorized` | The header must be exactly `Bearer <API_TOKEN>`; it is compared by string equality. |
| `405 Method not allowed` | Only POST is routed. There is no GET health endpoint on the Worker — `/health` is on the container, behind it. |
| `400 Missing action field` | The body must carry `action`; there are no separate routes per verb. |
| Every action fails with an auth error inside the container | No `login` has run yet, or the captured Google session expired. POST `{"action":"login"}` again. |
| `login` fails at the password step | Google served a different challenge (device confirmation, CAPTCHA). The flow only handles email → password → optional `securityCode`; the selectors in `handleLogin` are the place to look. |
| First request after idle is slow | The container sleeps after 5 minutes and cold-starts. Expected; keep a warm ping if it matters. |
| Concurrent users see each other's notebooks | `idFromName("default")` pins everything to one container and one Google account. Derive the name per user to isolate them. |
| No `wrangler.jsonc` in the repo | It is not committed. Write one binding `NOTEBOOK_RUNNER` to the exported `NotebookRunner` class, plus `BROWSER` and the secrets, before deploying. |
| `wrangler dev` fails to start the container | Cloudflare Containers builds the image locally — Docker must be running. |
| Credentials in plain env | `GOOGLE_PASSWORD` and `API_TOKEN` must be `wrangler secret`s, never committed vars. |
