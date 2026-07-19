# API Utilities

This directory contains utilities for making authenticated API requests in the qwksearch-web application.

## Quick Start

```typescript
import { api } from '@/lib/api';

// GET request
const chats = await api.get('/api/agent/chats');

// POST request
const result = await api.post('/api/agent/chat', {
  message: { content: 'Hello' },
  focusMode: 'webSearch',
});

// DELETE request
await api.delete('/api/agent/chats/123');
```

## Features

- ✅ **Automatic Authentication**: Includes credentials (cookies) in all requests
- ✅ **JSON Handling**: Automatically parses JSON responses
- ✅ **Error Handling**: Throws descriptive errors with HTTP status codes
- ✅ **Timeout Support**: Configurable request timeout (default: 30s)
- ✅ **TypeScript Support**: Full type safety with generics

## API Reference

### `fetchWithAuth<T>(url, options?)`

Low-level authenticated fetch wrapper.

**Parameters:**
- `url`: API endpoint (relative or absolute)
- `options`: Fetch options plus:
  - `json`: Parse as JSON (default: `true`)
  - `timeout`: Request timeout in ms (default: `30000`)

**Returns:** `Promise<T>`

### Convenience Methods

#### `api.get<T>(url, options?)`
GET request

#### `api.post<T>(url, body?, options?)`
POST request with JSON body

#### `api.put<T>(url, body?, options?)`
PUT request with JSON body

#### `api.patch<T>(url, body?, options?)`
PATCH request with JSON body

#### `api.delete<T>(url, options?)`
DELETE request

## Examples

### Loading Chat History

```typescript
import { api } from '@/lib/api';

interface Chat {
  id: string;
  title: string;
  messages: Message[];
}

// Type-safe GET request
const { chats } = await api.get<{ chats: Chat[] }>('/api/agent/chats');
```

### Creating a New Chat

```typescript
import { api } from '@/lib/api';

const response = await api.post('/api/agent/chat', {
  message: {
    content: 'What is quantum computing?',
    chatId: crypto.randomUUID(),
  },
  focusMode: 'webSearch',
  chatModel: {
    providerId: 'openai',
    key: 'gpt-4',
  },
});
```

### Deleting a Chat

```typescript
import { api } from '@/lib/api';

try {
  await api.delete(`/api/agent/chats/${chatId}`);
  toast.success('Chat deleted');
} catch (error) {
  toast.error(error.message);
}
```

### Custom Timeout

```typescript
import { api } from '@/lib/api';

// 60 second timeout for long-running request
const result = await api.post(
  '/api/agent/search',
  { query: 'complex search' },
  { timeout: 60000 }
);
```

### Raw Response (No JSON Parsing)

```typescript
import { fetchWithAuth } from '@/lib/api';

const response = await fetchWithAuth('/api/download/file', {
  json: false,
});

const blob = await response.blob();
```

## Migration Guide

If you're updating code that uses `grab-url`, here's how to migrate:

### Before (grab-url)
```typescript
import grab from 'grab-url';

const data = await grab('agent/chats');
```

### After (fetchWithAuth)
```typescript
import { api } from '@/lib/api';

const data = await api.get('/api/agent/chats');
```

## Error Handling

All methods throw descriptive errors that include the HTTP status code:

```typescript
import { api } from '@/lib/api';

try {
  const data = await api.get('/api/agent/chats');
} catch (error) {
  // Error message format: "HTTP 404: Chat not found"
  console.error(error.message);
}
```

## Why Not grab-url?

While `grab-url` is a great library, we switched to native `fetch` with a custom wrapper because:

1. **Authentication**: `grab-url` doesn't include credentials by default, causing auth issues
2. **Type Safety**: Better TypeScript integration with custom types
3. **Bundle Size**: Native fetch is already in the browser
4. **Control**: Full control over request/response handling

## Related Files

- `lib/api/fetch-with-auth.ts` - Core implementation
- `lib/api/index.ts` - Public exports
- `components/ResearchAgent/hooks/useChat/chatMessages.ts` - Usage example
- `components/ResearchAgent/components/ChatHistoryDropdown/useHistoryState.ts` - Usage example
