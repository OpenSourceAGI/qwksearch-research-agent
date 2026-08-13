# Skills & Memory System

Complete documentation for the Skills and Memory management system in qwksearch, reaching feature parity with Perplexity and leveraging Mastra's memory infrastructure.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Memory Types](#memory-types)
- [Skills Management](#skills-management)
- [API Reference](#api-reference)
- [Integration Guide](#integration-guide)
- [Perplexity Parity](#perplexity-parity)
- [Mastra Integration](#mastra-integration)

---

## Overview

The Skills & Memory system provides agents with:

1. **Persistent user context** across conversations through intelligent memory storage
2. **Skill management** with fine-grained enable/disable controls
3. **Automatic memory extraction** from interactions using Mastra
4. **Importance-based recall** prioritizing high-value memories
5. **Multi-backend storage** (D1, KV, in-memory)

### Key Features

- **5 Memory Types**: user, feedback, project, reference, conversation
- **Importance Scoring**: 1-10 scale with automatic relevance calculation
- **Search & Filtering**: Full-text search across memory content and metadata
- **Usage Tracking**: Access counts to surface frequently-used memories
- **Batch Operations**: Efficient bulk updates and indexing
- **Thread Management**: Per-conversation memory scoping

---

## Architecture

### System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Research Agent UI                        │
│              (Skills & Memory Settings Panel)               │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
    ┌───▼────┐            ┌──────▼────┐
    │ Skills │            │  Memories │
    │ Toggle │            │   CRUD    │
    └───┬────┘            └──────┬────┘
        │                        │
        └────────────┬───────────┘
                     │
        ┌────────────▼────────────┐
        │   API Layer            │
        │ /api/user/enabled-     │
        │   skills               │
        │ /api/user/memories     │
        └────────────┬────────────┘
                     │
        ┌────────────▼──────────────────┐
        │  Mastra Memory Manager        │
        │  - MastraMemoryManager        │
        │  - MastraD1MemoryStorage      │
        │  - MastraKVMemoryStorage      │
        └────────────┬──────────────────┘
                     │
    ┌────────────────┼────────────────┐
    │                │                │
┌───▼────┐     ┌────▼────┐     ┌─────▼────┐
│  D1    │     │   KV    │     │ In-Memory│
│Database│     │ Storage │     │ Cache    │
└────────┘     └─────────┘     └──────────┘
```

### Component Structure

```
SkillsAndMemory.tsx
├── Skills Section
│   ├── Category Collapse/Expand
│   ├── Skill Toggle Buttons
│   └── Enable/Disable State Management
├── Memory Section
│   ├── Search & Filter
│   ├── Memory Cards (Expandable)
│   ├── CRUD Operations
│   └── Importance Indicators
├── Statistics Panel
│   ├── Total Memories
│   ├── Active Skills Count
│   ├── High Importance Count
│   └── Total Access Count
└── Info Section
    └── Documentation & Help
```

---

## Memory Types

### 1. User Profile (`user`)
Biographical and professional information about the user.

```typescript
{
  name: "User Role",
  type: "user",
  description: "Full-stack engineer with 5 years React experience",
  content: "User is a full-stack engineer...",
  importance: 9,
  tags: ["profile", "dev", "experience"]
}
```

**Use Cases:**
- Role and responsibilities
- Technical expertise
- Preferences and working style
- Team and organization context

---

### 2. Feedback (`feedback`)
Guidance from the user on how to approach work.

```typescript
{
  name: "API Client Usage",
  type: "feedback",
  description: "Always use API client, not fetch",
  content: "All API calls must use qwksearch-api-client...",
  importance: 8,
  tags: ["api", "best-practices"]
}
```

**Use Cases:**
- Preferred patterns and conventions
- Things to avoid
- Confirmed successful approaches
- Corrections and redirects

---

### 3. Project (`project`)
Information about ongoing initiatives and context.

```typescript
{
  name: "Kokoro TTS Integration",
  type: "project",
  description: "Speech synthesis feature in progress",
  content: "Kokoro.js TTS has been integrated...",
  importance: 7,
  tags: ["tts", "audio", "feature"]
}
```

**Use Cases:**
- Current goals and deadlines
- Scope decisions and constraints
- Stakeholder requirements
- Technical decisions and trade-offs

---

### 4. Reference (`reference`)
Pointers to external resources and where to find information.

```typescript
{
  name: "Linear Project Board",
  type: "reference",
  description: "Bugs tracked in Linear INGEST project",
  content: "Pipeline bugs are tracked in Linear...",
  importance: 6,
  tags: ["external", "tracking"]
}
```

**Use Cases:**
- External system locations
- Documentation links
- Repository URLs
- API endpoint references

---

### 5. Conversation (`conversation`)
Message history for context retention.

```typescript
{
  memory_type: "conversation",
  content: "User message or assistant response",
  metadata: {
    thread_id: "conv-123",
    role: "user",
    timestamp: "2026-07-20T10:30:00Z"
  }
}
```

**Use Cases:**
- Message history per thread
- Context window management
- Conversation summarization
- Multi-turn context

---

## Skills Management

### Available Skill Categories

#### Information Retrieval
- **Web Search** - Real-time internet search
- **Document Fetching** - Retrieve and analyze web content
- **PDF Analysis** - Extract from PDF documents

#### Code & Development
- **Code Analysis** - Understand and review code
- **Git Integration** - Repository history and changes
- **Deployment Tools** - Deploy and manage applications

#### Data Processing
- **Data Extraction** - Extract structured data
- **CSV Processing** - Parse and analyze CSVs
- **Data Visualization** - Create charts and graphs

#### Knowledge Management
- **Memory Recall** - Access stored memories
- **Context Synthesis** - Combine information
- **Fact Extraction** - Store key facts

### Enabling/Disabling Skills

```typescript
// Toggle a skill
const res = await fetch('/api/user/enabled-skills', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ skillId: 'web-search', enabled: false })
});
```

### Skill Usage Tracking

Skills track usage metrics:
- `lastUsed`: Timestamp of most recent use
- `usageCount`: Total invocations in current period
- `successRate`: Percentage of successful executions

---

## API Reference

### Memories API

#### Get All Memories
```
GET /api/user/memories
?type=user
&search=keyword
&importance=8
&limit=50
```

**Response:**
```json
[
  {
    "id": "mem-123",
    "name": "Memory Name",
    "type": "user",
    "description": "...",
    "content": "...",
    "importance": 8,
    "accessCount": 5,
    "tags": ["tag1", "tag2"],
    "lastUpdated": "2026-07-20T10:30:00Z"
  }
]
```

---

#### Create Memory
```
POST /api/user/memories
Content-Type: application/json

{
  "name": "Memory Name",
  "type": "user|feedback|project|reference",
  "description": "Short description",
  "content": "Full memory content",
  "importance": 7,
  "tags": ["tag1", "tag2"]
}
```

**Response:**
```json
{
  "id": "mem-456",
  "message": "Memory created successfully"
}
```

---

#### Update Memory
```
PUT /api/user/memories/{id}
Content-Type: application/json

{
  "name": "Updated Name",
  "importance": 9,
  "tags": ["new-tag"]
}
```

---

#### Delete Memory
```
DELETE /api/user/memories/{id}
```

---

#### Record Memory Usage
```
POST /api/user/memories/{id}/usage
```

Increments the `accessCount` for the memory. Called when a memory is retrieved and used.

---

#### Search Memories
```
POST /api/user/memories/search
Content-Type: application/json

{
  "query": "search terms",
  "memoryType": "user",
  "minImportance": 6,
  "limit": 10
}
```

---

### Skills API

#### Get Enabled Skills
```
GET /api/user/enabled-skills
```

**Response:**
```json
[
  {
    "id": "web-search",
    "name": "Web Search",
    "enabled": true,
    "category": "Information Retrieval"
  }
]
```

---

#### Toggle Skill
```
POST /api/user/enabled-skills
Content-Type: application/json

{
  "skillId": "web-search",
  "enabled": false
}
```

---

#### Batch Update Skills
```
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

## Integration Guide

### Backend Setup

#### 1. D1 Schema Migration

```sql
-- Migration: 0005_create_memories_table.sql

CREATE TABLE IF NOT EXISTS memories (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  thread_id TEXT NOT NULL,
  resource_id TEXT,
  memory_type TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  importance REAL DEFAULT 1.0,
  access_count INTEGER DEFAULT 0,
  tags TEXT, -- JSON array
  metadata TEXT, -- JSON
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_user_thread ON memories(user_id, thread_id);
CREATE INDEX idx_user_type ON memories(user_id, memory_type);
CREATE INDEX idx_importance ON memories(importance DESC);
CREATE INDEX idx_created_at ON memories(created_at DESC);

CREATE TABLE IF NOT EXISTS enabled_skills (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  skill_id TEXT NOT NULL,
  enabled BOOLEAN DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX idx_user_skill ON enabled_skills(user_id, skill_id);
```

#### 2. Initialize Mastra Memory Manager

```typescript
// lib/memory/index.ts
import { createMastraMemory } from '@mastra/core/memory';
import type { CloudflareEnv } from 'packages/agent-toolkit/src/memory/mastra-integration';

export function initializeMemory(env: CloudflareEnv) {
  return createMastraMemory({
    storage: 'd1', // or 'kv' for serverless
    env,
    tableName: 'memories',
    kvPrefix: 'mem:',
    debug: process.env.DEBUG === 'true',
  });
}
```

#### 3. API Route: Get Memories

```typescript
// app/api/user/memories/route.ts
import { getUser } from '@/lib/auth';
import { initializeMemory } from '@/lib/memory';

export async function GET(req: Request) {
  const user = await getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const memory = initializeMemory(process.env as any);
  const storage = memory.getStorage();

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search');
  const type = searchParams.get('type') as any;
  const importance = parseInt(searchParams.get('importance') || '0');
  const limit = parseInt(searchParams.get('limit') || '50');

  const memories = await storage.findMemories(
    user.id,
    search || undefined,
    limit,
    {
      memoryType: type,
      minImportance: importance || undefined,
    }
  );

  return Response.json(memories);
}
```

#### 4. API Route: Create Memory

```typescript
// app/api/user/memories/route.ts
export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const body = await req.json();
  const memory = initializeMemory(process.env as any);
  const storage = memory.getStorage();

  const id = await storage.insertMemory(
    user.id,
    body.type,
    body.content,
    body.importance || 5,
    {
      name: body.name,
      description: body.description,
      tags: body.tags,
    }
  );

  return Response.json({ id, message: 'Memory created' });
}
```

#### 5. API Route: Delete Memory

```typescript
// app/api/user/memories/[id]/route.ts
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const user = await getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const memory = initializeMemory(process.env as any);
  const storage = memory.getStorage();

  // Verify ownership
  const mem = await storage.getMemoryById(params.id);
  if (!mem || mem.user_id !== user.id) {
    return new Response('Not found', { status: 404 });
  }

  await storage.deleteMemory(params.id);
  return Response.json({ message: 'Memory deleted' });
}
```

#### 6. API Route: Record Usage

```typescript
// app/api/user/memories/[id]/usage/route.ts
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const user = await getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const memory = initializeMemory(process.env as any);
  const storage = memory.getStorage();

  await storage.updateMemory(params.id, {
    access_count: { increment: 1 },
  });

  return Response.json({ message: 'Usage recorded' });
}
```

---

## Perplexity Parity

### Feature Comparison

| Feature | Qwksearch | Perplexity |
|---------|-----------|-----------|
| Memory Types | 5 types | Similar taxonomy |
| Expandable Cards | ✅ | ✅ |
| Color-Coded Types | ✅ | ✅ |
| Search & Filter | ✅ | ✅ |
| Importance Scoring | ✅ | ✅ |
| Usage Tracking | ✅ | ✅ |
| Bulk Operations | ✅ | ✅ |
| Memory Statistics | ✅ | ✅ |
| Thread Scoping | ✅ | ✅ |
| Vector Search | ⚠️ (D1) | ✅ |

### UI/UX Alignment

**Perplexity-Inspired Elements:**

1. **Clean Card Layout**
   - Expandable memory cards with chevron
   - Hover states with subtle backgrounds
   - Consistent spacing and typography

2. **Color System**
   - Blue: User Profile
   - Amber: Feedback
   - Purple: Project
   - Green: Reference

3. **Information Hierarchy**
   - Main content visible by default
   - Expandable detailed view
   - Quick stats in footer

4. **Search & Discovery**
   - Full-text search across content
   - Type-based filtering
   - Tag-based discovery

5. **Usage Indicators**
   - Importance stars (★)
   - Access count badges
   - Last updated timestamps

### Enhancements Beyond Perplexity

1. **Skill Management Integration**
   - Agent-specific capability control
   - Category-based organization
   - Enable/disable toggles

2. **Statistics Dashboard**
   - Memory count by type
   - High-importance memory count
   - Skill utilization metrics

3. **Importance Scoring**
   - Auto-calculated relevance
   - Manual adjustment capability
   - Impact on recall frequency

4. **Metadata Rich Storage**
   - Tags for organization
   - Thread IDs for conversation scoping
   - Custom metadata fields

---

## Mastra Integration

### Architecture Overview

Mastra handles the core memory logic with Cloudflare backend support.

```typescript
import { createMastraMemory } from '@mastra/core/memory';

const memoryManager = createMastraMemory({
  storage: 'd1',
  env: env,
  tableName: 'memories',
  debug: false,
});

// Initialize
await memoryManager.initialize();

// Store a message
await memoryManager.storeMessage(
  'user-123',
  'thread-1',
  'user',
  'Hello, assistant!'
);

// Recall conversation
const history = await memoryManager.recallConversation('user-123', 'thread-1');

// Get relevant context for a query
const context = await memoryManager.getRelevantContext('user-123', 'search query');
```

### Storage Backends

#### D1 (Primary for Web)
- Persistent SQL database
- Full-text search via LIKE
- Best for complex queries
- Scalable to millions of memories

```typescript
new MastraD1MemoryStorage(db, 'memories');
```

#### KV (For Edge Functions)
- Key-value store for quick access
- Best for high-frequency reads
- Lower cost than D1
- Limited query capability

```typescript
new MastraKVMemoryStorage(kv, 'mem:');
```

#### In-Memory (Development)
- Quick local testing
- No persistence
- Full-featured query support

### Memory Lifecycle

```
1. EXTRACTION
   User interacts with agent
   ↓
2. STORAGE
   Mastra extracts facts/context
   → MastraMemoryStorage.insertMemory()
   ↓
3. INDEXING
   Memory indexed by type & importance
   → Importance calculated automatically
   ↓
4. RECALL
   Agent needs context
   → MastraMemoryStorage.findSimilarMemories()
   ↓
5. USAGE TRACKING
   Memory retrieved and used
   → Record access_count increment
```

### Auto-Memory Extraction

Integrate with agent responses to auto-save memories:

```typescript
export async function extractAndSaveMemories(
  userId: string,
  response: string,
  metadata: Record<string, any>
) {
  const memory = initializeMemory(env);
  const storage = memory.getStorage();

  // Example: extract mentioned tools/skills
  const skillPattern = /skill:\s*(\w+)/gi;
  const matches = response.matchAll(skillPattern);

  for (const match of matches) {
    await storage.insertMemory(
      userId,
      'fact',
      `Agent mentioned skill: ${match[1]}`,
      8,
      { metadata }
    );
  }

  // Example: extract preferences from feedback
  if (response.includes('prefer')) {
    await storage.insertMemory(
      userId,
      'feedback',
      response,
      7,
      { source: 'agent_response', metadata }
    );
  }
}
```

### Vector Search (Future Enhancement)

When Cloudflare adds vector search:

```typescript
export class MastraVectorMemoryStorage implements IMemoryStorage {
  async findSimilarMemories(
    userId: string,
    query: string,
    limit: number = 5
  ): Promise<MemoryRecord[]> {
    // Use Vectorize for semantic search
    const embedding = await vectorize.embedQuery(query);
    const results = await vectorSearch(embedding, { userId, limit });
    return results;
  }
}
```

---

## Best Practices

### Memory Management
1. **Keep memories concise** - Focus on actionable information
2. **Set appropriate importance** - 8-10 for critical context, 3-5 for reference
3. **Use tags** - Enable cross-cutting discovery
4. **Regular cleanup** - Archive old, unused memories

### Skill Management
1. **Disable unnecessary skills** - Reduce latency and cost
2. **Monitor usage** - Check lastUsed timestamps
3. **Group by context** - Enable/disable categories together

### Performance
1. **Batch updates** - Use batch endpoints for multiple changes
2. **Limit recall size** - Retrieve only relevant memories
3. **Cache frequently used** - Store in-memory for repeated queries

### Privacy & Security
1. **Encrypt sensitive data** - Use metadata encryption for PII
2. **Scope by thread** - Isolate memories per conversation
3. **Audit access** - Log all memory retrievals
4. **Compliance** - Respect data retention policies

---

## Troubleshooting

### Memory Not Persisting
- Check D1 binding in wrangler.toml
- Verify schema migration ran
- Check user_id is set correctly

### Skills Not Toggling
- Verify API endpoint is registered
- Check authentication middleware
- Review error logs in browser console

### Search Not Finding Memories
- Check memory content was stored correctly
- Verify search query matches content
- Try without filters first

### Performance Issues
- Reduce memory limit query
- Use importance filtering
- Implement caching layer

---

## Future Roadmap

- [ ] Vector embeddings for semantic search
- [ ] Automatic memory summarization
- [ ] Multi-modal memory (images, audio)
- [ ] Memory export/import
- [ ] Shared memory workspaces
- [ ] Memory versioning & history
- [ ] Advanced analytics dashboard
- [ ] ML-based importance ranking

---

## References

- [Mastra Memory Docs](https://docs.mastra.ai/core/memory)
- [Cloudflare D1 Docs](https://developers.cloudflare.com/d1/)
- [Cloudflare KV Docs](https://developers.cloudflare.com/workers/runtime-apis/kv/)
- [Perplexity Memory System](https://www.perplexity.ai)

---

## Support

For issues, questions, or contributions:
- File issues on GitHub
- Check existing discussions
- Review memory logs in browser DevTools

