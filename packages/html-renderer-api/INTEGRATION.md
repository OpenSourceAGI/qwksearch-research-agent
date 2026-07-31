# Cloudflare Puppeteer Scraper Integration

## Overview

The Cloudflare Puppeteer scraper is now **fully integrated** into qwksearch-web for backend rendering of JavaScript-heavy websites, bot detection bypass, and dynamic content extraction.

## Architecture

### 1. Scraper Service (Cloudflare Worker)
**Location**: `packages/render-url-to-html/scraper-cloudflare/`

A production-ready Cloudflare Worker that uses Puppeteer with Browser Rendering to:
- Render JavaScript-heavy pages
- Bypass Cloudflare challenges and CAPTCHAs
- Handle session management and cookie persistence
- Support proxy configuration
- Reuse browser instances for performance (5-minute persistence)

### 2. Client Library
**Location**: `apps/qwksearch-web/lib/scraper/`

- `cloudflare-scraper-client.ts` - TypeScript client for calling the scraper
- `use-scraper.ts` - React hooks for easy integration
- `index.ts` - Barrel exports

### 3. Next.js API Route
**Location**: `apps/qwksearch-web/app/api/scraper/route.ts`

Edge function that proxies requests to the scraper service:
- `POST /api/scraper` - Full rendering with JSON body
- `GET /api/scraper?url=...` - Quick rendering with query params

### 4. Integration into URL-to-Content Pipeline
**Location**: `packages/extract-webpage/src/url-to-content/url-to-html.ts`

The scraper is now integrated into the fallback chain:
1. **First**: Try basic fetch with `grab()`
2. **Second**: Try Cloudflare Puppeteer scraper (handles JS + bot detection)
3. **Third**: Try JINA reader (final fallback)

Bot detection triggers immediate escalation to Cloudflare scraper.

## Deployment Instructions

### Step 1: Deploy Cloudflare Worker

```bash
cd packages/render-url-to-html/scraper-cloudflare

# Install dependencies
npm install @cloudflare/puppeteer

# Deploy to Cloudflare
npx wrangler deploy
```

This will output a URL like: `https://scraper-cloudflare.your-subdomain.workers.dev`

### Step 2: Configure Environment Variables

Add to `apps/qwksearch-web/.env.local`:

```bash
# Cloudflare Browser Rendering (Scraper)
SCRAPER_URL=https://scraper-cloudflare.your-subdomain.workers.dev
SCRAPER_API_KEY=your-api-key-here  # Optional - for authentication
```

### Step 3: Set Scraper API Key (Optional)

If you want to protect your scraper with an API key:

```bash
cd packages/render-url-to-html/scraper-cloudflare
npx wrangler secret put SCRAPER_API_KEY
# Enter your secret key when prompted
```

Then add the same key to your `.env.local` as shown above.

## Usage Examples

### From React Components

```tsx
import { useScraper } from '@/lib/scraper';

function MyComponent() {
  const scraper = useScraper({
    blockImages: true,
    bypassCaptcha: true
  });

  const handleScrape = async () => {
    await scraper.scrape('https://example.com');
    console.log(scraper.data?.html);
    console.log('Load time:', scraper.data?.loadTime, 'ms');
  };

  return (
    <button onClick={handleScrape} disabled={scraper.isLoading}>
      {scraper.isLoading ? 'Scraping...' : 'Scrape Page'}
    </button>
  );
}
```

### From API Routes

```typescript
import { renderUrlWithMetadata } from '@/lib/scraper';

const result = await renderUrlWithMetadata('https://example.com', {
  blockImages: true,
  bypassCaptcha: true
});

console.log(result.html);
console.log(result.title);
console.log(result.cookies);
console.log(result.loadTime);
```

### Via Next.js API Endpoint

```bash
# POST request
curl -X POST http://localhost:3000/api/scraper \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "blockImages": true,
    "bypassCaptcha": true
  }'

# GET request
curl "http://localhost:3000/api/scraper?url=https://example.com&blockImages=true"
```

## Features

### Core Features
- ✅ JavaScript rendering with Puppeteer
- ✅ Bot detection bypass (Cloudflare, Datadome, etc.)
- ✅ CAPTCHA solving support (2Captcha integration)
- ✅ Session management with cookie persistence
- ✅ Browser instance reuse (5-minute persistence)
- ✅ Resource blocking (images, CSS, fonts) for performance
- ✅ Proxy support (HTTP/HTTPS/SOCKS5)
- ✅ Custom headers and user agents
- ✅ Multiple wait strategies (domcontentloaded, networkidle, etc.)

### API Documentation
- ✅ Swagger UI at `/swagger`
- ✅ OpenAPI 3.0 spec at `/api/openapi.json`
- ✅ Authentication via Bearer token, query param, or POST body

### Response Formats
- **HTML**: Just the rendered HTML content
- **JSON**: Full metadata including cookies, load time, title, etc.

## Integration Points

