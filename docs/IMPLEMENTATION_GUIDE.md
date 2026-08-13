# Skills & Memory Implementation Guide

Step-by-step implementation guide for integrating the Skills & Memory system into qwksearch.

## Quick Start

### Phase 1: Frontend (Already Complete)

✅ UI Components implemented:
- `SkillsAndMemory.tsx` - Main settings component
- Expandable memory cards with color-coded types
- Skill toggle interface with category grouping
- Statistics dashboard
- Search and filtering

### Phase 2: Backend API (In Progress)

Implement the following API routes:

#### Route 1: Get Memories
**File:** `app/api/user/memories/route.ts`
- Supports filtering by type, importance, search query
- Pagination with limit parameter
- Sorted by importance then update date

**Endpoints:**
```bash
# Get all memories
GET /api/user/memories

# With filters
GET /api/user/memories?search=api&type=reference&importance=8&limit=50
```

#### Route 2: Create Memory
**File:** `app/api/user/memories/route.ts` (POST)
- Validates memory type
- Auto-generates UUID
- Sets importance (1-10 range)

**Request:**
```bash
POST /api/user/memories
Content-Type: application/json

{
  "name": "API Client Usage",
  "type": "reference",
  "description": "Short description",
  "content": "Full memory content...",
  "importance": 8,
  "tags": ["api", "best-practices"]
}
```

#### Route 3: Get Single Memory
**File:** `app/api/user/memories/[id]/route.ts` (GET)
- Verify ownership before returning
- Include all metadata

#### Route 4: Update Memory
**File:** `app/api/user/memories/[id]/route.ts` (PUT)
- Allow partial updates
- Maintain audit trail

**Request:**
```bash
PUT /api/user/memories/{id}
Content-Type: application/json

{
  "importance": 9,
  "tags": ["updated-tag"]
}
```

#### Route 5: Delete Memory
**File:** `app/api/user/memories/[id]/route.ts` (DELETE)
- Soft delete or hard delete (your choice)
- Audit log deletion

#### Route 6: Record Memory Usage
**File:** `app/api/user/memories/[id]/usage/route.ts` (POST)
- Increment access count
- Update last accessed timestamp

**Request:**
```bash
POST /api/user/memories/{id}/usage
```

#### Route 7: Get Enabled Skills
**File:** `app/api/user/enabled-skills/route.ts` (GET)
- Return user's skill preferences
- Default all to enabled

**Response:**
```json
[
  { "id": "web-search", "enabled": true },
  { "id": "code-analysis", "enabled": false }
]
```

#### Route 8: Toggle Skill
**File:** `app/api/user/enabled-skills/route.ts` (POST)
- Enable/disable individual skills
- Idempotent operation

**Request:**
```bash
POST /api/user/enabled-skills
Content-Type: application/json

{
  "skillId": "web-search",
  "enabled": false
}
```

#### Route 9: Batch Update Skills
**File:** `app/api/user/enabled-skills/batch/route.ts` (POST)
- Update multiple skills at once
- Atomic operation

**Request:**
```bash
POST /api/user/enabled-skills/batch
Content-Type: application/json

{
  "updates": [
    { "skillId": "web-search", "enabled": true },
    { "skillId": "code-analysis", "enabled": false }
  ]
}
```

---

## Phase 3: Database Schema

### Add to D1 Migration

Create file: `migrations/0005_create_memories_table.sql`

```sql
-- Memories Table
CREATE TABLE IF NOT EXISTS memories (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  thread_id TEXT NOT NULL DEFAULT 'default',
  resource_id TEXT,
  memory_type TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  importance REAL DEFAULT 5.0,
  access_count INTEGER DEFAULT 0,
  tags TEXT, -- JSON array
  metadata TEXT, -- JSON
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY(user_id) REFERENCES user(id) ON DELETE CASCADE
);

CREATE INDEX idx_memories_user_thread ON memories(user_id, thread_id);
CREATE INDEX idx_memories_user_type ON memories(user_id, memory_type);
CREATE INDEX idx_memories_importance ON memories(importance DESC);
CREATE INDEX idx_memories_created_at ON memories(created_at DESC);

-- Enabled Skills Table
CREATE TABLE IF NOT EXISTS enabled_skills (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  skill_id TEXT NOT NULL,
  enabled BOOLEAN DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY(user_id) REFERENCES user(id) ON DELETE CASCADE,
  UNIQUE(user_id, skill_id)
);

CREATE INDEX idx_enabled_skills_user ON enabled_skills(user_id);
```

### Drizzle Schema

Add to `lib/database/schema.ts`:

