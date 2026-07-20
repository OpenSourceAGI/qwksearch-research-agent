# Mastra Memory Integration for Cloudflare Workers

Complete integration guide for using Mastra's memory system with Cloudflare Workers, D1, and KV storage.

## Features

- **Multi-Storage Backend**: D1 (SQL), KV (key-value), or in-memory
- **Thread-Based Conversations**: Organize conversations by thread ID
- **Resource Scoping**: Multi-user support with user and resource isolation
- **Edge-Ready**: Optimized for Cloudflare Workers edge runtime
- **Compatible**: Works with existing MemoryAgent architecture

## Quick Start

### 1. Initialize Mastra Memory

```typescript
import { createMastraMemory } from 'chat-agent-toolkit/memory';

const memoryManager = createMastraMemory({
  storage: 'd1',
  env: env, // Cloudflare env bindings
  tableName: 'mastra_memories',
});
```

### 2. Create Agent with Memory

```typescript
import { openai } from '@ai-sdk/openai';

const agent = await memoryManager.createAgent({
  id: 'assistant',
  name: 'AI Assistant',
  instructions: 'You are a helpful assistant with memory.',
  model: openai('gpt-4o'),
  userId: 'user-123',
  threadId: 'conversation-1',
});
```

### 3. Chat with Memory Context

```typescript
// Store and recall messages
await memoryManager.storeMessage('user-123', 'conversation-1', 'user', 'Hello');
const history = await memoryManager.recallConversation('user-123', 'conversation-1', 10);

// Get relevant context
const context = await memoryManager.getRelevantContext('user-123', 'previous topic', 5);

// Generate response
const response = await agent.generate('Continue our conversation');
```

See [examples/mastra-cloudflare-worker.ts](../../examples/mastra-cloudflare-worker.ts) for complete implementation.

## Configuration

### wrangler.toml

```toml
name = "mastra-memory-app"
compatibility_date = "2024-03-10"
compatibility_flags = ["nodejs_compat"]

[vars]
OPENAI_API_KEY = "sk-..."

[[d1_databases]]
binding = "DB"
database_name = "mastra-memory"
database_id = "YOUR_D1_ID"
```

D1 schema auto-initializes on first use.

## API Reference

### MastraMemoryManager

- `createAgent(config)` - Create agent with memory
- `storeMessage(userId, threadId, role, content, metadata?)` - Store message
- `recallConversation(userId, threadId, limit?)` - Get history
- `getRelevantContext(userId, query, limit?)` - Get relevant memories
- `getStorage()` - Access storage for advanced operations

### Storage Backends

**D1 Storage** (recommended for production):
```typescript
storage: 'd1',
env: { DB: env.DB }
```

**KV Storage** (simpler, less queryable):
```typescript
storage: 'kv',
env: { KV: env.KV }
```

## Links

- [Mastra Documentation](https://docs.mastra.ai/)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [Full Example](../../examples/mastra-cloudflare-worker.ts)
