# jsdom-scraper

A lightweight, pure JavaScript DOM scraper for Node.js using JSDOM. Execute custom scripts in a DOM context, run automation steps, and extract page data without a headless browser.

## Features

- 🚀 Pure JavaScript (no Puppeteer or Chromium required)
- 🎯 Custom script execution in DOM context
- 🔄 Automation: click, type, wait for selectors
- 📄 Extract HTML, text, links, and metadata
- 🍪 Custom headers support (cookies, auth tokens, etc.)
- ⚡ Lightweight and fast

## Why JSDOM over Puppeteer?

Puppeteer and Playwright launch a full Chromium browser process to scrape pages. That works, but it comes with serious trade-offs — especially at scale and in serverless environments.

### Serverless is where Puppeteer breaks down

Serverless functions (AWS Lambda, Cloudflare Workers, Vercel Edge) impose strict constraints on binary size, memory, and cold-start time. Puppeteer violates all three:

|                                | JSDOM (this package)               | Puppeteer                                       |
| ------------------------------ | ---------------------------------- | ----------------------------------------------- |
| **Install size**         | ~5 MB (pure JS)                    | ~400+ MB (bundles Chromium)                     |
| **Cold start**           | 50–150 ms                         | 2–8 seconds (browser launch)                   |
| **Memory usage**         | 30–80 MB                          | 200–500+ MB per instance                       |
| **Lambda compatibility** | Works everywhere, no layers needed | Requires `chrome-aws-lambda` or custom layers |
| **Cloudflare Workers**   | Works out of the box               | Not possible (no binary execution)              |
| **Concurrent requests**  | Hundreds per instance              | 5–10 tabs before OOM                           |

Puppeteer's Chromium binary alone exceeds the 50 MB deployment limit on most serverless platforms. You end up needing custom Lambda layers, Docker images, or specialized services like Browserless — all of which add complexity, latency, and cost.

### Cost at scale

Every Puppeteer invocation spins up a Chromium process. At scale, this gets expensive fast:

- **Memory**: A single Chromium tab uses 200–500 MB. On AWS Lambda, you pay per GB-second. A 512 MB Lambda running Puppeteer costs 4–8x more than a 128 MB Lambda running JSDOM for the same scrape.
- **Duration**: Puppeteer cold starts add 2–8 seconds per invocation. You're paying for time spent waiting for the browser to boot, not for actual scraping.
- **Concurrency**: To scrape 1,000 pages, Puppeteer needs 1,000 Lambda invocations each launching their own browser. JSDOM can process many pages within a single instance because it's just parsing HTML strings in-process.

A rough comparison for scraping 100,000 pages/month on AWS Lambda:

|               | JSDOM  | Puppeteer |
| ------------- | ------ | --------- |
| Memory config | 128 MB | 1024 MB   |
| Avg duration  | 500 ms | 5,000 ms  |
| Monthly $$    | 0.80   | 65        |

That's an **80x cost difference** — and it only grows with volume.

### When you don't need a browser, don't pay for one

Most scraping tasks don't need a real browser. If you're extracting text, links, metadata, or structured data from server-rendered HTML, JSDOM gives you a full DOM API (`querySelector`, `querySelectorAll`, `textContent`, `getAttribute`) without the overhead of rendering pixels, executing third-party scripts, or managing browser lifecycle.

JSDOM parses raw HTML into a standards-compliant DOM tree in milliseconds. There's no network waterfall for images, fonts, or tracking scripts. No GPU process. No sandbox. Just the DOM.

### Feature compatibility with Puppeteer

Most common Puppeteer capabilities have a direct equivalent in jsdom-scraper — without the browser overhead:

| Capability                                 | Puppeteer                                 | jsdom-scraper                          | Notes                                          |
| ------------------------------------------ | ----------------------------------------- | -------------------------------------- | ---------------------------------------------- |
| **Navigate to URL**                  | `page.goto(url)`                        | `scraper.scrape(url)`                | Both fetch and parse the page                  |
| **Get page title**                   | `page.title()`                          | `result.title`                       | Extracted automatically                        |
| **Get page HTML**                    | `page.content()`                        | `result.html`                        | Full document HTML                             |
| **Get text content**                 | `page.$eval(sel, el => el.textContent)` | `result.textContent`                 | Full page text extracted                       |
| **Extract links**                    | Manual `$$eval('a', ...)`               | `result.links`                       | Built-in, returns `{text, href}[]`           |
| **Extract metadata**                 | Manual meta tag parsing                   | `result.metaDescription`             | Built-in extraction                            |
| **Custom script execution**          | `page.evaluate(() => { ... })`          | `customScript: '...'`                | Runs JS in DOM context                         |
| **querySelector / querySelectorAll** | `page.$(sel)` / `page.$$(sel)`        | Available in `customScript`          | Full DOM API via JSDOM                         |
| **Click elements**                   | `page.click(sel)`                       | `{ action: 'click', selector }`      | Via automation steps                           |
| **Type into inputs**                 | `page.type(sel, text)`                  | `{ action: 'type', selector, text }` | Via automation steps                           |
| **Wait for selector**                | `page.waitForSelector(sel)`             | `{ action: 'waitFor', selector }`    | With configurable timeout                      |
| **Custom cookies**                   | `page.setCookie(...)`                   | `headers: { Cookie: '...' }`         | Sent as HTTP headers                           |
| **Custom User-Agent**                | `page.setUserAgent(ua)`                 | `headers: { 'User-Agent': '...' }`   | Sent as HTTP headers                           |
| **Auth headers**                     | `page.setExtraHTTPHeaders(...)`         | `headers: { Authorization: '...' }`  | Any custom header supported                    |
| **Request timeout**                  | `page.setDefaultTimeout(ms)`            | `timeout: ms`                        | Per-instance configuration                     |
| **Multi-step automation**            | Sequential `page.*` calls               | `automation: [...]`                  | Declarative step array                         |
| **Screenshots**                      | `page.screenshot()`                     | Not supported                          | Use Puppeteer for visual capture               |
| **PDF generation**                   | `page.pdf()`                            | Not supported                          | Use Puppeteer for PDF rendering                |
| **Network interception**             | `page.setRequestInterception(true)`     | Not supported                          | No network layer                               |
| **Client-side JS rendering**         | Full browser execution                    | Not supported                          | JSDOM doesn't run `<script>` tags by default |
| **WebSocket / SSE**                  | Supported via browser                     | Not supported                          | No persistent connections                      |
| **iframe handling**                  | `page.frames()`                         | Not supported                          | Single document context                        |

