# QwkSearch API Tools Tests

This directory contains comprehensive unit and integration tests for the QwkSearch API tools.

## Test Files

### `qwksearch-tools.test.ts`
Unit tests for the three main QwkSearch API tools:
- **web_search** - Web search functionality
- **extract_page** - Content extraction from URLs
- **generate_ai_response** - AI response generation

**Test Coverage:**
- ✅ Tool registration and schema validation
- ✅ Default parameter values
- ✅ Correct API client invocation with parameters
- ✅ Error handling (network errors, empty results, etc.)
- ✅ Custom baseURL and apiKey configuration
- ✅ All provider types (groq, openai, anthropic, etc.)
- ✅ All agent types (question, summarize, etc.)
- ✅ Parameter passing and transformation

### `extraction-integration.test.ts`
Integration tests for realistic web extraction scenarios:
- News articles with complete metadata
- Blog posts with multiple authors
- Academic papers with organizational authors
- Articles with images, links, and formatting
- Edge cases (long content, special characters, non-ASCII)
- Error scenarios (timeouts, 404s, network failures)
- Configuration options (images, links, formatting, timeout)

## Running Tests

```bash
# Run all tests
npm test

# Run tests with UI
npm run test-ui

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- qwksearch-tools.test.ts

# Run with coverage
npm test -- --coverage
```

## Test Results

**Current Status:** ✅ 44/44 tests passing

```
 Test Files  2 passed (2)
      Tests  44 passed (44)
```

### Breakdown:
- **Unit Tests:** 27 tests
  - Tool Registration: 3 tests
  - web_search tool: 6 tests
  - extract_page tool: 8 tests
  - generate_ai_response tool: 7 tests
  - Integration: Parameter passing: 3 tests

- **Integration Tests:** 17 tests
  - Real-world HTML Extraction Scenarios: 6 tests
  - Edge Cases and Error Handling: 7 tests
  - Configuration Options: 4 tests

## What Was Fixed

### Issue
The QwkSearch API tools were passing invalid parameters to the API client:
- Using `config: { baseURL, apiKey }` parameter (not supported)
- Should use `baseUrl` and `headers` instead

### Solution
1. Changed parameter passing from:
   ```typescript
   await QwkSearch.extractContent({
     query: { ... },
     config: { baseURL, apiKey }  // ❌ Invalid
   });
   ```

2. To correct format:
   ```typescript
   await QwkSearch.extractContent({
     query: { ... },
     baseUrl: baseURL,  // ✅ Correct
     headers: apiKey ? { 'x-api-key': apiKey } : undefined
   });
   ```

3. Updated default base URL:
   - From: `https://qwksearch.com`
   - To: `https://app.qwksearch.com/api`

### Files Modified
- `packages/agent-toolkit/src/tools/qwksearch-api-tools.ts`
  - Fixed all three tools: `web_search`, `extract_page`, `generate_ai_response`
  - Updated `QWKSEARCH_CONFIG` default base URL
  - Corrected parameter passing to API client

- `packages/agent-toolkit/src/language-generation/generate-response.ts`
  - Removed "ollama" from provider list (consistency fix)

## Test Strategy

### Unit Tests (with mocks)
- Mock the `qwksearch-api-client` module
- Test parameter validation and transformation
- Test error handling with controlled mock responses
- Verify correct function calls with expected parameters

### Integration Tests (with mocks)
- Test realistic extraction scenarios
- Verify complete tool output formatting
- Test edge cases and error conditions
- Ensure configuration options work correctly

## Adding New Tests

When adding new tools or modifying existing ones:

1. Add unit tests in `qwksearch-tools.test.ts`:
   ```typescript
   describe('new_tool', () => {
     it('should validate schema', () => { ... });
     it('should call API correctly', async () => { ... });
     it('should handle errors', async () => { ... });
   });
   ```

2. Add integration tests in `extraction-integration.test.ts`:
   ```typescript
   it('should handle new scenario', async () => {
     const mockResponse = { data: { ... } };
     vi.mocked(QwkSearch.newTool).mockResolvedValueOnce(mockResponse);
     const result = await tool.func({ ... });
     expect(result).toContain('expected output');
   });
   ```

## Dependencies

- **vitest** - Test runner and assertion library
- **qwksearch-api-client** - Mocked for unit tests
- **zod** - Schema validation (used by tools)

## Troubleshooting

### Tests Fail After API Client Update
If the API client is updated, check:
1. Parameter names and types in `src/types.gen.ts`
2. Update mocks to match new response format
3. Verify function signatures match

### Import Errors
The tests use relative imports for the tools:
```typescript
import { AGENT_TOOLS } from '../src/tools/qwksearch-api-tools';
```

If you get import errors, check:
- File paths are correct
- Package dependencies are installed
- TypeScript configuration is correct

## Future Improvements

Potential test enhancements:
- [ ] Add performance benchmarks
- [ ] Test with real API endpoints (optional integration tests)
- [ ] Add snapshot testing for tool output format
- [ ] Test concurrent tool execution
- [ ] Add tests for rate limiting behavior
- [ ] Test with various network conditions (slow, intermittent)
