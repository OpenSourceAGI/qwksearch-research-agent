---
name: ask-searxng-search
description: Guide to searxng-search-cloudflare (packages/searxng-search-cloudflare), the deployment config for a private SearXNG metasearch instance — the two Dockerfiles, searxng-settings.yml (JSON output format, limiter, secret key, Redis/valkey), the per-engine shortcut list in searxng-engines.yml, and how chat-agent-toolkit's searchSearxng consumes it. Use when standing up or tuning a private SearXNG backend, when SearXNG returns 403 or HTML instead of JSON, when enabling or disabling an engine, or when agent search is configured to a SearXNG URL.
---

# Working With searxng-search-cloudflare

`packages/searxng-search-cloudflare` has no code — it is the Docker image and settings
for a private [SearXNG](https://docs.searxng.org) instance. SearXNG aggregates many
engines without tracking, and this repo uses it as the retrieval backend behind
`chat-agent-toolkit`'s injected `searchSearxng` function (`getSearxngURL()` supplies
the instance URL).

Despite the name, the README walks through **Render.com**; nothing here is
Cloudflare-specific.

| File | Purpose |
| --- | --- |
| `Dockerfile` | Dev image: `searxng/searxng:latest` + your settings, `SEARXNG_DEBUG=1`, 1 worker / 1 thread |
| `Dockerfile.redis` | The Redis/valkey-backed variant for a real deployment |
| `searxng-settings.yml` | The instance settings — this is the file you edit |
| `searxng-engines.yml` | The engine catalogue with per-engine `shortcut` and `disabled` flags |
| `readme.md` | Render.com deployment walkthrough |

## The settings that matter

```yaml
use_default_settings: true
search:
  formats: [html, json]        # ← "json" is mandatory for programmatic use
server:
  secret_key: "…"              # openssl rand -hex 16
  limiter: false               # fine for a private instance; true for a public one
  image_proxy: true
ui:
  static_use_hash: true
# redis:
#   url: redis://valkey:6379/0
```

`formats` is the one non-obvious requirement: stock SearXNG serves HTML only, and a
`format=json` request against a default instance returns **403**, not JSON.

## Recipes

**Run it locally.**

```bash
cd packages/searxng-search-cloudflare
docker build -t searxng-private .
docker run -p 8080:8080 -e SEARXNG_BASE_URL=http://localhost:8080 searxng-private
curl "http://localhost:8080/search?q=test&format=json"
```

**Point the agent at it.** `chat-agent-toolkit`'s `getSearxngURL()` reads the configured
instance URL; the `activeEngines` on a `MetaSearchAgent` are **SearXNG engine names**
(spaces, e.g. `"google scholar"`), which is why they differ from `search-web-api`'s
underscore-separated `ALL_ENGINES` keys.

**Enable an engine.** Flip `disabled: false` on its entry in the settings/engines YAML
and rebuild the image — the settings file is baked in with `COPY` at build time, so a
running container will not pick up an edit.

**Scale up.** The dev `Dockerfile` pins `UWSGI_WORKERS=1` / `UWSGI_THREADS=1`. For real
traffic raise both (the README's production snippet uses 2/2 or 4/4) and enable Redis
via `Dockerfile.redis` and the `redis:` block.

## Troubleshooting

| Symptom | Cause → fix |
| --- | --- |
| `403` on `?format=json` | `json` is missing from `search.formats`. It is present in this repo's settings — check you actually deployed *this* settings file. |
| Settings edits have no effect | `COPY searxng-settings.yml /etc/searxng/settings.yml` happens at build time. Rebuild, or bind-mount the file instead. |
| A permission error on `/etc/searxng/settings.yml` | The image runs as the `searxng` user. `Dockerfile` does the `chown`; a hand-written one may not. |
| Rate limiting blocks your own agent | `limiter: false` is the private-instance setting. If you set it `true`, whitelist your caller or expect 429s. |
| An engine consistently returns nothing | Upstream blocked the instance's IP, or the engine is `disabled: true`. Check the SearXNG stats page; engines fail independently. |
| The committed `secret_key` | The one in `searxng-settings.yml` is a placeholder. Generate your own (`openssl rand -hex 16`) before exposing an instance. |
| High latency under load | Single worker/thread in the dev image, no cache. Raise `UWSGI_WORKERS`/`UWSGI_THREADS` and add Redis/valkey. |
| Wrong absolute URLs in results | `SEARXNG_BASE_URL` still points at `localhost`. Set it to the deployed origin. |