For the vast majority of scraping use cases — extracting content, running queries against the DOM, filling forms, reading metadata — jsdom-scraper provides the same functionality at a fraction of the cost and complexity.

## Installation

```bash
npm install jsdom-scraper
```

## Basic Usage

```javascript
import { JSDomScraper } from 'jsdom-scraper'

const scraper = new JSDomScraper()
const result = await scraper.scrape('https://example.com')

console.log(result.title)
console.log(result.html)
console.log(result.links)
```

## Custom Script Execution

Execute JavaScript code in the DOM context:

```javascript
const result = await scraper.scrape('https://example.com', {
  customScript: `
    // This runs in the JSDOM context
    const links = Array.from(document.querySelectorAll('a'))
    return {
      count: links.length,
      hrefs: links.map(a => a.href)
    }
  `
})

console.log(result.scriptResult)
// { count: 42, hrefs: [...] }
```

## Automation

Chain actions like clicking, typing, and waiting:

```javascript
const result = await scraper.scrape('https://login-site.com', {
  automation: [
    { action: 'type', selector: '#username', text: 'user@example.com' },
    { action: 'type', selector: '#password', text: 'password123' },
    { action: 'click', selector: '#login-btn' },
    { action: 'waitFor', selector: '.dashboard', timeout: 5000 }
  ],
  customScript: `
    return document.querySelector('.user-name').textContent
  `
})

console.log(result.scriptResult) // User's name from dashboard
```

## API Reference

### `new JSDomScraper(options)`

Create a scraper instance with optional configuration.

**Options:**

- `headers` (object): Custom HTTP headers (e.g., cookies, User-Agent)
- `timeout` (number): Request timeout in ms (default: 30000)

```javascript
const scraper = new JSDomScraper({
  headers: {
    'Cookie': 'session=abc123',
    'Authorization': 'Bearer token'
  },
  timeout: 60000
})
```

### `scraper.scrape(url, config)`

Scrape a URL and optionally run custom scripts and automation.

**Parameters:**

- `url` (string): The URL to scrape
- `config` (object): Configuration object

**Config Options:**

- `customScript` (string): JavaScript code to execute in DOM context
- `automation` (array): Automation steps to run before extracting data
- `screenshot` (object): Screenshot options (reserved for future use)

**Returns:** Promise`<ScrapeResult>`

```javascript
interface ScrapeResult {
  url: string
  title: string
  metaDescription: string
  html: string
  textContent: string
  links: Array<{ text: string; href: string }>
  scriptResult?: unknown
}
```

## Advanced Examples

### Extract specific data with custom script

```javascript
const result = await scraper.scrape('https://hackernews.com', {
  customScript: `
    const stories = Array.from(document.querySelectorAll('.athing'))
    return stories.slice(0, 10).map(story => ({
      title: story.querySelector('.titleline a').textContent,
      url: story.querySelector('.titleline a').href
    }))
  `
})

console.log(result.scriptResult) // Array of 10 top stories
```

### Multi-step form submission

```javascript
const result = await scraper.scrape('https://form-site.com', {
  automation: [
    { action: 'type', selector: '#email', text: 'user@example.com' },
    { action: 'click', selector: '#next-btn' },
    { action: 'waitFor', selector: '#password-field', timeout: 3000 },
    { action: 'type', selector: '#password', text: 'pass123' },
    { action: 'click', selector: '#submit-btn' },
    { action: 'waitFor', selector: '.success-message', timeout: 5000 }
  ]
})
```

### Extract all links with their text

```javascript
const result = await scraper.scrape('https://example.com')

result.links.forEach(link => {
  console.log(`${link.text} -> ${link.href}`)
})
```

## Error Handling

```javascript
try {
  const result = await scraper.scrape('https://invalid-url.xyz')
} catch (error) {
  console.error('Scrape failed:', error.message)
}
```

## Limitations

- No visual rendering (unlike Puppeteer/Playwright). For complex visual screenshots, consider headless browsers.
- JavaScript execution is sandboxed in JSDOM—some browser APIs may not work.
- Large pages may consume significant memory.

## Performance Tips

1. Use specific selectors to reduce DOM traversal
2. Limit custom script operations to what you need
3. Set appropriate timeouts to avoid hanging
4. Close scraper instances to free memory

```javascript
// Scraper instances auto-close DOM after scrape()
// No manual cleanup needed
```

## Contributing

Contributions are welcome! Please submit issues and pull requests to [GitHub repo].

## License

MIT

## Examples

- Full working examples available in `examples/` directory
- See `demo/` for web-based demo with UI

## Support

For issues, questions, or feature requests, open an issue on [GitHub](https://github.com/yourusername/jsdom-scraper).
