# Autocomplete API Documentation

The autocomplete module provides search query suggestions from multiple search engines, helping users quickly find what they're looking for.

## Features

- **8 Search Engine Backends**: Google, DuckDuckGo, Brave, Wikipedia, Baidu, Qwant, Startpage, Yandex
- **Locale Support**: Most backends support different languages and regions
- **Multi-Backend Queries**: Combine suggestions from multiple engines
- **Fast Responses**: Optimized with 3-second timeout for quick results

## API Endpoints

### GET /autocomplete

Get autocomplete suggestions from a specific backend.

**Query Parameters:**

- `q` (required): Search query string
- `backend` (optional): Backend name (default: 'google')
- `locale` (optional): Language/locale code (default: 'en-US')

**Example:**

```bash
curl "http://localhost:3000/autocomplete?q=typescript&backend=google&locale=en-US"
```

**Response:**

```json
{
  "query": "typescript",
  "backend": "google",
  "locale": "en-US",
  "suggestions": [
    "typescript tutorial",
    "typescript vs javascript",
    "typescript generics",
    "typescript interface",
    "typescript types"
  ]
}
```

### GET /autocomplete/multi

Get autocomplete suggestions from multiple backends and merge them.

**Query Parameters:**

- `q` (required): Search query string
- `backends` (optional): Comma-separated backend names (default: 'google,duckduckgo')
- `locale` (optional): Language/locale code (default: 'en-US')

**Example:**

```bash
curl "http://localhost:3000/autocomplete/multi?q=python&backends=google,duckduckgo,wikipedia"
```

**Response:**

```json
{
  "query": "python",
  "backends": ["google", "duckduckgo", "wikipedia"],
  "locale": "en-US",
  "count": 12,
  "suggestions": [
    "python tutorial",
    "python download",
    "python programming",
    "python (programming language)",
    "python snake",
    ...
  ]
}
```

### GET /autocomplete/backends

List all available autocomplete backends.

**Example:**

```bash
curl "http://localhost:3000/autocomplete/backends"
```

**Response:**

```json
{
  "backends": [
    {
      "name": "baidu",
      "description": "Baidu (Chinese search engine)"
    },
    {
      "name": "brave",
      "description": "Brave Search"
    },
    ...
  ],
  "count": 8
}
```

## Available Backends

| Backend              | Description   | Locale Support   |
| -------------------- | ------------- | ---------------- |
| **google**     | Google Search | Yes (subdomains) |
| **duckduckgo** | DuckDuckGo    | Yes (regions)    |
| **brave**      | Brave Search  | Limited          |
| **wikipedia**  | Wikipedia     | Yes (languages)  |
| **baidu**      | Baidu         | Chinese          |
| **qwant**      | Qwant         | Yes (locales)    |
| **startpage**  | Startpage     | Yes (languages)  |
| **yandex**     | Yandex        | Russian          |

## Programmatic Usage

### TypeScript/JavaScript

```typescript
import { searchAutocomplete, searchAutocompleteMulti } from './app/lib/autocomplete';

// Single backend
const suggestions = await searchAutocomplete('google', 'typescript');
console.log(suggestions);

// Multiple backends
const merged = await searchAutocompleteMulti(
    ['google', 'duckduckgo', 'wikipedia'],
    'javascript',
    'en-US'
);
console.log(merged);
```

### Individual Backend Functions

```typescript
import { google, duckduckgo, wikipedia } from './app/lib/autocomplete';

// Google autocomplete
const googleSuggestions = await google('react', 'en-US');

// DuckDuckGo autocomplete
const ddgSuggestions = await duckduckgo('vue');

// Wikipedia autocomplete (German)
const wikiSuggestions = await wikipedia('quantum physics', 'de');
```

## Locale Support

### Google

Google uses subdomains based on language:

```typescript
// English (google.com)
await google('search query', 'en');

// German (google.de)
await google('Suchanfrage', 'de');

// French (google.fr)
await google('requête de recherche', 'fr');

// Japanese (google.co.jp)
await google('検索クエリ', 'ja');
```

### Wikipedia

Wikipedia uses language-specific domains:

```typescript
// English Wikipedia
await wikipedia('physics', 'en');

// German Wikipedia
await wikipedia('Physik', 'de');

// French Wikipedia
await wikipedia('physique', 'fr');
```

### DuckDuckGo

DuckDuckGo uses region codes:

```typescript
// US English
await duckduckgo('search', 'en-US');

// UK English
await duckduckgo('search', 'en-GB');

// German
await duckduckgo('Suche', 'de-DE');
```

## Implementation Details

### Response Timeout

All autocomplete requests have a 3-second timeout to ensure fast responses. If a backend doesn't respond within this time, an empty array is returned.

### Error Handling

Errors are caught and logged, but don't prevent the API from responding:

```typescript
try {
    return await backend(query, locale);
} catch (error) {
    console.error('Autocomplete error:', error);
    return [];
}
```

### Deduplication

When using multi-backend queries, results are automatically deduplicated:

```typescript
const merged = new Set<string>();
for (const result of results) {
    for (const suggestion of result) {
        merged.add(suggestion);
    }
}
return Array.from(merged);
```

## Examples

See `examples/autocomplete-example.ts` for comprehensive usage examples including:

1. Single backend autocomplete
2. Multi-backend queries
3. Locale-specific suggestions
4. Direct backend function calls
5. Comparing results across backends
6. Asian language autocomplete (Baidu, Yandex)

Run the examples:

```bash
bun run examples/autocomplete-example.ts
```

## Performance Considerations

1. **Parallel Requests**: Multi-backend queries run in parallel using `Promise.all()`
2. **Fast Timeout**: 3-second timeout prevents slow backends from blocking
3. **Lightweight Parsing**: Minimal HTML parsing using linkedom for Google
4. **No Caching**: Suggestions are fresh on each request (can be added if needed)

## Future Enhancements

Potential improvements:

- [ ] Add caching layer for frequent queries
- [ ] Support for more backends (Bing, Yahoo, etc.)
- [ ] Ranked suggestions based on popularity
- [ ] User query history integration
- [ ] Personalized suggestions
- [ ] A/B testing different backends

## Troubleshooting

### No suggestions returned

1. Check if the backend is supported: `GET /autocomplete/backends`
2. Verify the query is not empty
3. Check network connectivity
4. Try a different backend

### Slow responses

1. Use single backend instead of multi-backend
2. Check backend-specific issues (rate limiting, etc.)
3. Consider implementing caching

### Locale not working

1. Verify locale format (e.g., 'en-US', 'de-DE')
2. Check if backend supports the locale
3. Refer to backend-specific locale documentation above
