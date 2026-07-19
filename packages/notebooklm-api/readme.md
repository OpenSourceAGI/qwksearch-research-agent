# notebooklm-api

NotebookLM API powered by Cloudflare Containers. The Python sandbox runs on demand and sleeps after 5 minutes of inactivity to conserve costs.

## Architecture

```
Request → Worker (auth + routing) → Container (notebooklm-py) → Response
                                         ↕
                                    sleeps when idle
```

- **Worker** validates auth and routes requests to the container
- **Container** runs `notebooklm-py` CLI in a Python 3.12 sandbox
- Container auto-sleeps after `sleepAfter` (5m) — billing stops until next request
- Container wakes transparently on next incoming request

## API

All endpoints require `Authorization: Bearer <API_TOKEN>` header.

### POST /

```json
{ "action": "list" }
```

```json
{ "action": "create", "title": "My Notebook", "sourceUrls": ["https://..."] }
```

```json
{ "action": "ask", "notebookId": "abc123", "prompt": "Summarize the key points" }
```

```json
{ "action": "summarize", "sourceUrls": ["https://..."], "prompt": "What are the main findings?" }
```

```json
{ "action": "delete", "notebookId": "abc123" }
```

## Login via Browser Automation

The Worker uses Cloudflare Browser Rendering (Puppeteer) to automate Google login — no manual cookie export needed.

```bash
# First call — enters email + password, triggers 2FA
curl -X POST https://notebooklm-api.<you>.workers.dev \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action": "login"}'

# If 2FA is required — pass the security code
curl -X POST https://notebooklm-api.<you>.workers.dev \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action": "login", "securityCode": "123456"}'
```

Auth cookies are stored in the container's Durable Object storage and injected on container start.

## Setup

1. Set secrets:
   ```bash
   wrangler secret put API_TOKEN
   wrangler secret put GOOGLE_EMAIL
   wrangler secret put GOOGLE_PASSWORD
   ```

2. Deploy:
   ```bash
   cd packages/notebooklm-api
   wrangler deploy
   ```

3. Trigger login:
   ```bash
   curl -X POST https://notebooklm-api.<you>.workers.dev \
     -H "Authorization: Bearer $TOKEN" \
     -d '{"action": "login"}'
   ```

## Development

```bash
bun install
wrangler dev
```

## Cost

- Container only bills while awake (per 10ms granularity)
- `basic` instance: 1/4 vCPU, 1 GiB RAM — ~$0.000005/sec when active
- Idle = $0
- `max_instances = 3` caps concurrent cost