```typescript
import { sqliteTable, text, real, integer, index } from 'drizzle-orm/sqlite-core';

export const memories = sqliteTable(
  'memories',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    threadId: text('thread_id').notNull().default('default'),
    resourceId: text('resource_id'),
    memoryType: text('memory_type').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    content: text('content').notNull(),
    importance: real('importance').default(5.0),
    accessCount: integer('access_count').default(0),
    tags: text('tags'), // JSON array
    metadata: text('metadata'), // JSON
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => ({
    userThreadIdx: index('idx_memories_user_thread').on(table.userId, table.threadId),
    userTypeIdx: index('idx_memories_user_type').on(table.userId, table.memoryType),
    importanceIdx: index('idx_memories_importance').on(table.importance),
    createdAtIdx: index('idx_memories_created_at').on(table.createdAt),
  })
);

export const enabledSkills = sqliteTable(
  'enabled_skills',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    skillId: text('skill_id').notNull(),
    enabled: integer('enabled', { mode: 'boolean' }).default(true),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => ({
    userSkillIdx: index('idx_enabled_skills_user_skill').on(table.userId, table.skillId),
  })
);
```

---

## Phase 4: Mastra Integration

### Initialize Mastra Memory Manager

Create file: `lib/memory/index.ts`

```typescript
import { createMastraMemory, MastraMemoryManager } from '@mastra/core/memory';
import { getDB } from '@/lib/database';

let memoryManager: MastraMemoryManager | null = null;

export function getMemoryManager(): MastraMemoryManager {
  if (!memoryManager) {
    const db = getDB();
    memoryManager = createMastraMemory({
      storage: 'd1',
      env: {
        DB: db,
      },
      tableName: 'memories',
      debug: process.env.DEBUG === 'true',
    });
  }
  return memoryManager;
}

export async function initializeMemory() {
  const manager = getMemoryManager();
  await manager.initialize();
  return manager;
}
```

### Auto-Extract Memories from Conversations

Create file: `lib/memory/extractor.ts`

```typescript
import { getMemoryManager } from './index';

interface ExtractionOptions {
  userId: string;
  threadId: string;
  metadata?: Record<string, any>;
}

/**
 * Extract and auto-save memories from agent responses
 */
export async function extractMemoriesFromResponse(
  response: string,
  options: ExtractionOptions
) {
  const manager = getMemoryManager();
  const storage = manager.getStorage();

  // Extract preferences (look for "prefer" patterns)
  const preferencePattern = /prefer(?:.*?):\s*(.+?)(?:\.|$)/gi;
  const preferences = response.matchAll(preferencePattern);

  for (const match of preferences) {
    await storage.insertMemory(
      options.userId,
      'feedback',
      `User ${match[1]}`,
      7,
      {
        source: 'agent_extraction',
        threadId: options.threadId,
        ...options.metadata,
      }
    );
  }

  // Extract facts (look for "fact:" or "note:" patterns)
  const factPattern = /(?:fact|note):\s*(.+?)(?:\.|$)/gi;
  const facts = response.matchAll(factPattern);

  for (const match of facts) {
    await storage.insertMemory(
      options.userId,
      'fact',
      match[1],
      6,
      {
        source: 'agent_extraction',
        threadId: options.threadId,
        ...options.metadata,
      }
    );
  }
}

/**
 * Store a conversation message in memory
 */
export async function storeConversationMessage(
  userId: string,
  threadId: string,
  role: 'user' | 'assistant',
  content: string
) {
  const manager = getMemoryManager();
  await manager.storeMessage(userId, threadId, role, content);
}

/**
 * Get conversation history from memory
 */
export async function getConversationHistory(
  userId: string,
  threadId: string,
  limit: number = 20
) {
  const manager = getMemoryManager();
  return await manager.recallConversation(userId, threadId, limit);
}

/**
 * Get relevant context for a query
 */
export async function getRelevantContext(
  userId: string,
  query: string,
  limit: number = 5
) {
  const manager = getMemoryManager();
  return await manager.getRelevantContext(userId, query, limit);
}
```

---

## Phase 5: Integration with Agent

### Update Agent to Use Memory Context

Create file: `lib/agent/memory-aware-agent.ts`

```typescript
import { Agent } from '@mastra/core/agent';
import {
  getConversationHistory,
  getRelevantContext,
  storeConversationMessage,
} from '@/lib/memory/extractor';

export class MemoryAwareAgent extends Agent {
  userId: string;
  threadId: string;

  constructor(config: any & { userId: string; threadId: string }) {
    super(config);
    this.userId = config.userId;
    this.threadId = config.threadId;
  }

  async run(input: string) {
    // Get relevant memories
    const context = await getRelevantContext(this.userId, input);

    // Get conversation history
    const history = await getConversationHistory(this.userId, this.threadId);

    // Store user message
    await storeConversationMessage(
      this.userId,
      this.threadId,
      'user',
      input
    );

    // Build prompt with context
    const systemPrompt = this.buildSystemPrompt(context, history);

    // Run agent (pass systemPrompt to model)
    const result = await super.run(input);

    // Store response
    await storeConversationMessage(
      this.userId,
      this.threadId,
      'assistant',
      result
    );

    return result;
  }

  private buildSystemPrompt(context: string, history: any[]): string {
    let prompt = `You are a helpful assistant.`;

    if (context) {
      prompt += `\n\nRelevant context:\n${context}`;
    }

    if (history.length > 0) {
      prompt += `\n\nRecent conversation:`;
      history.forEach((msg) => {
        prompt += `\n${msg.role}: ${msg.content}`;
      });
    }

    return prompt;
  }
}
```

