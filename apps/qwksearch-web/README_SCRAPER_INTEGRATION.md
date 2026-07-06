# Scraper Integration - Article Extraction System

## Overview

The article extraction system in qwksearch-web has been successfully integrated with a 3-tier fallback architecture for robust content extraction from any website.

## Architecture

```
User Request → API Route → extractContent()
                              ↓
                          scrapeURL()
                              ↓
┌─────────────────────────────────────────────────────────┐
│  Tier 1: grab-url (Basic HTTP Fetch)                   │
│  - Fast, free, works for most server-rendered sites     │
│  - Handles: Static HTML, simple web pages               │
│  - Fails on: JS-heavy SPAs, bot protection              │
└─────────────────────────────────────────────────────────┘
                              ↓ (on error)
┌─────────────────────────────────────────────────────────┐
│  Tier 2: Cloudflare Puppeteer Scraper (Optional)       │
│  - Handles JavaScript rendering (React, Vue, Angular)   │
│  - Bypasses Cloudflare bot protection                   │
│  - Supports sessions, cookies, custom headers           │
│  - Requires: Cloudflare Workers Paid plan               │
└─────────────────────────────────────────────────────────┘
                              ↓ (on error)
┌─────────────────────────────────────────────────────────┐
│  Tier 3: JINA Reader API (Optional Fallback)           │
│  - Backup scraping service                              │
│  - Converts markdown to HTML                            │
│  - Requires: JINA API key (free tier available)         │
└─────────────────────────────────────────────────────────┘
                              ↓
                   extractContentAndCite()
                              ↓
                      Database Cache (SQLite/D1)
                              ↓
                       Return Article JSON
```

## Key Features

### 1. Intelligent Error Handling

- **Error Objects Detection**: Detects when HTTP libraries return error objects instead of throwing
- **Graceful Fallbacks**: Automatically tries next method if one fails
- **Clear Error Messages**: Provides actionable errors (e.g., "set SCRAPER_URL env var")

### 2. Database Caching

Articles are cached in SQLite (dev) / Cloudflare D1 (production):
- **First Request**: Extracts and caches article
- **Subsequent Requests**: Returns cached version instantly
- **Hit Tracking**: Tracks access count and last accessed time
- **Q&A History**: Stores questions/answers about each article

### 3. Optional Services

All scraping tiers work without configuration:
- **Tier 1 (grab-url)**: Always available (built-in)
- **Tier 2 (Cloudflare)**: Optional - skips if not configured
- **Tier 3 (JINA)**: Optional - skips if not configured

## Files Modified

### 1. [packages/extract-webpage/src/url-to-content/url-to-html.ts](../../packages/extract-webpage/src/url-to-content/url-to-html.ts)

**Changes:**
- `scrapeURL()`: Now throws errors instead of returning error objects
- `scrapeCloudflare()`: Made optional (checks for `SCRAPER_URL` env var)
- `scrapeJINA()`: Added API key support and authentication error detection
- Added validation to detect when `grab-url` returns error objects

**Key Logic:**
```typescript
// Check if grab returned error object instead of HTML
if (typeof html !== "string" || html.length === 0) {
  throw new Error("grab-url returned invalid data");
}
```

### 2. [packages/extract-webpage/src/url-to-content/url-to-content.ts](../../packages/extract-webpage/src/url-to-content/url-to-content.ts)

**Changes:**
- Wrapped `scrapeURL()` call in try-catch block
- Improved error logging with detailed context
- Returns proper error objects to API route

**Key Logic:**
```typescript
try {
  const html = await scrapeURL(url, { proxy });
  // ... process HTML
} catch (scrapeError) {
  return {
    error: `Failed to scrape URL: ${err?.message}`,
  };
}
```

### 3. [apps/qwksearch-web/.env](../../apps/qwksearch-web/.env)

**Added:**
```bash
# Cloudflare Browser Rendering (Scraper)
SCRAPER_URL=https://scraper.qwksearch.workers.dev
SCRAPER_API_KEY=

# JINA Reader API (optional)
JINA_API_KEY=
```

### 4. [apps/qwksearch-web/app/api/doc/article/route.ts](../../apps/qwksearch-web/app/api/doc/article/route.ts)

**Existing Features (No Changes Needed):**
- Database caching layer
- Hit count tracking
- Q&A history storage
- Error handling for extraction failures

## Testing

### Local Development Test

```bash
cd apps/qwksearch-web

# Start dev server
npm run dev

# Test article extraction API
curl "http://localhost:3000/api/doc/article?url=https://example.com" | jq

# Expected response:
{
  "cached": false,
  "article": {
    "url": "https://example.com",
    "title": "Example Domain",
    "html": "<h1>Example Domain</h1><p>This domain is for use in...</p>",
    "word_count": 107,
    "cite": "...",
    "followUpQuestions": [],
    "qaHistory": []
  }
}
```

### Test Fallback Chain

```bash
# This will test all 3 tiers:
# 1. grab-url will likely fail (403/bot detection)
# 2. Cloudflare scraper will be skipped (not configured)
# 3. JINA will be attempted (requires API key)

curl "http://localhost:3000/api/doc/article?url=https://www.quora.com/What-is-AI" | jq
```

