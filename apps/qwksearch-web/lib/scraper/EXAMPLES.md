# Cloudflare Scraper Usage Examples

This file contains practical examples of using the Cloudflare scraper integration in qwksearch-web.

## Table of Contents

- [Basic Usage](#basic-usage)
- [Advanced Options](#advanced-options)
- [Session Management](#session-management)
- [Challenge Bypass](#challenge-bypass)
- [Integration with QwkSearch API](#integration-with-qwksearch-api)
- [Error Handling](#error-handling)
- [Performance Optimization](#performance-optimization)

## Basic Usage

### Simple HTML Rendering

```typescript
import { renderUrlToHtml } from '@/lib/scraper';

async function scrapeWebsite() {
  try {
    const html = await renderUrlToHtml('https://example.com');
    console.log(html);
  } catch (error) {
    console.error('Scraping failed:', error);
  }
}
```

### Get Full Metadata

```typescript
import { renderUrlWithMetadata } from '@/lib/scraper';

async function scrapeWithMetadata() {
  const result = await renderUrlWithMetadata('https://example.com');
  
  console.log('Page Title:', result.title);
  console.log('Final URL:', result.url);
  console.log('Load Time:', result.loadTime, 'ms');
  console.log('Cookies:', result.cookies);
  console.log('Challenge Bypassed:', result.challengeBypassed);
  
  return result.html;
}
```

## Advanced Options

### JavaScript-Heavy SPA

For React, Vue, Angular apps that load content dynamically:

```typescript
import { renderUrlToHtml } from '@/lib/scraper';

async function scrapeSPA() {
  const html = await renderUrlToHtml('https://react-app.com/dashboard', {
    // Wait for network to be mostly idle
    waitUntil: 'networkidle2',
    
    // Block images to speed up rendering
    blockImages: true,
    
    // Allow more time for async content
    timeout: 45000,
    
    // Additional wait after page load
    wait: 2000
  });
  
  return html;
}
```

### Custom Headers and Proxy

```typescript
import { renderWithCloudflare } from '@/lib/scraper';

async function scrapeWithProxy() {
  const result = await renderWithCloudflare({
    url: 'https://geo-restricted-site.com',
    
    // Custom headers
    headers: {
      'X-API-Key': 'your-api-key',
      'Accept-Language': 'en-US,en;q=0.9'
    },
    
    // Proxy configuration
    proxyUrl: 'http://proxy.example.com:8080',
    proxyUser: 'username',
    proxyPass: 'password',
    
    // Return structured data
    format: 'json'
  });
  
  return result;
}
```

### Optimize for Speed

```typescript
import { renderUrlToHtml } from '@/lib/scraper';

async function fastScrape() {
  const html = await renderUrlToHtml('https://blog-site.com/article', {
    // Fastest wait strategy
    waitUntil: 'domcontentloaded',
    
    // Block images
    blockImages: true,
    
    // Short timeout
    timeout: 15000,
    
    // No additional wait
    wait: 0
  });
  
  return html;
}
```

## Session Management

### Login Flow

```typescript
import { renderUrlToHtml } from '@/lib/scraper';

async function loginAndScrape(userId: string) {
  const sessionId = `user-session-${userId}`;
  
  // Step 1: Render login page
  // Cookies will be saved automatically
  await renderUrlToHtml('https://example.com/login', {
    sessionId,
    wait: 3000  // Wait for redirect after login
  });
  
  // Step 2: Access protected content
  // Saved cookies are automatically loaded
  const dashboardHtml = await renderUrlToHtml('https://example.com/dashboard', {
    sessionId
  });
  
  // Step 3: Scrape additional pages with same session
  const profileHtml = await renderUrlToHtml('https://example.com/profile', {
    sessionId
  });
  
  return { dashboardHtml, profileHtml };
}
```

### Multi-Page Scraping with Session

```typescript
import { renderUrlWithMetadata } from '@/lib/scraper';

async function scrapeMultiplePages(urls: string[], sessionId: string) {
  const results = [];
  
  for (const url of urls) {
    const result = await renderUrlWithMetadata(url, {
      sessionId,
      blockImages: true,
      timeout: 30000
    });
    
    results.push({
      url: result.url,
      title: result.title,
      html: result.html,
      loadTime: result.loadTime
    });
    
    // Be respectful, add delay between requests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  return results;
}
```

## Challenge Bypass

### Cloudflare Protection

```typescript
import { renderUrlWithMetadata } from '@/lib/scraper';

async function bypassCloudflare() {
  const result = await renderUrlWithMetadata('https://cloudflare-protected.com', {
    // Enable challenge bypass
    bypassCaptcha: true,
    
    // Increase retry attempts
    maxRetries: 15,
    
    // Wait after bypass
    wait: 3000,
    
    // More time for challenge solving
    timeout: 60000
  });
  
  if (result.challengeBypassed) {
    console.log(`✅ Bypassed challenge after ${result.retryCount} attempts`);
  }
  
  return result.html;
}
```

### With 2Captcha Integration

```typescript
import { renderUrlToHtml } from '@/lib/scraper';

async function bypassWithCaptchaSolver() {
  const html = await renderUrlToHtml('https://captcha-protected.com', {
    bypassCaptcha: true,
    
    // Provide 2Captcha API key
    twoCaptchaKey: process.env.TWO_CAPTCHA_KEY,
    
    // Allow more retries with solver
    maxRetries: 20,
    
    // Longer timeout for solving
    timeout: 90000
  });
  
  return html;
}
```

## Integration with QwkSearch API

### Render + Extract Pipeline

Combine browser rendering with content extraction:

```typescript
import { renderUrlToHtml } from '@/lib/scraper';
import * as QwkSearch from 'qwksearch-api-client';

async function renderAndExtract(url: string) {
  // Step 1: Render with browser
  const renderedHtml = await renderUrlToHtml(url, {
    blockImages: true,
    waitUntil: 'networkidle2'
  });
  
  // Step 2: Extract structured content
  const extraction = await QwkSearch.extractContent({
    query: {
      html: renderedHtml,  // Pass rendered HTML
      formatting: true,
      absoluteURLs: true,
      images: true,
      links: true
    }
  });
  
  return {
    title: extraction.data.title,
    author: extraction.data.author,
    date: extraction.data.date,
    content: extraction.data.html,
    wordCount: extraction.data.word_count,
    citation: extraction.data.cite
  };
}
```

### Fallback Strategy

Try extract first, fallback to rendering if needed:

```typescript
import { renderUrlToHtml } from '@/lib/scraper';
import * as QwkSearch from 'qwksearch-api-client';

async function smartExtract(url: string) {
  try {
    // Try fast extraction first
    const result = await QwkSearch.extractContent({
      query: { url, timeout: 10 }
    });
    
    // Check if extraction was successful
    if (result.data?.html && result.data.html.length > 500) {
      console.log('✅ Fast extraction successful');
      return result.data;
    }
    
    console.log('⚠️  Extraction incomplete, trying render...');
    throw new Error('Incomplete extraction');
    
  } catch (error) {
    // Fallback to browser rendering
    console.log('🔄 Falling back to browser rendering');
    
    const html = await renderUrlToHtml(url, {
      blockImages: true,
      bypassCaptcha: true
    });
    
    // Extract from rendered HTML
    const result = await QwkSearch.extractContent({
      query: { html }
    });
    
    return result.data;
  }
}
```

### Batch Processing

```typescript
import { renderUrlToHtml } from '@/lib/scraper';
import * as QwkSearch from 'qwksearch-api-client';

async function batchRenderAndExtract(urls: string[]) {
  const results = [];
  
  for (const url of urls) {
    try {
      // Render
      const html = await renderUrlToHtml(url, {
        blockImages: true,
        timeout: 30000
      });
      
      // Extract
      const extraction = await QwkSearch.extractContent({
        query: { html }
      });
      
      results.push({
        url,
        success: true,
        data: extraction.data
      });
      
    } catch (error) {
      results.push({
        url,
        success: false,
        error: error.message
      });
    }
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  return results;
}
```

## Error Handling

### Comprehensive Error Handling

```typescript
import { renderUrlWithMetadata } from '@/lib/scraper';

async function robustScrape(url: string) {
  const maxAttempts = 3;
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`Attempt ${attempt}/${maxAttempts}...`);
      
      const result = await renderUrlWithMetadata(url, {
        timeout: 30000,
        bypassCaptcha: true
      });
      
      // Validate result
      if (!result.html || result.html.length < 100) {
        throw new Error('Received empty or invalid HTML');
      }
      
      console.log('✅ Success!');
      return result;
      
    } catch (error) {
      lastError = error as Error;
      console.error(`❌ Attempt ${attempt} failed:`, error.message);
      
      if (attempt < maxAttempts) {
        // Exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`⏳ Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw new Error(`Failed after ${maxAttempts} attempts: ${lastError?.message}`);
}
```

### Timeout Handling

```typescript
import { renderUrlToHtml } from '@/lib/scraper';

async function scrapeWithTimeout(url: string, maxTime: number = 45000) {
  const controller = new AbortController();
  
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, maxTime);
  
  try {
    const html = await renderUrlToHtml(url, {
      timeout: maxTime - 5000  // Leave buffer for network
    });
    
    clearTimeout(timeoutId);
    return html;
    
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      throw new Error(`Scraping timed out after ${maxTime}ms`);
    }
    
    throw error;
  }
}
```

## Performance Optimization

### Caching Implementation

```typescript
import { renderUrlToHtml } from '@/lib/scraper';

interface CacheEntry {
  html: string;
  timestamp: number;
}

class ScraperCache {
  private cache = new Map<string, CacheEntry>();
  private ttl = 5 * 60 * 1000; // 5 minutes
  
  async get(url: string): Promise<string> {
    const cached = this.cache.get(url);
    
    // Check if cached and not expired
    if (cached && Date.now() - cached.timestamp < this.ttl) {
      console.log('🎯 Cache hit for:', url);
      return cached.html;
    }
    
    // Cache miss or expired - fetch fresh
    console.log('🔄 Cache miss for:', url);
    const html = await renderUrlToHtml(url, {
      blockImages: true
    });
    
    this.cache.set(url, {
      html,
      timestamp: Date.now()
    });
    
    // Clean old entries
    this.cleanup();
    
    return html;
  }
  
  private cleanup() {
    const now = Date.now();
    for (const [url, entry] of this.cache.entries()) {
      if (now - entry.timestamp >= this.ttl) {
        this.cache.delete(url);
      }
    }
  }
}

// Usage
const cache = new ScraperCache();
const html = await cache.get('https://example.com');
```

### Parallel Scraping

```typescript
import { renderUrlToHtml } from '@/lib/scraper';

async function scrapeParallel(urls: string[]) {
  const promises = urls.map(url =>
    renderUrlToHtml(url, {
      blockImages: true,
      timeout: 30000
    })
    .then(html => ({ url, success: true, html }))
    .catch(error => ({ url, success: false, error: error.message }))
  );
  
  const results = await Promise.all(promises);
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ ${successful.length} succeeded, ❌ ${failed.length} failed`);
  
  return results;
}

// Usage with batching
async function scrapeLargeList(urls: string[], batchSize: number = 5) {
  const results = [];
  
  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    console.log(`Processing batch ${i / batchSize + 1}...`);
    
    const batchResults = await scrapeParallel(batch);
    results.push(...batchResults);
    
    // Rate limiting between batches
    if (i + batchSize < urls.length) {
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  
  return results;
}
```

### Cost Tracking

```typescript
import { renderUrlWithMetadata } from '@/lib/scraper';

class CostTracker {
  private requests = 0;
  private totalLoadTime = 0;
  private costPerThousand = 0.50; // $0.50 per 1000 requests
  
  async track(url: string, options = {}) {
    const startTime = Date.now();
    
    const result = await renderUrlWithMetadata(url, options);
    
    this.requests++;
    this.totalLoadTime += result.loadTime;
    
    const clientTime = Date.now() - startTime;
    
    console.log(`📊 Request ${this.requests}:`);
    console.log(`   Load time: ${result.loadTime}ms`);
    console.log(`   Total time: ${clientTime}ms`);
    console.log(`   Estimated cost: $${this.estimatedCost.toFixed(4)}`);
    
    return result;
  }
  
  get estimatedCost() {
    return (this.requests / 1000) * this.costPerThousand;
  }
  
  get averageLoadTime() {
    return this.requests > 0 ? this.totalLoadTime / this.requests : 0;
  }
  
  report() {
    console.log('\n📊 Scraping Report:');
    console.log(`   Total requests: ${this.requests}`);
    console.log(`   Avg load time: ${this.averageLoadTime.toFixed(0)}ms`);
    console.log(`   Estimated cost: $${this.estimatedCost.toFixed(4)}`);
  }
}

// Usage
const tracker = new CostTracker();
await tracker.track('https://example.com');
await tracker.track('https://another-site.com');
tracker.report();
```

## Next Steps

- Read [Integration Documentation](../../../../docs/SCRAPER_CLOUDFLARE_INTEGRATION.md)
- Check [Quick Start Guide](../../../../../packages/render-url-to-html/scraper-cloudflare/QUICKSTART.md)
- View [Client Source Code](../cloudflare-scraper-client.ts)
