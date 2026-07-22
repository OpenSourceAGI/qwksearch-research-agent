# Cloudflare Workers Integration

research-agent-ui now supports deployment to Cloudflare Workers as an OpenConnector-compatible runtime.

## What's New

The `packages/research-agent-ui/` package includes full Cloudflare Workers deployment support:

- **HTTP Worker** — Serves API endpoints for connections, OAuth, run logs, and transit file management
- **D1 Database** — Persistent storage for user connections, OAuth state, and execution history
- **R2 or Workers KV** — Transit file storage (configurable backend)
- **Static Assets** — Web Console UI served from Cloudflare
- **Scheduled Cleanup** — Automated expiration of temporary records

## Files Added

### Core Deployment Files
- `packages/research-agent-ui/wrangler.example.jsonc` — Configuration template
- `packages/research-agent-ui/migrations/0001_init_schema.sql` — D1 database schema
- `packages/research-agent-ui/src/cloudflare/worker.ts` — Worker HTTP handler
- `packages/research-agent-ui/src/cloudflare/env.d.ts` — TypeScript types

### Documentation
- `packages/research-agent-ui/CLOUDFLARE_QUICKSTART.md` — 5-minute quick start
- `packages/research-agent-ui/CLOUDFLARE_DEPLOYMENT.md` — Complete setup guide
- `packages/research-agent-ui/.env.example` — Local secrets template
- `packages/research-agent-ui/.gitignore` — Excludes sensitive files

### Scripts (package.json)
- `npm run build:cloudflare` — Compile Worker TypeScript to dist/
- `npm run dev:cloudflare` — Start local preview with wrangler dev
- `npm run deploy:cloudflare` — Deploy to Cloudflare Workers

## Quick Start

Navigate to the research-agent-ui package:

```bash
cd packages/research-agent-ui
```

Follow the 10-minute setup in `CLOUDFLARE_QUICKSTART.md`:

```bash
cp wrangler.example.jsonc wrangler.local.jsonc
wrangler login
wrangler d1 create research-agent-ui --config wrangler.local.jsonc
wrangler r2 bucket create research-agent-ui-transit-files --config wrangler.local.jsonc
# Update wrangler.local.jsonc with returned IDs
npx wrangler d1 migrations apply research-agent-ui --local --config wrangler.local.jsonc
npm run dev:cloudflare
```

Visit `http://localhost:8787/health` to verify.

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Health check |
| `/api/v1/metadata` | GET | Runtime capabilities |
| `/api/v1/connections` | GET/POST/DELETE | Connection management |
| `/api/v1/oauth/authorize` | POST | Start OAuth flow |
| `/api/v1/oauth/callback` | POST | Handle OAuth callback |
| `/api/v1/run-logs` | GET/POST | Execution logs |
| `/api/v1/transit-files` | POST/GET/DELETE | File storage |

All admin endpoints require `Authorization: Bearer <OOMOL_CONNECT_ADMIN_TOKEN>` header.

## Configuration

Edit `packages/research-agent-ui/wrangler.local.jsonc` to:
- Set your Cloudflare account ID
- Configure D1 database ID
- Choose R2 or Workers KV for transit files
- Adjust concurrency and file size limits

See `CLOUDFLARE_DEPLOYMENT.md` for all available options.

## Storage Backends

Choose **one** for transit files:

- **R2** (default) — Unlimited file size, auto-lifecycle cleanup, recommended for production
- **Workers KV** (lightweight) — Max 25 MiB per file, auto-TTL deletion, no setup cost

## Deployment

For production:

```bash
cd packages/research-agent-ui

# Generate admin secrets
openssl rand -base64 32
openssl rand -base64 32

# Store secrets
wrangler secret put OOMOL_CONNECT_ADMIN_TOKEN --config wrangler.local.jsonc
wrangler secret put OOMOL_CONNECT_ENCRYPTION_KEY --config wrangler.local.jsonc

# Apply migrations to remote DB
npx wrangler d1 migrations apply research-agent-ui --remote --config wrangler.local.jsonc

# Deploy
npm run deploy:cloudflare
```

## Security

- **Admin Token** — Store securely, rotate periodically
- **Encryption Key** — CRITICAL: Keep secure backup; if lost, encrypted data cannot be recovered
- **wrangler.local.jsonc** — Git-ignored, contains real resource IDs; never commit with secrets
- **.env** — Git-ignored, local development only

## Monitoring

Set up monitoring and alerts:

- View Worker metrics in Cloudflare dashboard
- Stream logs: `wrangler tail --config wrangler.local.jsonc`
- Enable Analytics Engine for request/error tracking
- Configure cron triggers for scheduled maintenance

## Next Steps

1. ✅ Read `CLOUDFLARE_QUICKSTART.md` for local setup
2. ✅ Read `CLOUDFLARE_DEPLOYMENT.md` for production deployment  
3. ✅ Test locally with `npm run dev:cloudflare`
4. ✅ Configure D1 migrations for your schema changes
5. ✅ Deploy to production with `npm run deploy:cloudflare`

## Documentation

- [CLOUDFLARE_QUICKSTART.md](packages/research-agent-ui/CLOUDFLARE_QUICKSTART.md) — 5-minute setup
- [CLOUDFLARE_DEPLOYMENT.md](packages/research-agent-ui/CLOUDFLARE_DEPLOYMENT.md) — Complete guide
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [D1 Documentation](https://developers.cloudflare.com/d1/)
- [R2 Documentation](https://developers.cloudflare.com/r2/)

## Architecture

The Worker follows OpenConnector patterns:

```
┌─────────────────────────────────────────────────┐
│         Cloudflare Worker (HTTP Runtime)        │
├─────────────────────────────────────────────────┤
│  /health        /api/v1/metadata                │
│  /api/v1/connections    /oauth/*                │
│  /api/v1/run-logs       /transit-files/*        │
├─────────────────────────────────────────────────┤
│  D1 Database            │  R2 or KV              │
│  ├─ connections         │  └─ transit files     │
│  ├─ oauth_state         │                       │
│  ├─ run_logs            │  Static Assets        │
│  ├─ idempotency_keys    │  └─ Web Console       │
│  └─ transit_files       │                       │
└─────────────────────────────────────────────────┘
```

---

All files are ready to use. Start with `CLOUDFLARE_QUICKSTART.md` for immediate setup.
