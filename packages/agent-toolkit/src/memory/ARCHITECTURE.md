# Memory Module Architecture

## Overview

The memory system has been refactored from a single monolithic file into a modular, well-abstracted architecture that separates concerns and eliminates direct dependencies on Drizzle ORM.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Application Layer                        │
│                  (Your app using the memory module)              │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ imports
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                         index.ts                                 │
│                   (Public API exports)                           │
└────────────────────────────┬────────────────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         ↓                   ↓                   ↓
┌─────────────────┐ ┌─────────────────┐ ┌──────────────────┐
│  memory-agent.ts│ │ simple-memory.ts│ │  types.ts        │
│                 │ │                 │ │                  │
│ • Rate limiting │ │ • Message mgmt  │ │ • MemoryRecord   │
│ • LLM providers │ │ • Caching       │ │ • MEMORY_CONFIG  │
│ • Chat handling │ │ • Summarization │ │ • MEMORY_TYPES   │
│ • Analytics     │ │ • Batch ops     │ │ • Interfaces     │
└────────┬────────┘ └────────┬────────┘ └──────────────────┘
         │                   │
         │                   │ uses
         │                   ↓
         │          ┌─────────────────────┐
         │          │ storage-interface.ts│
         │          │                     │
         │          │  IMemoryStorage     │
         │          │  (Abstract Interface)│
         │          └──────────┬──────────┘
         │                     │
         │                     │ implements
         │                     ↓
         │          ┌─────────────────────┐
         └─────────→│ drizzle-storage.ts  │
                    │                     │
                    │ DrizzleMemoryStorage│
                    │ (Concrete Impl)     │
                    └──────────┬──────────┘
                               │
                               │ uses
                               ↓
                    ┌─────────────────────┐
                    │    Drizzle ORM      │
                    │    (External Dep)   │
                    └─────────────────────┘
```

## Component Responsibilities

### 1. **types.ts**
- **Purpose**: Central type definitions and constants
- **Exports**:
  - `MemoryRecord`, `Message`, `MemoryType`
  - `MEMORY_CONFIG`, `MEMORY_TYPES`
  - All TypeScript interfaces
- **Dependencies**: None
- **Used by**: All other modules

### 2. **storage-interface.ts**
- **Purpose**: Abstract interface for storage operations
- **Exports**: `IMemoryStorage` interface
- **Dependencies**: `types.ts`
- **Used by**: `simple-memory.ts`, `memory-agent.ts`
- **Key Methods**:
  - `insertMemory()`
  - `findMemories()`
  - `findSimilarMemories()`
  - `updateMemory()`
  - `deleteMemory()`
  - `batchUpdateMemories()`

### 3. **drizzle-storage.ts**
- **Purpose**: Drizzle ORM implementation of `IMemoryStorage`
- **Exports**: `DrizzleMemoryStorage` class
- **Dependencies**: `drizzle-orm`, `types.ts`, `storage-interface.ts`
- **Used by**: Application code (when using Drizzle)
- **Isolation**: This is the ONLY file that imports `drizzle-orm`

### 4. **simple-memory.ts**
- **Purpose**: Core memory management logic
- **Exports**: `SimpleMemory` class
- **Dependencies**: `storage-interface.ts`, `types.ts`, `writeLanguageResponse`
- **Features**:
  - Message deduplication
  - Auto-summarization
  - Caching (in-memory)
  - Batch processing
  - Memory recall with filtering

### 5. **memory-agent.ts**
- **Purpose**: High-level agent with LLM integration
- **Exports**: `MemoryAgent` class
- **Dependencies**: `simple-memory.ts`, `storage-interface.ts`, `types.ts`
- **Features**:
  - Rate limiting
  - Multi-provider LLM support
  - Chat management
  - Session tracking
  - Analytics

### 6. **index.ts**
- **Purpose**: Public API surface
- **Exports**: All public classes, interfaces, and types
- **Role**: Single entry point for consumers

### 7. **memory.ts** (Deprecated)
- **Purpose**: Backward compatibility
- **Exports**: Re-exports from `index.ts`
- **Status**: Deprecated, will be removed in future version

## Data Flow

### Storing a Memory
```
Application
    ↓ memory.storeFact("content", importance, category)
SimpleMemory
    ↓ storage.insertMemory(userId, type, content, importance)
