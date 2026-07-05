# Cloudflare Scraper Integration

This document describes the integration of the Cloudflare Puppeteer-based scraper service into qwksearch-web.

## Overview

The scraper-cloudflare package provides advanced web page rendering capabilities using Cloudflare Browser Rendering (Puppeteer). It's designed to handle:

- **JavaScript-heavy sites**: SPAs, React apps, and dynamic content
- **Bot protection bypass**: Cloudflare challenges, reCAPTCHA, Turnstile
- **Session management**: Cookie persistence across requests
- **Performance optimization**: Image blocking, smart wait strategies
- **Proxy support**: For geographic restrictions or rate limiting

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    qwksearch-web (Next.js)                  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │         Agent Toolkit (Tools)                         │ │
│  │  - render_page_with_javascript                        │ │
│  │  - extract_page (existing)                            │ │
│  │  - web_search (existing)                              │ │
│  └───────────────────────────────────────────────────────┘ │
│                          ↓                                  │
│  ┌───────────────────────────────────────────────────────┐ │
│  │    lib/scraper/cloudflare-scraper-client.ts          │ │
│  │  - renderWithCloudflare()                             │ │
│  │  - renderUrlToHtml()                                  │ │
│  │  - renderUrlWithMetadata()                            │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                           ↓ HTTP API
┌─────────────────────────────────────────────────────────────┐
│        Cloudflare Worker (scraper-cloudflare)               │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  scraper-cloudflare.ts (Main Entry)                   │ │
│  │  - Authentication                                      │ │
│  │  - Request routing                                     │ │
│  │  - Swagger UI                                          │ │
│  └───────────────────────────────────────────────────────┘ │
│                          ↓                                  │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  BrowserDurableObject (browser-durable-object.ts)     │ │
│  │  - Persistent Puppeteer browser                       │ │
│  │  - Page rendering with stealth evasions               │ │
│  │  - Challenge detection & bypass                       │ │
│  │  - Cookie management                                   │ │
│  └───────────────────────────────────────────────────────┘ │
│                          ↓                                  │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  Cloudflare Browser Rendering (@cloudflare/puppeteer) │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Package Structure

### scraper-cloudflare (packages/render-url-to-html/scraper-cloudflare/)

- **scraper-cloudflare.ts**: Main Worker entry point with authentication and routing
- **browser-durable-object.ts**: Durable Object managing the Puppeteer browser lifecycle
- **scraper-utils.ts**: Request parsing and authentication utilities
- **scraper-stealth.ts**: Browser fingerprinting evasion techniques
- **scraper-captcha.ts**: CAPTCHA and challenge detection/solving logic
- **scraper-openapi.ts**: OpenAPI/Swagger documentation endpoints

### qwksearch-web Integration

- **lib/scraper/cloudflare-scraper-client.ts**: Client library for calling the scraper service
- **packages/agent-toolkit/src/tools/qwksearch-api-tools.ts**: Agent tool implementation

## Usage

### From Agent Toolkit

The AI agent can use the `render_page_with_javascript` tool:

```typescript
{
  name: "render_page_with_javascript",
  description: "Render a web page with JavaScript execution...",
  schema: z.object({
    url: z.string().url(),
    blockImages: z.boolean().optional().default(true),
    wait: z.number().min(0).max(10000).optional().default(0),
    timeout: z.number().optional().default(30000),
    waitUntil: z.enum(["domcontentloaded", "load", "networkidle0", "networkidle2"]),
    bypassCaptcha: z.boolean().optional().default(true),
    sessionId: z.string().optional().default("default"),
    format: z.enum(["html", "json"]).optional().default("html")
  })
}
```

### From Application Code

Use the client library directly:

```typescript
import { renderUrlToHtml, renderUrlWithMetadata } from '@/lib/scraper/cloudflare-scraper-client';

// Simple HTML rendering
const html = await renderUrlToHtml('https://example.com', {
  blockImages: true,
  bypassCaptcha: true
});

// Full metadata response
const result = await renderUrlWithMetadata('https://example.com', {
  timeout: 45000,
  waitUntil: 'networkidle2'
});

console.log(result.html);        // Rendered HTML
console.log(result.title);       // Page title
console.log(result.cookies);     // Cookies set
console.log(result.loadTime);    // Load time in ms
console.log(result.challengeBypassed);  // Whether challenge was detected
```

