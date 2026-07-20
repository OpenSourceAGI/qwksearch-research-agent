# Cloudflare Workers Deployment

This package supports Cloudflare Workers as a deployment runtime for research-agent-ui, providing:

- **HTTP API runtime** — Workers for handling requests
- **D1 database** — Connections, OAuth state, run logs, transit file metadata, and idempotency records
- **R2 or Workers KV** — Transit file storage (configurable backend)
- **Static assets** — Web Console UI

## Prerequisites

- A Cloudflare account with Workers, D1, and either R2 or Workers KV access
- `wrangler` CLI: `npm install -g @cloudflare/wrangler` or use `npx wrangler`
- Node.js 22 or newer

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Copy and Configure Wrangler Config

```bash
cp wrangler.example.jsonc wrangler.local.jsonc
```

Edit `wrangler.local.jsonc` and fill in:
- Your Cloudflare account ID
- D1 database ID (created below)
- R2 bucket name or KV namespace ID (created below)

`wrangler.local.jsonc` is git-ignored — it contains your local resource IDs.

### 3. Authenticate With Wrangler

If not already logged in:

```bash
npx wrangler login
```

### 4. Create Cloudflare Resources

#### Create D1 Database

```bash
npx wrangler d1 create research-agent-ui --config wrangler.local.jsonc
```

Copy the returned `database_id` into `wrangler.local.jsonc` under `d1_databases[0].database_id`.

#### Create Transit File Backend

Choose **one** of the following:

**Option A: R2 (default, supports files larger than 25 MiB)**

```bash
npx wrangler r2 bucket create research-agent-ui-transit-files --config wrangler.local.jsonc
```

Update `wrangler.local.jsonc`:
- Set `r2_buckets[0].bucket_name` to `research-agent-ui-transit-files`
- Set `vars.TRANSIT_FILES_BACKEND` to `"r2"` in production env

**Option B: Workers KV (lightweight, max 25 MiB per file)**

```bash
npx wrangler kv namespace create research-agent-ui-transit-files --config wrangler.local.jsonc
```

Copy the returned namespace `id` and `preview_id` into `wrangler.local.jsonc`, then:
- Comment out the `r2_buckets` block
- Uncomment and configure `kv_namespaces`
- Set `vars.TRANSIT_FILES_BACKEND` to `"kv"` in production env

## Local Development

### 1. Apply Migrations

```bash
npx wrangler d1 migrations apply research-agent-ui --local --config wrangler.local.jsonc
```

### 2. Set Local Secrets

Create `.env` (git-ignored) for local testing:

```dotenv
OOMOL_CONNECT_ADMIN_TOKEN=local-dev-token-12345
OOMOL_CONNECT_ENCRYPTION_KEY=local-dev-key-67890abcdef
```

These are NOT used by local preview without explicit setup (see wrangler docs for loading .env files).

### 3. Start Local Preview

```bash
npm run dev:cloudflare
```

This:
- Generates catalog metadata
- Builds Web Console assets
- Starts `wrangler dev` with local D1, R2/KV, and static assets

### 4. Test Health Endpoint

```bash
curl http://localhost:8787/health
```

Should return:

```json
{ "ok": true, "version": "0.1.0" }
```

## Remote Deployment

### 1. Generate Secrets

Generate two independent random values:

```bash
openssl rand -base64 32
```

Store these securely (password manager, secrets vault, etc.):
- **OOMOL_CONNECT_ADMIN_TOKEN** — for Web Console and admin API access
- **OOMOL_CONNECT_ENCRYPTION_KEY** — for encrypting credentials (DO NOT LOSE — encrypted data cannot be recovered if lost)

### 2. Store Secrets in Wrangler

```bash
npx wrangler secret put OOMOL_CONNECT_ADMIN_TOKEN --config wrangler.local.jsonc
npx wrangler secret put OOMOL_CONNECT_ENCRYPTION_KEY --config wrangler.local.jsonc
```

Paste each generated value when prompted.

### 3. Apply Migrations to Remote D1

Before initial deployment and every upgrade:

```bash
npx wrangler d1 migrations apply research-agent-ui --remote --config wrangler.local.jsonc
```

### 4. Deploy

```bash
npm run deploy:cloudflare
```

This:
- Generates catalog
- Builds Web Console
- Runs `wrangler deploy`

### 5. Verify Deployment

