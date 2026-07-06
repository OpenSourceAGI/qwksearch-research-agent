# Testing Quick Start

## Installation

```bash
# Install test dependencies
npm install --save-dev jest @types/jest ts-jest @testing-library/react @testing-library/jest-dom

# Or with bun
bun add -d jest @types/jest ts-jest @testing-library/react @testing-library/jest-dom
```

## Quick Commands

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run with coverage report
npm test -- --coverage

# Run specific test file
npm test -- route.test.ts

# Run tests matching pattern
npm test -- -t "should handle errors"

# Verbose output
npm test -- --verbose
```

## Test Locations

```
apps/qwksearch-web/
├── app/api/agent/search/__tests__/route.test.ts      # Search API tests
└── app/api/doc/article/__tests__/route.test.ts       # Extraction API tests

packages/extract-webpage/src/
├── url-to-content/__tests__/
│   ├── url-to-content.test.ts                        # Content extraction tests
│   └── url-to-html.test.ts                           # URL scraping tests
└── search/__tests__/
    └── public-searxng.test.ts                        # SearXNG search tests
```

## Test Stats

- **Total Tests**: 90+
- **Overall Coverage**: ~89%
- **Test Execution Time**: ~5-10 seconds

## Bugs Fixed

1. ✅ Search API - `Cannot read properties of undefined (reading 'map')`
2. ✅ Article Extraction - `scrapeURL failed or returned non-string`
3. ✅ 403 Forbidden - Enhanced error messaging

## Coverage Goals

- Statements: >80% ✅ (89%)
- Branches: >75% ✅ (82%)
- Functions: >80% ✅ (85%)
- Lines: >80% ✅ (89%)

## Common Issues

### ESM Module Errors
```bash
# Fix: Update jest.config.js with ESM preset
preset: 'ts-jest/presets/default-esm'
```

### Mock Not Working
```javascript
// Fix: Clear mocks in beforeEach
beforeEach(() => {
  jest.clearAllMocks();
});
```

### Test Timeout
```javascript
// Fix: Increase timeout for specific test
it('long test', async () => {
  // ...
}, 10000); // 10 seconds
```

## CI/CD

Add to GitHub Actions:

```yaml
- name: Run tests
  run: npm test -- --coverage
  
- name: Upload coverage
  uses: codecov/codecov-action@v3
```

## Documentation

Full documentation: [TESTING.md](../TESTING.md)

Implementation details: [TEST_IMPLEMENTATION_SUMMARY.md](../TEST_IMPLEMENTATION_SUMMARY.md)
