<p align="center">
<br /> 
    <a href="https://www.npmjs.com/package/notebooklm-api-client"><img src="https://img.shields.io/npm/dm/notebooklm-api-client.svg" alt="NPM Monthly Downloads"></a>
    <a href="https://www.npmjs.com/package/notebooklm-api-client"><img src="https://img.shields.io/npm/v/notebooklm-api-client.svg" alt="npm version"></a>
    <a href="https://bundlephobia.com/package/notebooklm-api-client"><img src="https://img.shields.io/bundlephobia/minzip/notebooklm-api-client" alt="Size"></a>
    <a href="https://discord.gg/SJdBqBz3tV">
        <img src="https://img.shields.io/discord/1110227955554209923.svg?label=Chat&logo=Discord&colorB=7289da&style=flat"
            alt="Join Discord" />
    </a>  
     <a href="https://github.com/vtempest/qwksearch-research-agent/discussions">
     <img alt="GitHub Stars" src="https://img.shields.io/github/stars/vtempest/qwksearch-research-agent" /></a>
<br />
    <a href="https://github.com/vtempest/qwksearch-research-agent/discussions">
    <img alt="GitHub Discussions"
        src="https://img.shields.io/github/discussions/vtempest/qwksearch-research-agent" />
    </a>
    <a href="https://github.com/vtempest/qwksearch-research-agent/pulse" alt="Activity">
        <img src="https://img.shields.io/github/commit-activity/m/vtempest/qwksearch-research-agent" />
    </a>
    <img src="https://img.shields.io/github/last-commit/vtempest/qwksearch-research-agent.svg" alt="GitHub last commit" />
<br />
    <a href="https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request">
        <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg"
            alt="PRs Welcome" />
    </a>
    <a href="https://codespaces.new/vtempest/qwksearch-research-agent">
    <img src="https://github.com/codespaces/badge.svg" width="150" height="20" />
    </a>
</p>

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
