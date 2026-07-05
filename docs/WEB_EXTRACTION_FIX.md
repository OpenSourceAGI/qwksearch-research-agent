# Web Extraction API Fix - Complete Documentation

## Summary

Fixed web extraction API functionality by correcting parameter passing to the QwkSearch API client and added comprehensive test coverage (44 tests).

## Problem Description

The web extraction tools (`extract_page`, `web_search`, `generate_ai_response`) were not working due to incorrect parameter passing to the QwkSearch API client.

### Root Cause

The tools were passing a `config` object parameter that the API client doesn't support:

```typescript
// ❌ INCORRECT - API client doesn't recognize 'config' parameter
await QwkSearch.extractContent({
  query: { url, images, links, ... },
  config: { baseURL, apiKey }
});
```

The `@hey-api/openapi-ts` generated client expects:
- `baseUrl` (not `baseURL`)
- `headers` object for authentication (not `apiKey` parameter)

## Solution Implemented

### 1. Fixed Parameter Passing

Changed all three tools to use correct parameter format:

```typescript
// ✅ CORRECT
const baseUrl = baseURL || QWKSEARCH_CONFIG.baseURL;
const headers = apiKey ? { 'x-api-key': apiKey } : undefined;

await QwkSearch.extractContent({
  query: { url, images, links, ... },
  baseUrl: baseUrl,
  ...(headers && { headers })
});
```

### 2. Updated Configuration

```typescript
// packages/agent-toolkit/src/tools/qwksearch-api-tools.ts

const QWKSEARCH_CONFIG = {
  baseURL: process?.env.QWKSEARCH_URL || 'https://app.qwksearch.com/api',
  apiKey: process?.env.QWKSEARCH_API_KEY || null,
};
```

### 3. Added Comprehensive Tests

Created 44 tests covering:
- Unit tests for all three tools
- Integration tests with realistic scenarios
- Error handling and edge cases
- Configuration options validation

## Files Modified

### Core Implementation
1. **`packages/agent-toolkit/src/tools/qwksearch-api-tools.ts`**
   - Fixed `web_search` tool (lines 36-54)
   - Fixed `extract_page` tool (lines 99-116)
   - Fixed `generate_ai_response` tool (lines 194-230)
   - Updated `QWKSEARCH_CONFIG.baseURL` (line 12)

2. **`packages/agent-toolkit/src/language-generation/generate-response.ts`**
   - Removed "ollama" from provider list (line 31)

### Test Files (New)
3. **`packages/agent-toolkit/test/qwksearch-tools.test.ts`**
   - 27 unit tests for tool functionality

4. **`packages/agent-toolkit/test/extraction-integration.test.ts`**
   - 17 integration tests for realistic scenarios

5. **`packages/agent-toolkit/test/README.md`**
   - Test documentation and guidelines

## Changes in Detail

### web_search Tool

**Before:**
```typescript
const config = {
  baseURL: baseURL || QWKSEARCH_CONFIG.baseURL,
  apiKey: apiKey || QWKSEARCH_CONFIG.apiKey
};

const result = await QwkSearch.searchWeb({
  query: { q, cat, recency, page, lang, public, timeout },
  config: config
});
```

**After:**
```typescript
const baseUrl = baseURL || QWKSEARCH_CONFIG.baseURL;
const headers = apiKey || QWKSEARCH_CONFIG.apiKey 
  ? { 'x-api-key': apiKey || QWKSEARCH_CONFIG.apiKey } 
  : undefined;

const result = await QwkSearch.searchWeb({
  query: { q, cat, recency, page, lang, public, timeout },
  baseUrl: baseUrl,
  ...(headers && { headers })
});
```

### extract_page Tool

Same pattern as `web_search` - replaced `config` object with `baseUrl` and `headers` parameters.

### generate_ai_response Tool

Same pattern applied to `writeLanguage` API call.

## Test Coverage

### Unit Tests (27 tests)

**Tool Registration (3 tests)**
- ✅ web_search tool is registered
- ✅ extract_page tool is registered
- ✅ generate_ai_response tool is registered

**web_search Tool (6 tests)**
- ✅ Schema validation for required parameters
- ✅ Default values are correct
- ✅ Calls API with correct parameters
- ✅ Handles empty search results
- ✅ Handles errors gracefully
- ✅ Passes custom baseURL and apiKey

**extract_page Tool (8 tests)**
- ✅ Schema validation (URL required, must be valid URL)
- ✅ Default values are correct
- ✅ Calls API with correct parameters
- ✅ Handles extraction with no data
- ✅ Handles extraction errors
- ✅ Passes custom baseURL and apiKey
- ✅ Handles partial article data
- ✅ Formats output correctly

**generate_ai_response Tool (7 tests)**
- ✅ Schema validation
- ✅ Default values are correct
- ✅ Calls API with correct parameters
- ✅ Handles response with extract data
- ✅ Handles generation errors
- ✅ Supports all agent types
- ✅ Supports all provider types

**Integration Tests (3 tests)**
- ✅ Constructs baseUrl correctly
- ✅ Constructs headers when apiKey provided
- ✅ Excludes headers when apiKey not provided

### Integration Tests (17 tests)

**Real-world Scenarios (6 tests)**
- ✅ News article with complete metadata
- ✅ Blog post with multiple authors
- ✅ Academic paper with organization author
- ✅ Article with more than two authors
- ✅ Article with images and formatting
- ✅ Minimal article without metadata

