# Cloudflare Scraper Deployment Guide

## Overview

The article extraction system in qwksearch-web uses a 3-tier fallback chain:

1. **grab-url** - Basic HTTP fetch (free, fast)
2. **Cloudflare Puppeteer Scraper** - JavaScript rendering & bot bypass (requires Cloudflare Workers Paid plan)
3. **JINA Reader API** - Backup scraping (requires API key)

## Deployment Steps

### 1. Deploy Cloudflare Scraper (Optional but Recommended)

The Cloudflare scraper is needed for:
- JavaScript-heavy single-page applications (React, Vue, Angular)
- Sites with Cloudflare bot protection
- Sites that require cookies/sessions

**Prerequisites:**
- Cloudflare account with Workers Paid plan ($5/month + usage)
- Wrangler CLI: `npm install -g wrangler`

**Deploy:**

```bash
cd packages/render-url-to-html/scraper-cloudflare

# Install dependencies
npm install

# Login to Cloudflare
wrangler login

# Set API key (recommended for production)
wrangler secret put SCRAPER_API_KEY
# Enter a secure random key when prompted

# Deploy
wrangler deploy
```

This will output your Worker URL, e.g., `https://scraper-cloudflare.your-subdomain.workers.dev`

### 2. Configure Environment Variables

Update `apps/qwksearch-web/.env`:

```bash
# Cloudflare Scraper (optional - uses direct fetch if not configured)
SCRAPER_URL=https://scraper-cloudflare.your-subdomain.workers.dev
SCRAPER_API_KEY=your-secure-api-key-here

# JINA Reader API (optional - backup scraping service)
# Get a free key at https://jina.ai
JINA_API_KEY=your-jina-api-key-here
```

### 3. Test Article Extraction

```bash
cd apps/qwksearch-web

# Test with a simple URL
curl "http://localhost:3000/api/doc/article?url=https://example.com" | jq

# Test with a JS-heavy site (requires Cloudflare scraper)
curl "http://localhost:3000/api/doc/article?url=https://www.quora.com/What-is-AI" | jq
```

## Testing Locally

Run the test scripts:

```bash
cd apps/qwksearch-web

# Test basic extraction
npx tsx test-article-extraction.ts

# Test simple URLs
npx tsx test-simple-extraction.ts
```

## Cost Considerations

**Cloudflare Browser Rendering:**
- ~$0.50 per 1,000 requests
- 30-second CPU time included per request
- Additional CPU time: $0.50 per CPU-hour

**Optimization tips:**
1. Enable caching in the application (already implemented in [route.ts](apps/qwksearch-web/app/api/doc/article/route.ts))
2. Use `blockImages: true` for faster rendering
3. Choose appropriate timeout values
4. Fallback to grab-url for server-rendered sites

## Architecture

```
extractContent()
  ↓
scrapeURL()
  ↓
1. grab-url (HTTP fetch)
   ├─ Success → Return HTML
   ├─ Error  → Try Cloudflare scraper
   ↓
2. scrapeCloudflare() (Puppeteer)
   ├─ Success → Return HTML
   ├─ Error  → Try JINA
   ↓
3. scrapeJINA() (Reader API)
   ├─ Success → Return HTML
   └─ Error  → Throw error
```

## Troubleshooting

### "Cloudflare scraper not configured"

**Cause**: `SCRAPER_URL` environment variable not set

**Solution**: Either:
1. Deploy the Cloudflare scraper and set `SCRAPER_URL`, or
2. This is expected - the system will fall back to JINA

### "JINA scraping requires API key"

**Cause**: JINA is being used as fallback but no API key is configured

**Solution**: 
1. Get a free key at https://jina.ai
2. Add to `.env`: `JINA_API_KEY=your-key-here`
3. Restart the dev server

### "All scraping methods failed"

**Cause**: All 3 methods failed (grab-url, Cloudflare, JINA)

**Solutions**:
1. Check internet connectivity
2. Verify the URL is accessible
3. Check if the site blocks bots
4. Configure at least one fallback method (Cloudflare or JINA)

### Articles not extracting content

**Cause**: The site requires JavaScript rendering

**Solution**: Deploy and configure the Cloudflare scraper

## Monitoring

### Check Cloudflare Worker Logs

```bash
cd packages/render-url-to-html/scraper-cloudflare
wrangler tail
```

### View Application Logs

```bash
cd apps/qwksearch-web
npm run dev

# Watch the console for extraction logs:
# [extractContent] input is URL
# [scrapeURL] initial fetch failed, trying Cloudflare
# [scrapeCloudflare] Cloudflare scraper succeeded
```

## Next Steps

1. **Deploy to production**: Follow [vinext deployment guide](https://github.com/vinxi/vinxi)
2. **Monitor costs**: Check Cloudflare dashboard for usage
3. **Optimize caching**: Tune cache TTL in [route.ts](apps/qwksearch-web/app/api/doc/article/route.ts)
4. **Add rate limiting**: Implement per-user rate limits for scraping

## References

- [Cloudflare Browser Rendering Docs](https://developers.cloudflare.com/browser-rendering/)
- [Scraper Quick Start](packages/render-url-to-html/scraper-cloudflare/QUICKSTART.md)
- [JINA Reader API](https://jina.ai/reader/)
