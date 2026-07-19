# Tardigrade Web Scraper

A Dockerized HTTP proxy that renders pages through headless Chromium (Puppeteer) to bypass Cloudflare and other bot-detection systems. Acts as a drop-in replacement for `curl` or `fetch` — any request you send to it gets forwarded through a real browser and the rendered HTML is returned.

## Architecture

| Service | Image | Purpose |
|---------|-------|---------|
| `scraper` | Built from `Dockerfile` (Bun + Alpine + Chromium) | Puppeteer HTTP proxy on port 3000 |
| `caddy` | `lucaslorentz/caddy-docker-proxy` | TLS termination and reverse proxy routing via Docker labels |
| `searxng` *(optional, commented out)* | `searxng/searxng` | Self-hosted metasearch engine on port 8080 |
| `scrapoxy` *(optional, commented out)* | `fabienvauchelles/scrapoxy` | IP-rotating proxy admin on ports 8888/8890 |

Caddy uses the `caddy` Docker network and reads routing config from container labels — no static Caddyfile needed.

## Setup

```sh
# Create the shared Docker network (once, before first run)
sudo docker network create caddy

# Build and start all services
sudo docker compose up -d --renew-anon-volumes --build
```

## Usage

Send any URL as a query parameter:

```
GET http://localhost:3000/?url=https://example.com
```

The scraper opens the URL in a headless Chromium tab, waits for the DOM to load, resolves Cloudflare challenges automatically (up to 10 retries), and returns the full rendered HTML with a `<base>` tag injected so relative paths resolve correctly.

Optional query params:
- `?wait=1` — adds an extra 5-second delay after load (useful for JS-heavy pages)

POST requests are also proxied — the raw body is forwarded to the target URL.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Listening port |
| `ADDRESS` | `::` | Bind address |
| `DOMAIN` | `localhost` | Domain used by Caddy labels (e.g. `proxy.yourdomain.com`) |
| `PROXY_URL` | — | Upstream proxy to route Chromium traffic through (e.g. `http://proxy:8888`) |
| `PROXY_USER` | — | Proxy username for authenticated proxies |
| `PROXY_PASS` | — | Proxy password |
| `CHALLENGE_MATCH` | `challenge-platform` | String to detect in response body that triggers challenge-retry loop |

## Common Commands

```sh
# View live logs
sudo docker compose logs -f --tail=1000 scraper

# Stop all containers
sudo docker stop $(sudo docker ps -q)

# Restart with fresh volumes and rebuilt image
sudo docker compose up -d --renew-anon-volumes --build
```

## Stack

- **Runtime**: [Bun](https://bun.sh) on Alpine Linux
- **Browser**: Chromium (system package, no bundled download)
- **Scraping**: [puppeteer-extra](https://github.com/berstend/puppeteer-extra) with [stealth plugin](https://github.com/berstend/puppeteer-extra/tree/master/packages/puppeteer-extra-plugin-stealth)
- **HTTP server**: [Koa](https://koajs.com)
- **Proxy router**: [Caddy Docker Proxy](https://github.com/lucaslorentz/caddy-docker-proxy)
