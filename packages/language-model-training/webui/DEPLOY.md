# Cloudflare Workers Deployment Guide

This Next.js web UI can be deployed to Cloudflare Workers using Wrangler.

## Prerequisites

1. **Wrangler CLI**: Install globally or use `npm install` (it's in devDependencies)
   ```bash
   npm install -g @cloudflare/wrangler
   # OR use the local version
   npx wrangler --version
   ```

2. **Cloudflare Account**: Create an account at https://dash.cloudflare.com

3. **Authentication**: Authenticate with Cloudflare
   ```bash
   npx wrangler login
   # This opens a browser to authorize the CLI
   ```

## Configuration

The deployment is configured via `wrangler.json`:

- **name**: Worker name
- **type**: JavaScript worker
- **site.bucket**: Where static assets are served from
- **env**: Environment-specific configurations (production, staging)
- **vars**: Environment variables
- **compatibility_date**: Cloudflare runtime version
- **compatibility_flags**: Enable Node.js compatibility

## Environment Setup

1. Update `wrangler.json` with your domain/subdomain:
   ```json
   "routes": [
     {
       "pattern": "yourdomain.com/*",
       "zone_name": "yourdomain.com"
     }
   ]
   ```

2. Set environment variables for API URL:
   ```json
   "env": {
     "production": {
       "vars": {
         "API_URL": "https://api.yourdomain.com"
       }
     }
   }
   ```

3. Create `.env.local` from the example:
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local with your API URL
   ```

## Build & Deploy

### Install Dependencies
```bash
npm install
```

### Build the Project
```bash
npm run build
```

### Preview Locally
```bash
npm run preview
```
This starts a local Wrangler dev server at `http://localhost:8787`

### Deploy to Staging
```bash
npm run deploy:staging
```

### Deploy to Production
```bash
npm run deploy:prod
```

### Deploy to Default Environment
```bash
npm run deploy
```

## Post-Deployment

After deployment, your web UI will be available at:
- **Default**: `https://<worker-name>.workers.dev`
- **With Domain**: `https://yourdomain.com` (if configured)

### Access Logs
```bash
npx wrangler tail
```

### Monitor Performance
- View metrics in [Cloudflare Dashboard](https://dash.cloudflare.com)
- Check deployment history: `npx wrangler deployments list`

## Troubleshooting

### Build Errors
- Ensure Node.js 18+ is installed
- Clear cache: `rm -rf .next`
- Rebuild: `npm run build`

### Deployment Fails
- Check authentication: `npx wrangler whoami`
- Verify account has active Cloudflare Workers
- Check `wrangler.json` syntax: `npx wrangler publish --dry-run`

### API Connection Issues
- Verify `NEXT_PUBLIC_API_URL` is set correctly
- Check CORS settings on your API backend
- Use browser DevTools to inspect network requests

## CI/CD Integration

For automated deployments, use GitHub Actions:

```yaml
name: Deploy to Cloudflare

on:
  push:
    branches: [main, staging]
    paths:
      - 'packages/language-model-training/webui/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm install
        working-directory: packages/language-model-training/webui
      - run: npm run build
        working-directory: packages/language-model-training/webui
      - run: npm run deploy
        working-directory: packages/language-model-training/webui
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

## Performance Tips

1. **Image Optimization**: Already disabled in `next.config.mjs` for Workers compatibility
2. **Edge Caching**: Configure in `wrangler.json` routes
3. **Analytics**: Enable in Cloudflare Dashboard for monitoring
4. **Workers KV**: For caching, configure additional KV bindings in `wrangler.json`

## Additional Resources

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Wrangler CLI Docs](https://developers.cloudflare.com/workers/wrangler/)
- [Next.js on Cloudflare Pages](https://developers.cloudflare.com/pages/framework-guides/nextjs/)