## Configuration

### Environment Variables

Set these in your environment or `.env` file:

```bash
# Scraper service endpoint
SCRAPER_URL=https://scraper.qwksearch.workers.dev

# API key for authentication (optional)
SCRAPER_API_KEY=your-api-key-here

# Additional scraper service env vars (set on the Worker)
PROXY_URL=http://proxy.example.com:8080
PROXY_USER=username
PROXY_PASS=password
TWO_CAPTCHA_KEY=your-2captcha-key
CHALLENGE_MATCH=custom-challenge-pattern
```

### Deploying the Scraper Worker

The scraper is deployed as a separate Cloudflare Worker with Browser Rendering enabled.

#### Prerequisites

1. Cloudflare account with Workers Paid plan (for Browser Rendering)
2. Wrangler CLI installed: `npm install -g wrangler`

#### Deployment Steps

```bash
cd packages/render-url-to-html/scraper-cloudflare

# Create wrangler.toml
cat > wrangler.toml << EOF
name = "scraper-cloudflare"
main = "scraper-cloudflare.ts"
compatibility_date = "2024-01-01"

browser = { binding = "MYBROWSER" }

[[durable_objects.bindings]]
name = "BROWSER_DO"
class_name = "BrowserDurableObject"
script_name = "scraper-cloudflare"

[[migrations]]
tag = "v1"
new_classes = ["BrowserDurableObject"]
EOF

# Set secrets
wrangler secret put SCRAPER_API_KEY
wrangler secret put PROXY_USER      # optional
wrangler secret put PROXY_PASS      # optional
wrangler secret put TWO_CAPTCHA_KEY # optional

# Deploy
wrangler deploy
```

## Features

### Stealth Evasions

The scraper applies multiple techniques to avoid bot detection:

- WebDriver property hiding
- Permissions API spoofing
- Chrome runtime masking
- Plugin array modifications
- Navigator property overrides
- Canvas fingerprinting prevention
- WebGL fingerprinting mitigation

### Challenge Bypass

Automatic detection and handling of:

- Cloudflare bot challenges
- Turnstile CAPTCHAs
- reCAPTCHA v2/v3
- Custom challenge pages

With optional 2Captcha integration for automated solving.

### Session Management

Cookies are persisted per `sessionId`:

```typescript
// Login flow
await renderUrlToHtml('https://site.com/login', {
  sessionId: 'user-123'
});

// Subsequent authenticated requests
await renderUrlToHtml('https://site.com/protected', {
  sessionId: 'user-123'
});
```

### Performance Optimization

- **Image blocking**: Reduces bandwidth and load time
- **Browser reuse**: Durable Object keeps browser alive for 5 minutes
- **Smart wait strategies**: Choose based on page type
  - `domcontentloaded`: Fast, for static content
  - `networkidle2`: Balanced, for most sites
  - `networkidle0`: Complete, for heavy JS sites

## API Reference

### POST /api/render

Render a web page with full browser support.

**Request Body:**

```json
{
  "url": "https://example.com",
  "blockImages": true,
  "wait": 1000,
  "timeout": 30000,
  "waitUntil": "networkidle2",
  "sessionId": "default",
  "format": "json",
  "bypassCaptcha": true,
  "maxRetries": 10,
  "headers": {
    "X-Custom-Header": "value"
  },
  "proxyUrl": "http://proxy.example.com:8080",
  "proxyUser": "username",
  "proxyPass": "password"
}
```

**Response (format=html):**

```html
<!DOCTYPE html>
<html>
<head>
  <base href='https://example.com/'>
  <title>Example Domain</title>
</head>
<body>...</body>
</html>
```

**Response (format=json):**

```json
{
  "html": "<!DOCTYPE html>...",
  "url": "https://example.com",
  "title": "Example Domain",
  "cookies": [
    {
      "name": "session",
      "value": "abc123",
      "domain": ".example.com",
      "path": "/",
      "expires": 1735689600,
      "httpOnly": true,
      "secure": true,
      "sameSite": "Lax"
    }
  ],
  "challengeBypassed": false,
  "retryCount": 0,
  "loadTime": 2341
}
```

### GET /swagger

Interactive API documentation.

### GET /api/openapi.json

OpenAPI 3.0 specification.

## When to Use

### Use scraper-cloudflare when:

