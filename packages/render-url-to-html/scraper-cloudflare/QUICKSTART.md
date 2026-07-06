# Cloudflare Scraper Quick Start

This guide will help you deploy and use the Cloudflare Puppeteer scraper service.

## Prerequisites

1. **Cloudflare Account**: Workers Paid plan required for Browser Rendering
2. **Wrangler CLI**: Install with `npm install -g wrangler`
3. **Authentication**: Run `wrangler login`

## Deployment

### 1. Navigate to the scraper directory

```bash
cd packages/render-url-to-html/scraper-cloudflare
```

### 2. Install dependencies

```bash
bun install
# or
npm install
```

### 3. Configure secrets (optional but recommended)

```bash
# Set API key for authentication
wrangler secret put SCRAPER_API_KEY
# Enter your API key when prompted

# Optional: Configure proxy
wrangler secret put PROXY_URL
wrangler secret put PROXY_USER
wrangler secret put PROXY_PASS

# Optional: 2Captcha for automated CAPTCHA solving
wrangler secret put TWO_CAPTCHA_KEY
```

### 4. Deploy to Cloudflare

```bash
wrangler deploy
```

This will output your Worker URL, e.g., `https://scraper-cloudflare.your-subdomain.workers.dev`

### 5. Test the deployment

```bash
# View Swagger UI
curl https://scraper-cloudflare.your-subdomain.workers.dev/swagger

# Test rendering (replace YOUR_API_KEY if you set one)
curl -X POST https://scraper-cloudflare.your-subdomain.workers.dev/api/render \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "url": "https://example.com",
    "format": "json"
  }'
```

## Using from qwksearch-web

### 1. Set environment variables

Add to your `.env` or `.env.local`:

```bash
SCRAPER_URL=https://scraper-cloudflare.your-subdomain.workers.dev
SCRAPER_API_KEY=your-api-key-here
```

### 2. Use in code

```typescript
import { renderUrlToHtml } from '@/lib/scraper';

// Simple usage
const html = await renderUrlToHtml('https://example.com');

// With options
const html = await renderUrlToHtml('https://spa-site.com', {
  blockImages: true,
  bypassCaptcha: true,
  timeout: 45000
});
```

### 3. Use from AI agent

The AI agent can automatically use the `render_page_with_javascript` tool:

```
User: "Fetch the content from https://js-heavy-site.com"

Agent: [Uses render_page_with_javascript tool automatically]
```

## Configuration Options

### Request Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `url` | string | **required** | URL to render |
| `blockImages` | boolean | `false` | Block image loading for faster rendering |
| `wait` | number | `0` | Additional wait time after page load (ms) |
| `timeout` | number | `30000` | Navigation timeout (ms) |
| `waitUntil` | string | `"networkidle2"` | Puppeteer waitUntil condition |
| `bypassCaptcha` | boolean | `true` | Attempt to bypass challenges |
| `sessionId` | string | `"default"` | Session ID for cookie persistence |
| `format` | string | `"html"` | Response format (`html` or `json`) |
| `maxRetries` | number | `10` | Max challenge bypass attempts |

### Wait Strategies

- **`domcontentloaded`**: Fastest, waits for initial HTML
- **`load`**: Waits for all resources (images, stylesheets)
- **`networkidle2`**: Balanced, waits for network to be mostly idle
- **`networkidle0`**: Slowest, waits for complete network silence

## Common Use Cases

### JavaScript-Heavy Site

```typescript
const html = await renderUrlToHtml('https://react-app.com', {
  waitUntil: 'networkidle2',
  blockImages: true
});
```

### Behind Cloudflare Protection

```typescript
const result = await renderUrlWithMetadata('https://protected-site.com', {
  bypassCaptcha: true,
  maxRetries: 15
});
```

### Session-Based Scraping

```typescript
// Login
await renderUrlToHtml('https://site.com/login', {
  sessionId: 'user-123',
  wait: 3000
});

// Access protected page
const html = await renderUrlToHtml('https://site.com/protected', {
  sessionId: 'user-123'
});
```

### With Custom Headers

```typescript
const result = await renderWithCloudflare({
  url: 'https://api-site.com',
  headers: {
    'X-API-Key': 'your-key',
    'User-Agent': 'Custom Bot 1.0'
  },
  format: 'json'
});
```

## Monitoring

View Worker logs:

```bash
wrangler tail
```

Check metrics in the Cloudflare dashboard:

1. Go to Workers & Pages
2. Select your `scraper-cloudflare` worker
3. View Metrics tab

## Troubleshooting

### Issue: "Browser timeout"

**Solution**: Increase timeout or use faster wait strategy:

```typescript
await renderUrlToHtml(url, {
  timeout: 60000,
  waitUntil: 'domcontentloaded'
});
```

### Issue: "Invalid API key"

**Solution**: Verify environment variable is set:

```bash
wrangler secret list
```

### Issue: "Challenge not bypassed"

**Solution**: 
1. Ensure `bypassCaptcha: true`
2. Set `TWO_CAPTCHA_KEY` for automated solving
3. Increase `maxRetries`

### Issue: High costs

**Solution**:
1. Use `blockImages: true`
2. Lower `timeout` values
3. Use faster wait strategies
4. Implement caching in your application
5. Use `extract_page` tool when JavaScript isn't needed

## Cost Optimization

Cloudflare Browser Rendering is billed per request (~$0.50 per 1,000 requests).

To minimize costs:

1. **Cache rendered pages** at the application level
2. **Block unnecessary resources**: `blockImages: true`
3. **Use appropriate timeouts**: Don't wait longer than needed
4. **Choose the right wait strategy**: `domcontentloaded` is fastest
5. **Fallback to extract_page**: Use for server-rendered sites

Example caching implementation:

```typescript
const cache = new Map<string, { html: string; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getCachedOrRender(url: string): Promise<string> {
  const cached = cache.get(url);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.html;
  }
  
  const html = await renderUrlToHtml(url);
  cache.set(url, { html, timestamp: Date.now() });
  
  return html;
}
```

## Next Steps

- Read the [full integration documentation](../../../docs/SCRAPER_CLOUDFLARE_INTEGRATION.md)
- View [API reference](readme.md)
- Check out [example code](../../../apps/qwksearch-web/lib/scraper/cloudflare-scraper-client.ts)

## Support

For issues or questions:

1. Check Worker logs: `wrangler tail`
2. Review [Cloudflare Browser Rendering docs](https://developers.cloudflare.com/browser-rendering/)
3. Open an issue on GitHub