### 1. Article Extraction
The scraper is automatically used when extracting articles that:
- Return bot detection errors
- Fail to load with basic fetch
- Require JavaScript rendering

### 2. Search Results
When search results point to JavaScript-heavy sites, the scraper ensures full content extraction.

### 3. Citation Links
When users click citation links in AI responses, the scraper ensures the article can be loaded even if bot-protected.

## Performance Optimization

### Resource Blocking
Block images for 2-3x faster loading:

```typescript
const result = await renderUrlWithMetadata(url, {
  blockImages: true,  // Saves ~60% load time
});
```

### Wait Strategies
Choose the right strategy for your use case:

- `domcontentloaded` - Fastest, for static content
- `load` - Standard, waits for all resources
- `networkidle2` - **Default**, balanced approach
- `networkidle0` - Slowest, waits for complete network silence

### Browser Reuse
Browsers stay alive for 5 minutes between requests, making subsequent requests much faster:
- First request: ~3-5 seconds
- Subsequent requests: ~1-2 seconds

## Monitoring & Debugging

### Response Headers
The scraper returns useful debug headers:

```
X-Load-Time: 2341          # Page load time in milliseconds
X-Session-Id: user123      # Session identifier used
X-Final-URL: https://...   # Final URL after redirects
X-Browser-Reused: true     # Whether browser was reused
```

### Logging
Check Cloudflare Worker logs to see:
- Browser launch/reuse events
- Session management activities
- Performance metrics
- Error details

View logs:
```bash
cd packages/render-url-to-html/scraper-cloudflare
npx wrangler tail
```

## Troubleshooting

### Issue: "Scraper request failed (401)"
**Solution**: Add SCRAPER_API_KEY to both:
1. Cloudflare Worker secrets: `wrangler secret put SCRAPER_API_KEY`
2. Local environment: Add to `.env.local`

### Issue: "Scraper request failed (500)"
**Solution**: Check Cloudflare Worker logs with `wrangler tail` to see the actual error.

### Issue: Bot detection still triggered
**Solution**: Enable captcha bypass:
```typescript
const result = await renderUrlWithMetadata(url, {
  bypassCaptcha: true,
  maxRetries: 10
});
```

### Issue: Slow performance
**Solution**: Enable resource blocking:
```typescript
const result = await renderUrlWithMetadata(url, {
  blockImages: true,  // Blocks images, CSS, fonts
  waitUntil: 'domcontentloaded'  // Don't wait for all resources
});
```

## Cost Considerations

### Cloudflare Browser Rendering Pricing
- **Free Tier**: 1,000 browser rendering hours/month
- **Paid**: $5 per million Browser Rendering requests
- **Durable Objects**: $0.15 per million requests + $0.02 per GB-hour

### Optimization Tips
1. Use browser reuse (already implemented)
2. Block images when content is the priority
3. Set appropriate timeouts
4. Use session management to avoid re-authentication

## Security Features

### Authentication
Three methods supported:
1. Bearer token: `Authorization: Bearer YOUR_KEY`
2. Query parameter: `?api_key=YOUR_KEY`
3. POST body: `{"api_key": "YOUR_KEY"}`

### Input Validation
- URL format validation
- Parameter type checking
- Timeout and dimension limits
- XSS prevention in responses

### Session Isolation
- Separate cookie storage per session ID
- No cross-session data leakage
- Automatic session cleanup

## Next Steps

1. **Deploy the scraper** to Cloudflare Workers
2. **Configure environment variables** in qwksearch-web
3. **Test the integration** by visiting a JavaScript-heavy site
4. **Monitor performance** using Cloudflare dashboard
5. **Adjust settings** based on your needs (blocking, timeouts, etc.)

## Files Modified

### New/Updated Files
1. `packages/extract-webpage/src/url-to-content/url-to-html.ts` - Added Cloudflare scraper to fallback chain
2. `apps/qwksearch-web/lib/scraper/cloudflare-scraper-client.ts` - Client library (already existed)
3. `apps/qwksearch-web/lib/scraper/use-scraper.ts` - React hooks (already existed)
4. `apps/qwksearch-web/app/api/scraper/route.ts` - API endpoint (already existed)
5. `.env.example` - Updated with scraper configuration (already had it)

### Deployment Files
All files in `packages/render-url-to-html/scraper-cloudflare/`:
- `scraper-cloudflare.ts` - Main worker entry point
- `browser-durable-object.ts` - Durable Object for browser management
- `scraper-utils.ts` - Utility functions
- `scraper-openapi.ts` - API documentation
- `scraper-captcha.ts` - CAPTCHA solving
- `scraper-stealth.ts` - Bot detection bypass
- `wrangler.toml` - Cloudflare Worker configuration
- `package.json` - Dependencies

## Support

For issues or questions:
1. Check Cloudflare Worker logs: `npx wrangler tail`
2. Review the readme: `packages/render-url-to-html/scraper-cloudflare/readme.md`
3. Check browser console for client-side errors
4. Verify environment variables are set correctly