- ✅ Page requires JavaScript execution
- ✅ Site uses bot detection (Cloudflare, etc.)
- ✅ Content is loaded dynamically via AJAX/fetch
- ✅ Need to maintain session state across requests
- ✅ extract_page returns incomplete content

### Use extract_page when:

- ✅ Page is server-rendered HTML
- ✅ No JavaScript required
- ✅ Speed is critical
- ✅ Cost optimization (extract_page is cheaper)

## Cost Considerations

Cloudflare Browser Rendering pricing (as of 2024):

- **Free tier**: Not available for Browser Rendering
- **Paid plan**: ~$0.50 per 1,000 requests
- **CPU time**: Billed per second of browser execution

To minimize costs:

1. Use `blockImages: true` for faster rendering
2. Set appropriate `timeout` values
3. Use `waitUntil: 'domcontentloaded'` when possible
4. Prefer `extract_page` for simple sites
5. Implement caching at the application level

## Troubleshooting

### "Invalid or missing API key"

Set `SCRAPER_API_KEY` in the Worker environment and pass it in requests:

```typescript
await renderUrlToHtml(url, {
  scraperApiKey: process.env.SCRAPER_API_KEY
});
```

### "Browser timeout"

Increase the timeout or use a more aggressive wait strategy:

```typescript
await renderUrlToHtml(url, {
  timeout: 60000,
  waitUntil: 'domcontentloaded'
});
```

### "Challenge not bypassed"

The automatic bypass may have failed. Check:

1. Is `bypassCaptcha: true` set?
2. Is `TWO_CAPTCHA_KEY` configured?
3. Try increasing `maxRetries`
4. Check Worker logs for detailed errors

### "Proxy authentication failed"

Verify proxy credentials and format:

```typescript
await renderUrlToHtml(url, {
  proxyUrl: 'http://proxy.example.com:8080',
  proxyUser: 'username',
  proxyPass: 'password'
});
```

## Examples

### Scraping a JavaScript-heavy SPA

```typescript
const html = await renderUrlToHtml('https://react-app.com', {
  waitUntil: 'networkidle2',
  timeout: 45000,
  blockImages: true
});
```

### Bypassing Cloudflare Protection

```typescript
const result = await renderUrlWithMetadata('https://protected-site.com', {
  bypassCaptcha: true,
  maxRetries: 15,
  wait: 2000  // Extra wait after challenge
});

if (result.challengeBypassed) {
  console.log(`Bypassed after ${result.retryCount} attempts`);
}
```

### Authenticated Scraping

```typescript
// Step 1: Login
await renderUrlToHtml('https://site.com/login', {
  sessionId: 'user-session-123',
  wait: 3000  // Wait for redirect
});

// Step 2: Access protected content
const html = await renderUrlToHtml('https://site.com/dashboard', {
  sessionId: 'user-session-123'
});
```

### Using with QwkSearch Extract

Combine rendering with content extraction:

```typescript
import { renderUrlToHtml } from '@/lib/scraper/cloudflare-scraper-client';
import * as QwkSearch from 'qwksearch-api-client';

// Render JavaScript content
const html = await renderUrlToHtml('https://spa-app.com/article', {
  blockImages: true,
  waitUntil: 'networkidle2'
});

// Extract structured content
const result = await QwkSearch.extractContent({
  query: {
    html,  // Pass rendered HTML directly
    formatting: true,
    absoluteURLs: true
  }
});

console.log(result.data.title);
console.log(result.data.html);  // Cleaned content
```

## Future Enhancements

Potential improvements to consider:

1. **Screenshot capture**: Add support for generating page screenshots
2. **PDF generation**: Render pages to PDF format
3. **Mobile rendering**: Device emulation with viewport settings
4. **Request interception**: Block specific resource types or domains
5. **Custom JavaScript injection**: Execute custom scripts on the page
6. **HAR export**: Capture full network waterfall data
7. **Performance metrics**: Return Lighthouse-style metrics

## References

- [Cloudflare Browser Rendering Docs](https://developers.cloudflare.com/browser-rendering/)
- [Puppeteer API](https://pptr.dev/)
- [scraper-cloudflare README](../packages/render-url-to-html/scraper-cloudflare/readme.md)
- [QwkSearch API Client](https://www.npmjs.com/package/qwksearch-api-client)