IMemoryStorage (interface)
    ↓
DrizzleMemoryStorage
    ↓ db.insert().values()
Database
```

### Recalling Memories
```
Application
    ↓ memory.recallRelevantMemories(query, limit)
SimpleMemory
    ↓ Check cache
    ↓ storage.findMemories(userId, query, limit, options)
IMemoryStorage (interface)
    ↓
DrizzleMemoryStorage
    ↓ db.select().where().orderBy()
Database
    ↓
SimpleMemory (apply filters, cache results)
    ↓
Application
```

## Benefits of New Architecture

### 1. **Separation of Concerns**
- Storage logic is isolated from business logic
- Each file has a single, clear responsibility
- Easy to understand and maintain

### 2. **Testability**
```typescript
// Mock storage for testing
class MockStorage implements IMemoryStorage {
  private data = new Map();

  async insertMemory(...) { /* mock */ }
  async findMemories(...) { /* mock */ }
  // ...
}

const memory = new SimpleMemory("user", new MockStorage());
// Test without database!
```

### 3. **Flexibility**
```typescript
// Can swap implementations easily
const sqliteStorage = new SQLiteMemoryStorage(db);
const postgresStorage = new PostgresMemoryStorage(pool);
const redisStorage = new RedisMemoryStorage(client);

// Same interface, different backends
const memory = new SimpleMemory("user", sqliteStorage);
```

### 4. **No Vendor Lock-in**
- Core logic doesn't depend on Drizzle
- Can migrate to different ORMs
- Can use raw SQL if needed

### 5. **Better Dependency Management**
- Drizzle is only imported in one file
- Easier to upgrade or replace
- Smaller bundle size if using tree-shaking

## Migration from Old Structure

### Old (Monolithic)
```typescript
import { SimpleMemory } from "./agents/memory/memory";

const memory = new SimpleMemory(userId, db, options);
```

### New (Modular)
```typescript
import { SimpleMemory, DrizzleMemoryStorage } from "./agents/memory";

const storage = new DrizzleMemoryStorage(db);
const memory = new SimpleMemory(userId, storage, options);
```

### Key Changes
1. **Constructor change**: `db` → `storage` (IMemoryStorage)
2. **Explicit adapter**: Must create storage adapter first
3. **Better typing**: Full TypeScript support with interfaces

## Design Patterns Used

### 1. **Dependency Injection**
- `SimpleMemory` receives `IMemoryStorage` via constructor
- Enables loose coupling and testability

### 2. **Strategy Pattern**
- `IMemoryStorage` defines the storage strategy interface
- Different implementations can be swapped at runtime

### 3. **Facade Pattern**
- `MemoryAgent` provides simple interface to complex subsystems
- Hides complexity of memory management, LLM calls, rate limiting

### 4. **Repository Pattern**
- Storage layer acts as repository for memory entities
- Abstracts data access logic

## Future Extensions

### Adding New Storage Backend
```typescript
// 1. Implement IMemoryStorage
export class MongoMemoryStorage implements IMemoryStorage {
  constructor(private collection: Collection) {}

  async insertMemory(...) {
    return await this.collection.insertOne({...});
  }

  // ... implement other methods
}

// 2. Use it
const storage = new MongoMemoryStorage(collection);
const memory = new SimpleMemory("user", storage);
```

### Adding New Features to SimpleMemory
- Modify only `simple-memory.ts`
- No need to touch storage layer
- Business logic stays separate

### Replacing Drizzle
- Create new storage adapter (e.g., `prisma-storage.ts`)
- Implement `IMemoryStorage` interface
- Swap at initialization time
- Core logic remains unchanged

## Performance Considerations

### Caching Layer
- In-memory cache in `SimpleMemory`
- Reduces database queries
- TTL-based expiration

### Batch Operations
- `batchUpdateMemories()` for bulk updates
- Reduces round trips to database
- Better performance for summarization

### Query Optimization
- Indexed queries in storage layer
- Limit results to prevent over-fetching
- Efficient filtering and sorting

## Security Considerations

### Rate Limiting
- Prevents abuse of memory storage
- Configurable limits per user
- Sliding window implementation

### Input Validation
- Validates all inputs in `SimpleMemory`
- Prevents injection attacks
- Sanitizes content before storage

### Access Control
- User ID-based isolation
- Each user only sees their memories
- No cross-user data leakage