---

## Phase 6: UI Integration

### Connect SkillsAndMemory Component to API

The component is already set up to call these endpoints:

```typescript
// Get memories
const memoriesRes = await fetch('/api/user/memories');

// Create memory
const res = await fetch('/api/user/memories', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: "Memory Name",
    type: "reference",
    description: "...",
    content: "...",
    importance: 8,
    tags: ["tag1"]
  })
});

// Delete memory
const res = await fetch(`/api/user/memories/${id}`, {
  method: 'DELETE'
});

// Record usage
const res = await fetch(`/api/user/memories/${id}/usage`, {
  method: 'POST'
});

// Get enabled skills
const skillsRes = await fetch('/api/user/enabled-skills');

// Toggle skill
const res = await fetch('/api/user/enabled-skills', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ skillId: 'web-search', enabled: false })
});
```

---

## Testing Checklist

### Unit Tests

- [ ] Memory CRUD operations
- [ ] Skill toggle functionality
- [ ] Import/importance calculation
- [ ] Access count tracking
- [ ] Memory search and filtering

### Integration Tests

- [ ] End-to-end memory workflow
- [ ] Mastra integration
- [ ] Database persistence
- [ ] Authentication checks
- [ ] Authorization (users can only access own memories)

### Manual Testing

- [ ] Create memory and verify it appears in list
- [ ] Search memories by query
- [ ] Filter by type and importance
- [ ] Toggle skill enable/disable
- [ ] Expand/collapse memory cards
- [ ] Delete memory
- [ ] Update memory properties
- [ ] View statistics dashboard
- [ ] Record memory usage

---

## Performance Optimization

### Caching Strategy

```typescript
// Implement Redis caching for frequently accessed memories
import { cache } from 'react';

const getCachedMemories = cache(async (userId: string) => {
  const cacheKey = `memories:${userId}`;
  const cached = await redis.get(cacheKey);
  
  if (cached) return JSON.parse(cached);
  
  const memories = await getMemories(userId);
  await redis.set(cacheKey, JSON.stringify(memories), { ex: 300 });
  
  return memories;
});
```

### Query Optimization

- Use indexes on frequently queried fields
- Implement pagination for large result sets
- Use database query result limiting
- Batch operations where possible

### Frontend Optimization

- Lazy load memory cards
- Virtual scrolling for large lists
- Debounce search queries
- Cache API responses

---

## Security Considerations

### Authentication & Authorization

- ✅ Verify user session before DB operations
- ✅ Ensure users can only access own memories
- ✅ Validate all inputs before storage

### Data Protection

- [ ] Encrypt sensitive memory content
- [ ] Implement audit logging
- [ ] Add rate limiting to API endpoints
- [ ] Sanitize output to prevent XSS

### Compliance

- [ ] GDPR memory export functionality
- [ ] GDPR memory deletion
- [ ] Data retention policies
- [ ] Privacy policy documentation

---

## Monitoring & Analytics

### Metrics to Track

- Memory creation rate
- Search query frequency
- Skill usage patterns
- Memory deletion rate
- API response times
- Error rates

### Logging

```typescript
// Log memory operations
logger.info('Memory created', {
  userId,
  memoryType,
  importance,
  timestamp: new Date(),
});

logger.info('Memory accessed', {
  userId,
  memoryId,
  accessCount,
  timestamp: new Date(),
});
```

---

## Future Enhancements

1. **Vector Search**
   - Add embeddings for semantic search
   - Use Cloudflare Vectorize

2. **Memory Auto-summarization**
   - Summarize old memories
   - Reduce storage usage

3. **Memory Sharing**
   - Share memories between users
   - Team workspace support

4. **Advanced Analytics**
   - Memory usage patterns
   - Skill effectiveness metrics
   - Productivity insights

5. **Mobile Support**
   - Export memories
   - Mobile-friendly interface

---

## Deployment Checklist

- [ ] Database migrations applied
- [ ] API endpoints tested
- [ ] Authentication verified
- [ ] Error handling in place
- [ ] Logging configured
- [ ] Performance tested
- [ ] Security reviewed
- [ ] Documentation updated
- [ ] User training materials ready
- [ ] Monitoring/alerts configured

---

## Support & Documentation

- Refer to `SKILLS_AND_MEMORY.md` for full API documentation
- Check `CLAUDE.md` for codebase guidelines
- Review Mastra docs: https://docs.mastra.ai/core/memory
- Cloudflare docs: https://developers.cloudflare.com/d1/