## Deployment

See [DEPLOYMENT_GUIDE.md](../../DEPLOYMENT_GUIDE.md) for full deployment instructions.

### Quick Deploy Cloudflare Scraper

```bash
cd packages/render-url-to-html/scraper-cloudflare

# Install and deploy
npm install
wrangler login
wrangler secret put SCRAPER_API_KEY  # Enter a secure key
wrangler deploy

# Update .env with the deployed URL
# SCRAPER_URL=https://scraper-cloudflare.your-subdomain.workers.dev
```

## Error Handling Examples

### Example 1: No Scraper Configured (Expected)

```
[scrapeURL] initial fetch failed, trying Cloudflare Puppeteer fallback
[scrapeCloudflare] SCRAPER_URL not configured, skipping
[scrapeURL] Cloudflare scraper failed, trying JINA fallback
[scrapeJINA] attempting JINA fallback
[scrapeJINA] JINA requires authentication
```

**Solution**: This is normal. Either:
1. Deploy Cloudflare scraper and set `SCRAPER_URL`, or
2. Add `JINA_API_KEY` to use JINA as fallback

### Example 2: Bot Detection

```
[scrapeURL] bot detection found, retrying with Cloudflare scraper
[scrapeCloudflare] Cloudflare scraper bypassed bot detection
[scrapeURL] Cloudflare scraper succeeded
```

**Result**: Article extracted successfully using Cloudflare scraper

### Example 3: All Methods Work

```
[scrapeURL] initial fetch succeeded with grab-url
```

**Result**: Fast extraction without needing scraper services

## Cost Optimization

### Current Caching Strategy

The system already implements caching at the database level:

```typescript
// Check cache first
const cached = await db
  .select()
  .from(articleCache)
  .where(eq(articleCache.url, url))
  .limit(1);

if (cached.length > 0 && cached[0].html) {
  // Return cached article (instant, free)
  return cached[0];
}

// Only extract if not cached
const article = await extractContent(url);
```

### Additional Optimizations

1. **Use Cloudflare scraper only when needed**:
   - grab-url tries first (free)
   - Cloudflare only used if grab-url fails
   - Most server-rendered sites work with grab-url

2. **Adjust cache TTL**:
   - Current: Never expires (cached forever)
   - Consider: Add `expiresAt` field for news articles

3. **Monitor usage**:
   ```bash
   cd packages/render-url-to-html/scraper-cloudflare
   wrangler tail  # Watch live requests
   ```

## Monitoring

### Application Logs

```bash
npm run dev

# Watch for extraction logs:
# [extractContent] input is URL { url: '...' }
# [scrapeURL] initial fetch failed, trying Cloudflare
# [scrapeCloudflare] Cloudflare scraper succeeded
# [extractContent] extractContentAndCite result
```

### Database Queries

```sql
-- Most accessed articles
SELECT url, title, hitCount, lastAccessed
FROM article_cache
ORDER BY hitCount DESC
LIMIT 10;

-- Recently cached articles
SELECT url, title, createdAt
FROM article_cache
ORDER BY createdAt DESC
LIMIT 10;

-- Cache hit rate (requires app-level metric tracking)
```

## API Reference

### GET /api/doc/article

Extract and cache article content.

**Query Parameters:**
- `url` (required): Article URL to extract

**Response:**
```typescript
{
  cached: boolean;          // True if returned from cache
  article: {
    url: string;
    title?: string;
    html?: string;          // Cleaned HTML content
    author?: string;
    author_cite?: string;
    date?: string;
    source?: string;
    word_count?: number;
    cite?: string;          // APA citation
    followUpQuestions?: string[];
    qaHistory?: Array<{
      question: string;
      answer: string;
    }>;
  };
}
```

**Error Response:**
```typescript
{
  error: string;           // Error message
  url: string;             // Original URL
  detail?: any;            // Additional error context
}
```

### POST /api/doc/article

Store Q&A data for cached article.

**Request Body:**
```typescript
{
  url: string;                    // Article URL
  question?: string;              // User question
  answer?: string;                // AI answer
  followUpQuestions?: string[];   // Suggested follow-ups
}
```

## Troubleshooting

See [DEPLOYMENT_GUIDE.md](../../DEPLOYMENT_GUIDE.md#troubleshooting) for detailed troubleshooting steps.

## Next Steps

1. ✅ **Integration Complete**: All code changes merged
2. ⏳ **Optional**: Deploy Cloudflare scraper for JS-heavy sites
3. ⏳ **Optional**: Add JINA API key for additional fallback
4. ⏳ **Monitoring**: Set up alerts for extraction failures
5. ⏳ **Optimization**: Tune cache TTL based on usage patterns

## Support

For issues or questions:
- Check application logs: `npm run dev`
- Review error messages for configuration hints
- See [DEPLOYMENT_GUIDE.md](../../DEPLOYMENT_GUIDE.md)
- Open an issue on GitHub
