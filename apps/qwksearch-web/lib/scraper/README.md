# Cloudflare Scraper Client

TypeScript client for the Cloudflare Puppeteer-based scraper service.

## Quick Start

```typescript
import { renderUrlToHtml } from '@/lib/scraper';

const html = await renderUrlToHtml('https://example.com');
```

## Features

- ✅ Full browser JavaScript execution (Puppeteer)
- ✅ Bot protection bypass (Cloudflare, reCAPTCHA)
- ✅ Session management with cookie persistence
- ✅ Performance optimization (image blocking, smart waits)
- ✅ Proxy support
- ✅ TypeScript types included

## Installation

The client is already integrated. Just set environment variables:

```bash
# .env or .env.local
SCRAPER_URL=https://scraper-cloudflare.your-subdomain.workers.dev
SCRAPER_API_KEY=your-api-key-here
```

## Usage

### Simple HTML Rendering

```typescript
import { renderUrlToHtml } from '@/lib/scraper';

const html = await renderUrlToHtml('https://example.com');
```

### With Options

```typescript
const html = await renderUrlToHtml('https://spa-site.com', {
  blockImages: true,      // Faster rendering
  bypassCaptcha: true,    // Bypass challenges
  timeout: 45000,         // 45 second timeout
  waitUntil: 'networkidle2'
});
```

### Full Metadata

```typescript
import { renderUrlWithMetadata } from '@/lib/scraper';

const result = await renderUrlWithMetadata('https://example.com');

console.log(result.title);              // Page title
console.log(result.url);                // Final URL
console.log(result.html);               // Rendered HTML
console.log(result.cookies);            // Cookies set
console.log(result.loadTime);           // Load time (ms)
console.log(result.challengeBypassed);  // Whether challenge was detected
```

### Session Management

```typescript
// Login
await renderUrlToHtml('https://site.com/login', {
  sessionId: 'user-123',
  wait: 3000
});

// Access protected content
const html = await renderUrlToHtml('https://site.com/protected', {
  sessionId: 'user-123'
});
```

### With QwkSearch Extract

```typescript
import { renderUrlToHtml } from '@/lib/scraper';
import * as QwkSearch from 'qwksearch-api-client';

// Render JavaScript content
const html = await renderUrlToHtml('https://spa-app.com/article', {
  blockImages: true,
  waitUntil: 'networkidle2'
});

// Extract structured content
const result = await QwkSearch.extractContent({
  query: { html, formatting: true }
});
```

## API Reference

### `renderUrlToHtml(url, options?, config?)`

Renders a URL and returns the HTML content.

**Parameters:**
- `url` (string): URL to render
- `options` (object, optional):
  - `blockImages` (boolean): Block image loading
  - `wait` (number): Additional wait time (ms)
  - `timeout` (number): Navigation timeout (ms)
  - `waitUntil` (string): Wait strategy
  - `bypassCaptcha` (boolean): Attempt challenge bypass
  - `sessionId` (string): Session ID for cookies
  - `headers` (object): Custom headers
  - `proxyUrl`, `proxyUser`, `proxyPass` (string): Proxy config
- `config` (object, optional):
  - `baseURL` (string): Scraper service URL
  - `apiKey` (string): API key

**Returns:** `Promise<string>` - Rendered HTML

### `renderUrlWithMetadata(url, options?, config?)`

Renders a URL and returns full metadata.

**Returns:** `Promise<ScraperJsonResponse>` - Object with:
- `html` (string): Rendered HTML
- `url` (string): Final URL after redirects
- `title` (string): Page title
- `cookies` (Array): Cookies set
- `challengeBypassed` (boolean): Challenge detection
- `retryCount` (number): Number of retries
- `loadTime` (number): Load time in milliseconds

### `renderWithCloudflare(options, config?)`

Advanced rendering with full control.

**Parameters:** Combined `options` object with `url` required.

**Returns:** `Promise<string | ScraperJsonResponse>`

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `url` | string | **required** | URL to render |
| `blockImages` | boolean | `false` | Block image loading |
| `wait` | number | `0` | Extra wait time (ms) |
| `timeout` | number | `30000` | Navigation timeout (ms) |
| `waitUntil` | string | `"networkidle2"` | Wait strategy |
| `bypassCaptcha` | boolean | `true` | Attempt bypass |
| `sessionId` | string | `"default"` | Session ID |
| `format` | string | `"html"` | Response format |
| `headers` | object | `{}` | Custom headers |
| `proxyUrl` | string | - | Proxy URL |
| `maxRetries` | number | `10` | Max bypass attempts |

### Wait Strategies

- `domcontentloaded` - Fastest, for static content
- `load` - Standard, waits for resources
- `networkidle2` - Balanced, minimal network activity
- `networkidle0` - Complete, full network silence

## When to Use

### Use This Scraper When:
✅ Page requires JavaScript execution  
✅ Site uses bot detection (Cloudflare, etc.)  
✅ Content loads dynamically (AJAX/fetch)  
✅ Need session state across requests  
✅ `extract_page` returns incomplete content

### Use QwkSearch Extract When:
✅ Server-rendered HTML  
✅ No JavaScript required  
✅ Speed is critical  
✅ Cost optimization

## Cost Optimization

Cloudflare charges ~$0.50 per 1,000 requests.

**Tips:**
1. Use `blockImages: true` (faster = cheaper)
2. Set appropriate timeouts
3. Use `domcontentloaded` when possible
4. Prefer `extract_page` for simple sites
5. Implement caching at application level

## Troubleshooting

### "Invalid or missing API key"

Set the API key in environment variables:

```bash
SCRAPER_API_KEY=your-api-key-here
```

### "Browser timeout"

Increase timeout or use faster wait strategy:

```typescript
await renderUrlToHtml(url, {
  timeout: 60000,
  waitUntil: 'domcontentloaded'
});
```

### "Challenge not bypassed"

1. Ensure `bypassCaptcha: true`
2. Increase `maxRetries`
3. Set `TWO_CAPTCHA_KEY` on the Worker
4. Check Worker logs: `wrangler tail`

## Documentation

- [Integration Guide](../../../../docs/SCRAPER_CLOUDFLARE_INTEGRATION.md) - Full documentation
- [Quick Start](../../../../packages/render-url-to-html/scraper-cloudflare/QUICKSTART.md) - Deployment guide
- [Examples](./EXAMPLES.md) - Code examples
- [scraper-cloudflare](../../../../packages/render-url-to-html/scraper-cloudflare/) - Source code

## Deployment

Deploy the scraper service:

```bash
cd packages/render-url-to-html/scraper-cloudflare
wrangler secret put SCRAPER_API_KEY
wrangler deploy
```

Update environment variables:

```bash
SCRAPER_URL=https://scraper-cloudflare.your-subdomain.workers.dev
SCRAPER_API_KEY=your-api-key
```

## AI Agent Integration

The AI agent can automatically use the `render_page_with_javascript` tool.  
No manual configuration needed.

## License

Same as main project license.