```bash
curl https://your-worker-url.workers.dev/health
```

Should return `{"ok": true}`. Replace URL with your actual Worker URL or custom domain.

## Configuration

All environment variables are configured in `wrangler.local.jsonc` under `env.[environment].vars`. Common settings:

| Variable | Default | Notes |
|----------|---------|-------|
| `TRANSIT_FILES_BACKEND` | `"r2"` | `"r2"` or `"kv"` |
| `OOMOL_CONNECT_TRANSIT_FILE_TTL_SECONDS` | `86400` | 24 hours |
| `OOMOL_CONNECT_TRANSIT_FILE_MAX_BYTES` | `52428800` | 50 MiB (KV caps at 25 MiB) |
| `OOMOL_CONNECT_MAX_CONCURRENT_EXECUTIONS` | `10` | Concurrency limit |
| `NODE_ENV` | `production` | `production`, `staging`, `development` |

See `wrangler.example.jsonc` for all available options.

## API Endpoints

### Health Check

```
GET /health
```

Returns runtime metadata and version.

### Metadata

```
GET /api/v1/metadata
```

Returns capabilities, features, and provider information.

### Connections (Admin)

```
GET /api/v1/connections
POST /api/v1/connections
DELETE /api/v1/connections/:id
```

Manage OAuth providers, API keys, and integrations.

### OAuth (Admin)

```
POST /api/v1/oauth/authorize
POST /api/v1/oauth/callback
```

Initiate OAuth flows and handle callbacks.

### Run Logs (Admin)

```
GET /api/v1/run-logs
POST /api/v1/run-logs
```

Audit trail of executed actions.

### Transit Files (Admin)

```
POST /api/v1/transit-files
GET /api/v1/transit-files/:id
DELETE /api/v1/transit-files/:id
```

Temporary file storage and retrieval.

All admin endpoints require `Authorization: Bearer <OOMOL_CONNECT_ADMIN_TOKEN>` header.

## Scheduled Tasks

Configure cron triggers in `wrangler.local.jsonc` under `triggers.crons`. The Worker will call the `scheduled` handler to:
- Delete expired OAuth state records
- Delete expired idempotency keys
- Clean up expired transit files from D1 and R2/KV

Example (daily at midnight UTC):

```json
"triggers": {
  "crons": ["0 0 * * *"]
}
```

## Troubleshooting

### Local Preview Not Starting

Check that D1 and R2/KV are configured in `wrangler.local.jsonc`. Ensure migrations have been applied:

```bash
npx wrangler d1 migrations apply research-agent-ui --local --config wrangler.local.jsonc
```

### Database Migration Errors

Verify migration files in `migrations/` are syntactically correct SQL. Test locally first:

```bash
npx wrangler d1 migrations apply research-agent-ui --local --config wrangler.local.jsonc
```

### File Upload Fails

- Check file size doesn't exceed `OOMOL_CONNECT_TRANSIT_FILE_MAX_BYTES`
- Verify R2 bucket exists and has correct name in config
- For KV, ensure `TRANSIT_FILES_BACKEND` is set to `"kv"` and namespace is configured

### 401 Unauthorized on Admin Endpoints

Verify `Authorization` header is present and token matches `OOMOL_CONNECT_ADMIN_TOKEN` set in secrets.

## Security Considerations

- **Admin token** — Store securely, rotate periodically
- **Encryption key** — CRITICAL: Store in a password manager or external vault; if lost, encrypted data is unrecoverable
- **Transit files** — Configure R2 lifecycle rules to auto-delete expired files
- **Database access** — Restrict D1 access to the Worker runtime via IAM policies
- **Secrets** — Never commit `wrangler.local.jsonc` with real tokens to git

## Performance Tuning

- **KV vs R2** — Use KV for small files (<25 MiB), R2 for larger files
- **Database queries** — Index frequently filtered columns (already done in migrations)
- **Concurrency** — Adjust `OOMOL_CONNECT_MAX_CONCURRENT_EXECUTIONS` based on load
- **TTL** — Tune `OOMOL_CONNECT_TRANSIT_FILE_TTL_SECONDS` based on typical usage patterns

## Support & Resources

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [D1 Documentation](https://developers.cloudflare.com/d1/)
- [R2 Documentation](https://developers.cloudflare.com/r2/)
- [Workers KV Documentation](https://developers.cloudflare.com/kv/)
