<!-- template-git-repo:badges:start -->
<p align="center">
    <a href="https://qwksearch.com/api/docs"><img src="https://img.shields.io/badge/Docs-blue?logo=ReadTheDocs&logoColor=white" alt="Documentation" /></a>
    <a href="https://stackblitz.com/github/OpenSourceAGI/qwksearch-research-agent/tree/master/packages/notebooklm-api-client"><img height="20px" src="https://developer.stackblitz.com/img/open_in_stackblitz.svg" alt="Open in StackBlitz" /></a>
    <br />
    <a href="https://www.npmjs.com/package/notebooklm-api-client"><img src="https://img.shields.io/npm/dm/notebooklm-api-client.svg" alt="NPM Monthly Downloads" /></a>
    <a href="https://www.npmjs.com/package/notebooklm-api-client"><img src="https://img.shields.io/npm/v/notebooklm-api-client.svg" alt="npm version" /></a>
    <a href="https://www.npmjs.com/package/notebooklm-api-client"><img src="https://img.shields.io/npm/dt/notebooklm-api-client.svg" alt="NPM Total Downloads" /></a>
    <a href="https://www.npmjs.com/package/notebooklm-api-client"><img src="https://img.shields.io/npm/types/notebooklm-api-client" alt="TypeScript types" /></a>
    <a href="https://packagephobia.com/result?p=notebooklm-api-client"><img src="https://packagephobia.com/badge?p=notebooklm-api-client" alt="Install size" /></a>
    <br />
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/stargazers"><img src="https://img.shields.io/github/stars/OpenSourceAGI/qwksearch-research-agent" alt="GitHub Stars" /></a>
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/issues"><img src="https://img.shields.io/github/issues/OpenSourceAGI/qwksearch-research-agent?logo=github" alt="GitHub Issues" /></a>
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/pulls"><img src="https://img.shields.io/github/issues-pr/OpenSourceAGI/qwksearch-research-agent?logo=github&label=PRs" alt="Open Pull Requests" /></a>
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/pulls?q=is%3Apr+is%3Aclosed"><img src="https://img.shields.io/github/issues-pr-closed/OpenSourceAGI/qwksearch-research-agent?logo=github&label=PRs%20merged&color=8957e5" alt="Merged Pull Requests" /></a>
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/discussions"><img src="https://img.shields.io/github/discussions/OpenSourceAGI/qwksearch-research-agent" alt="GitHub Discussions" /></a>
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/commits/master/"><img src="https://img.shields.io/github/last-commit/OpenSourceAGI/qwksearch-research-agent.svg" alt="GitHub last commit" /></a>
    <br />
    <img src="https://img.shields.io/badge/Bun-14151A?logo=bun&logoColor=white" alt="Bun" /> <img src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white" alt="TypeScript" /> <img src="https://img.shields.io/badge/Cloudflare%20Workers-F38020?logo=cloudflareworkers&logoColor=white" alt="Cloudflare Workers" /> <img src="https://img.shields.io/badge/Vitest-6E9F18?logo=vitest&logoColor=white" alt="Vitest" />
</p>
<!-- template-git-repo:badges:end -->

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
