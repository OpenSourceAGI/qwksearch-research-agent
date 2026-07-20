# Memory Module

Intelligent memory management for AI agents with persistent storage, automatic summarization, and vector-based relevance search.

## Architecture

The memory system is now split into multiple files with clear separation of concerns:

```
memory/
├── index.ts                 # Main entry point, exports all public APIs
├── types.ts                 # TypeScript types and constants
├── storage-interface.ts     # Abstract storage interface
├── drizzle-storage.ts       # Drizzle ORM implementation
├── simple-memory.ts         # Core memory management logic
├── memory-agent.ts          # High-level agent with LLM integration
├── memory.ts                # Backward compatibility (deprecated)
└── README.md                # This file
```

## Key Benefits

### 1. **Abstracted Database Layer**
The storage layer is now abstracted behind the `IMemoryStorage` interface, making it easy to:
- Swap database implementations (PostgreSQL, MySQL, SQLite, etc.)
- Mock storage for testing
- Add new storage backends without touching core logic

### 2. **Modular Design**
Each component has a single responsibility:
- **types.ts** - Type definitions and constants
- **storage-interface.ts** - Storage contract
- **drizzle-storage.ts** - Drizzle-specific implementation
- **simple-memory.ts** - Core memory management
- **memory-agent.ts** - Agent-level features (rate limiting, LLM integration)

### 3. **No Direct Drizzle Dependency**
The core `SimpleMemory` class now depends only on the `IMemoryStorage` interface, not on Drizzle directly. This means:
- Easier testing with mock storage
- Can use different ORMs or raw SQL
- Cleaner dependency management

## Usage

### Basic Usage (with Drizzle)

```typescript
import { DrizzleMemoryStorage, SimpleMemory } from "research-agent";

// Create storage adapter
const storage = new DrizzleMemoryStorage(db);

// Create memory instance
const memory = new SimpleMemory("user-123", storage, {
  maxMemories: 100,
  enableVectorSearch: true,
  enableAutoSummarization: true,
});

// Store a fact
await memory.storeFact("User prefers dark mode", 8, "preference");

// Recall relevant memories
const memories = await memory.recallRelevantMemories("preferences", 10);
```

### Using the Memory Agent

```typescript
import { DrizzleMemoryStorage, MemoryAgent } from "research-agent";

const storage = new DrizzleMemoryStorage(db);
const agent = new MemoryAgent("user-123", storage, {
  defaultProvider: "groq",
  defaultModel: "mixtral-8x7b-32768",
});

// Chat with memory context
const response = await agent.chat("What do you remember about my preferences?");
console.log(response.content);
console.log(response.memoryContext);

// Manually store a fact
await agent.remember("User likes coffee", 7, "personal");
```

### Custom Storage Implementation

You can implement your own storage backend:

```typescript
import { IMemoryStorage } from "research-agent";

class MyCustomStorage implements IMemoryStorage {
  async insertMemory(userId, memoryType, content, importance, metadata) {
    // Your implementation
  }

  async findMemories(userId, query, limit, options) {
    // Your implementation
  }

  // ... implement other methods
}

const storage = new MyCustomStorage();
const memory = new SimpleMemory("user-123", storage);
```

## Migration Guide

If you were using the old monolithic `memory.ts`:

### Before
```typescript
import { SimpleMemory, MemoryAgent } from "research-agent";

const memory = new SimpleMemory("user-123", db, options);
```

### After
```typescript
import { DrizzleMemoryStorage, SimpleMemory } from "research-agent";

const storage = new DrizzleMemoryStorage(db);
const memory = new SimpleMemory("user-123", storage, options);
```

The old `memory.ts` file still works for backward compatibility but is deprecated.

## Storage Interface

The `IMemoryStorage` interface defines these methods:

- `insertMemory()` - Insert a new memory record
- `findMemories()` - Search memories with filters
- `findSimilarMemories()` - Find similar content
- `updateMemory()` - Update a memory record
- `deleteMemory()` - Delete a memory
- `getMemoryById()` - Get memory by ID
- `batchUpdateMemories()` - Batch update multiple memories

## Features

### Core Memory Management
- **Message deduplication** - Prevents duplicate messages
- **Auto-summarization** - Extracts facts from conversations
- **Intelligent caching** - TTL-based cache for performance
- **Batch processing** - Efficient database operations
- **Conflict resolution** - Handles similar facts intelligently

### Memory Agent
- **Rate limiting** - Prevents API abuse
- **Multi-provider support** - Works with different LLMs
- **Session management** - Tracks conversation sessions
- **Analytics** - Monitors performance metrics
- **Health checks** - System status monitoring

## Configuration

### Memory Options
```typescript
{
  maxMemories: 100,              // Maximum memories to store
  summaryThreshold: 10,          // Messages before auto-summarization
  cacheExpiry: 300000,           // Cache TTL in ms (5 minutes)
  batchSize: 5,                  // Batch size for processing
  relevanceThreshold: 0.3,       // Minimum relevance score
  enableVectorSearch: true,      // Enable vector-based search
  enableAutoSummarization: true, // Enable auto-summarization
}
```

### Agent Options
```typescript
{
  memoryOptions: { /* Memory options */ },
  defaultProvider: "groq",       // Default LLM provider
  defaultApiKey: "...",          // API key
  defaultModel: "...",           // Model name
  rateLimit: {
    requests: 10,                // Max requests per window
    windowMs: 60000,             // Rate limit window (1 minute)
  },
}
```

## Testing

With the abstracted storage layer, testing is much easier:

```typescript
class MockStorage implements IMemoryStorage {
  private memories: Map<string, MemoryRecord> = new Map();

  async insertMemory(userId, memoryType, content, importance, metadata) {
    const id = Math.random().toString();
    this.memories.set(id, { id, userId, memoryType, content, importance, metadata });
    return id;
  }

  // ... implement other methods
}

// Use in tests
const mockStorage = new MockStorage();
const memory = new SimpleMemory("test-user", mockStorage);
```

## Performance

- **Caching** - Reduces database queries
- **Batch operations** - Minimizes round trips
- **Query optimization** - Efficient database queries
- **Rate limiting** - Prevents overload

## Future Enhancements

Potential improvements:
- Vector search integration (embeddings API)
- Memory importance decay over time
- Cross-user memory sharing
- Memory export/import
- Advanced analytics dashboard