**Edge Cases (7 tests)**
- ✅ Very long articles (10,000+ words)
- ✅ Special characters in title
- ✅ Non-ASCII characters (French accents)
- ✅ URLs with query parameters
- ✅ Timeout errors
- ✅ 404 errors
- ✅ Network errors

**Configuration Options (4 tests)**
- ✅ Respects images=false option
- ✅ Respects links=false option
- ✅ Respects formatting=false option
- ✅ Respects custom timeout

## Test Results

```bash
$ npm test

 RUN  v4.1.9 /home/admin/Projects/qwksearch-research-agent/packages/agent-toolkit

 Test Files  2 passed (2)
      Tests  44 passed (44)
   Start at  22:07:25
   Duration  387ms
```

✅ **All 44 tests passing**

## API Client Details

The QwkSearch API client is auto-generated from OpenAPI specs using `@hey-api/openapi-ts`.

### Client Configuration

Generated client accepts these config options:
```typescript
interface Config {
  baseUrl?: string;           // Base API URL
  headers?: Record<string, string>;  // HTTP headers
  fetch?: typeof fetch;       // Custom fetch function
  parseAs?: string;           // Response parsing
  throwOnError?: boolean;     // Error handling
}
```

### Method Signatures

```typescript
// Search web
export const searchWeb = (options: Options<SearchWebData>) => 
  client.get({ url: '/search', ...options });

// Extract content
export const extractContent = (options: Options<ExtractContentData>) => 
  client.get({ url: '/extract', ...options });

// Generate AI response
export const writeLanguage = (options: Options<WriteLanguageData>) => 
  client.post({ url: '/write', ...options });
```

### Options Type

```typescript
type Options<TData> = {
  body?: unknown;
  query?: Record<string, unknown>;
  baseUrl?: string;
  headers?: Record<string, string>;
  client?: Client;  // Custom client instance
  meta?: Record<string, unknown>;
  // ... other config options
};
```

## Environment Variables

The tools support these environment variables:

```bash
# API endpoint URL
QWKSEARCH_URL=https://app.qwksearch.com/api

# API authentication key
QWKSEARCH_API_KEY=your-api-key-here
```

## Usage Examples

### Using extract_page Tool

```typescript
const extractPageTool = AGENT_TOOLS.find(t => t.name === 'extract_page');

// Basic usage
const result = await extractPageTool.func({
  url: 'https://example.com/article'
});

// With custom configuration
const result = await extractPageTool.func({
  url: 'https://example.com/article',
  images: true,
  links: true,
  formatting: true,
  absoluteURLs: true,
  timeout: 30,
  baseURL: 'https://custom-api.com',
  apiKey: 'custom-key'
});
```

### Using web_search Tool

```typescript
const webSearchTool = AGENT_TOOLS.find(t => t.name === 'web_search');

const result = await webSearchTool.func({
  query: 'artificial intelligence',
  category: 'general',
  recency: 'week',
  page: 1,
  language: 'en-US'
});
```

### Using generate_ai_response Tool

```typescript
const aiResponseTool = AGENT_TOOLS.find(t => t.name === 'generate_ai_response');

const result = await aiResponseTool.func({
  provider: 'groq',
  agent: 'summarize-bullets',
  article: 'Long article text...',
  temperature: 0.7
});
```

## Important Notes

### API Endpoint Configuration

The default base URL `https://app.qwksearch.com/api` is a placeholder. For the tools to work in production:

1. **Option 1: Use environment variable**
   ```bash
   export QWKSEARCH_URL=https://your-api-endpoint.com
   ```

2. **Option 2: Pass baseURL parameter**
   ```typescript
   await tool.func({ 
     url: '...', 
     baseURL: 'https://your-api-endpoint.com'
   });
   ```

3. **Option 3: Run local API server**
   ```bash
   npm run dev  # Starts Next.js API at localhost:3000
   ```

### Authentication

API key can be provided via:
1. Environment variable: `QWKSEARCH_API_KEY`
2. Function parameter: `apiKey: 'your-key'`
3. Headers are automatically constructed: `{ 'x-api-key': 'your-key' }`

## Verification

To verify the fix works:

1. **Run tests:**
   ```bash
   cd packages/agent-toolkit
   npm test
   ```
   Expected: All 44 tests pass

2. **Check tool registration:**
   ```bash
   node -e "
   const { AGENT_TOOLS } = require('./dist/research-agent.cjs.js');
   console.log(AGENT_TOOLS.map(t => t.name));
   "
   ```
   Expected: Includes `web_search`, `extract_page`, `generate_ai_response`

3. **Test API call structure:**
   Tests verify correct parameter passing to API client

## Future Improvements

- [ ] Add real API endpoint integration tests (optional)
- [ ] Add retry logic for transient failures
- [ ] Add request/response logging option
- [ ] Add rate limiting handling
- [ ] Add caching layer for extracted content
- [ ] Add support for batch extraction
- [ ] Add PDF and YouTube extraction tests

## Related Files

- **API Client Package:** `packages/qwksearch-api-client/`
- **OpenAPI Spec:** `packages/qwksearch-api-client/qwksearch-openapi.yml`
- **API Routes:** `apps/qwksearch-web/app/api/`
- **Extract Library:** `packages/extract-webpage/`

## References

- [QwkSearch API Documentation](https://qwksearch.com/api/docs)
- [@hey-api/openapi-ts Documentation](https://heyapi.dev/)
- [Vitest Documentation](https://vitest.dev/)
- [Zod Schema Validation](https://zod.dev/)

---

**Status:** ✅ Complete
**Tests:** ✅ 44/44 Passing
**Date:** 2026-07-05
