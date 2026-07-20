# Cloudflare Deployment Quick Start

Get research-agent-ui running on Cloudflare Workers in 10 minutes.

## Prerequisites

```bash
npm install -g @cloudflare/wrangler
```

Verify installation:

```bash
wrangler --version
```

## Steps

### 1. Copy Config and Log In

```bash
cp wrangler.example.jsonc wrangler.local.jsonc
wrangler login
```

### 2. Create Resources

```bash
# Create D1 database
npx wrangler d1 create research-agent-ui --config wrangler.local.jsonc

# Create R2 transit bucket
npx wrangler r2 bucket create research-agent-ui-transit-files --config wrangler.local.jsonc
```

Update `wrangler.local.jsonc` with the returned IDs.

### 3. Apply Migrations

```bash
npx wrangler d1 migrations apply research-agent-ui --local --config wrangler.local.jsonc
```

### 4. Start Local Dev

```bash
npm run dev:cloudflare
```

Visit `http://localhost:8787/health` — should return `{"ok": true}`.

### 5. Deploy (Optional)

```bash
# Generate two admin secrets
openssl rand -base64 32
openssl rand -base64 32

# Store them
wrangler secret put OOMOL_CONNECT_ADMIN_TOKEN --config wrangler.local.jsonc
wrangler secret put OOMOL_CONNECT_ENCRYPTION_KEY --config wrangler.local.jsonc

# Apply migrations to remote
npx wrangler d1 migrations apply research-agent-ui --remote --config wrangler.local.jsonc

# Deploy
npm run deploy:cloudflare
```

Visit your Worker URL to verify.

## Next Steps

- Read [CLOUDFLARE_DEPLOYMENT.md](CLOUDFLARE_DEPLOYMENT.md) for detailed configuration
- Configure cron triggers for cleanup tasks
- Set custom domain if desired
- Enable analytics for monitoring

## Support

- Check `wrangler.local.jsonc` is properly configured
- Verify D1 and R2 resources exist in Cloudflare dashboard
- Run `wrangler tail` to stream logs during development
