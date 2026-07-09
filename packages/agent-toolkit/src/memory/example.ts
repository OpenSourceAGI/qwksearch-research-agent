/**
 * Memory Module Usage Examples
 *
 * This file demonstrates how to use the new modular memory system
 */

import {
  DrizzleMemoryStorage,
  SimpleMemory,
  MemoryAgent,
  MEMORY_TYPES,
  type IMemoryStorage,
  type MemoryRecord,
} from "./index";

// ============================================================================
// Example 1: Basic Memory Usage with Drizzle
// ============================================================================

async function example1_basicMemory(db: any, userMemoriesTable: any) {
  console.log("Example 1: Basic Memory Usage");

  // Create storage adapter
  const storage = new DrizzleMemoryStorage(db, userMemoriesTable);

  // Create memory instance
  const memory = new SimpleMemory("user-123", storage, {
    maxMemories: 100,
    enableVectorSearch: true,
    enableAutoSummarization: true,
  });

  // Store some facts
  await memory.storeFact("User prefers dark mode", 8, MEMORY_TYPES.PREFERENCE);
  await memory.storeFact("User is a software engineer", 9, MEMORY_TYPES.PERSONAL);
  await memory.storeFact("User works at Acme Corp", 7, MEMORY_TYPES.WORK);

  // Recall relevant memories
  const memories = await memory.recallRelevantMemories("work", 10);
  console.log("Relevant memories:", memories);

  // Add messages to conversation
  memory.addMessage("user", "I need help with React");
  memory.addMessage("assistant", "I can help you with React!");

  // Get context for next message
  const context = await memory.getMemoryContext("React", true);
  console.log("Memory context:", context);

  // Get performance metrics
  const metrics = memory.getMetrics();
  console.log("Metrics:", metrics);
}

// ============================================================================
// Example 2: Using Memory Agent with LLM
// ============================================================================

async function example2_memoryAgent(db: any, userMemoriesTable: any) {
  console.log("Example 2: Memory Agent with LLM");

  const storage = new DrizzleMemoryStorage(db, userMemoriesTable);

  const agent = new MemoryAgent("user-123", storage, {
    defaultProvider: "groq",
    defaultModel: "mixtral-8x7b-32768",
    rateLimit: {
      requests: 10,
      windowMs: 60000, // 1 minute
    },
  });

  // Chat with memory context
  const response = await agent.chat("What do you remember about my preferences?", {
    maxMemories: 5,
    minImportance: 5,
  });

  if (response.success) {
    console.log("Response:", response.content);
    console.log("Memory context used:", response.memoryContext);
    console.log("Tokens used:", response.tokensUsed);
    console.log("Response time:", response.responseTime);
  } else {
    console.error("Error:", response.error);
  }

  // Manually remember something
  await agent.remember("User likes coffee in the morning", 7, MEMORY_TYPES.PREFERENCE);

  // Get all memories
  const allMemories = await agent.getMemories("", 20);
  console.log("All memories:", allMemories);

  // Health check
  const health = await agent.healthCheck();
  console.log("Health:", health);

  // Analytics
  const analytics = agent.getAnalytics();
  console.log("Analytics:", analytics);
}

// ============================================================================
// Example 3: Custom Storage Implementation
// ============================================================================

/**
 * Example custom storage implementation using in-memory Map
 * In production, this could be Redis, MongoDB, etc.
 */
class InMemoryStorage implements IMemoryStorage {
  private memories: Map<string, MemoryRecord> = new Map();
  private idCounter = 0;

  async insertMemory(
    userId: string,
    memoryType: any,
    content: string,
    importance: number,
    metadata?: Record<string, any>,
  ): Promise<string> {
    const id = `mem-${++this.idCounter}`;
    const memory: MemoryRecord = {
      id,
      user_id: userId,
      memory_type: memoryType,
      content,
      importance,
      access_count: 0,
      metadata: metadata || {},
      created_at: new Date(),
      updated_at: new Date(),
    };
    this.memories.set(id, memory);
    return id;
  }

  async findMemories(
    userId: string,
    query?: string,
    limit: number = 10,
    options: any = {},
  ): Promise<MemoryRecord[]> {
    let results = Array.from(this.memories.values()).filter(
      (m) => m.user_id === userId,
    );

    // Filter by query
    if (query) {
      results = results.filter((m) =>
        m.content.toLowerCase().includes(query.toLowerCase()),
      );
    }

    // Filter by type
    if (options.memoryType) {
      results = results.filter((m) => m.memory_type === options.memoryType);
    }

    // Sort by importance and access count
    results.sort((a, b) => {
      if (b.importance !== a.importance) {
        return b.importance - a.importance;
      }
      return b.access_count - a.access_count;
    });

    return results.slice(0, limit);
  }

  async findSimilarMemories(
    userId: string,
    content: string,
    limit: number = 5,
  ): Promise<MemoryRecord[]> {
    const words = content.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
    const results = Array.from(this.memories.values())
      .filter((m) => m.user_id === userId)
      .filter((m) =>
        words.some((word) => m.content.toLowerCase().includes(word)),
      )
      .sort((a, b) => b.importance - a.importance)
      .slice(0, limit);

    return results;
  }

  async updateMemory(id: string, updates: any): Promise<void> {
    const memory = this.memories.get(id);
    if (!memory) return;

    if (updates.importance !== undefined) {
      memory.importance = updates.importance;
    }
    if (updates.access_count !== undefined) {
      if (typeof updates.access_count === "object") {
        memory.access_count += updates.access_count.increment;
      } else {
        memory.access_count = updates.access_count;
      }
    }
    if (updates.updated_at !== undefined) {
      memory.updated_at = updates.updated_at;
    }
    if (updates.metadata !== undefined) {
      memory.metadata = updates.metadata;
    }
  }

  async deleteMemory(id: string): Promise<void> {
    this.memories.delete(id);
  }

  async getMemoryById(id: string): Promise<MemoryRecord | null> {
    return this.memories.get(id) || null;
  }

  async batchUpdateMemories(
    updates: Array<{ id: string; updates: any }>,
  ): Promise<void> {
    for (const { id, updates: updateData } of updates) {
      await this.updateMemory(id, updateData);
    }
  }
}

async function example3_customStorage() {
  console.log("Example 3: Custom Storage Implementation");

  // Use in-memory storage instead of database
  const storage = new InMemoryStorage();

  const memory = new SimpleMemory("user-123", storage);

  // Works exactly the same as with Drizzle!
  await memory.storeFact("This is stored in memory", 5, MEMORY_TYPES.FACT);

  const memories = await memory.recallRelevantMemories("memory");
  console.log("Memories from custom storage:", memories);
}

// ============================================================================
// Example 4: Testing with Mock Storage
// ============================================================================

class MockStorage implements IMemoryStorage {
  public insertCalls: any[] = [];
  public findCalls: any[] = [];

  async insertMemory(...args: any[]): Promise<string> {
    this.insertCalls.push(args);
    return "mock-id-" + this.insertCalls.length;
  }

  async findMemories(...args: any[]): Promise<MemoryRecord[]> {
    this.findCalls.push(args);
    return [
      {
        id: "mock-1",
        user_id: args[0],
        memory_type: MEMORY_TYPES.FACT,
        content: "Mock memory",
        importance: 5,
        access_count: 1,
        metadata: {},
        created_at: new Date(),
        updated_at: new Date(),
      },
    ];
  }

  async findSimilarMemories(): Promise<MemoryRecord[]> {
    return [];
  }
  async updateMemory(): Promise<void> {}
  async deleteMemory(): Promise<void> {}
  async getMemoryById(): Promise<MemoryRecord | null> {
    return null;
  }
  async batchUpdateMemories(): Promise<void> {}
}

async function example4_testing() {
  console.log("Example 4: Testing with Mock Storage");

  const mockStorage = new MockStorage();
  const memory = new SimpleMemory("test-user", mockStorage);

  // Store a fact
  await memory.storeFact("Test fact", 5, MEMORY_TYPES.FACT);

  // Verify the mock was called
  console.log("Insert calls:", mockStorage.insertCalls.length);
  console.log("First insert call:", mockStorage.insertCalls[0]);

  // Recall memories
  const memories = await memory.recallRelevantMemories("test");

  // Verify find was called
  console.log("Find calls:", mockStorage.findCalls.length);
  console.log("Returned memories:", memories);
}

// ============================================================================
// Example 5: Advanced Usage - Batch Operations
// ============================================================================

async function example5_batchOperations(db: any, userMemoriesTable: any) {
  console.log("Example 5: Batch Operations");

  const storage = new DrizzleMemoryStorage(db, userMemoriesTable);
  const memory = new SimpleMemory("user-123", storage, {
    batchSize: 5, // Process 5 facts at a time
  });

  // Add multiple messages - will trigger auto-summarization
  for (let i = 0; i < 15; i++) {
    memory.addMessage("user", `Message ${i}`, { timestamp: Date.now() });
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // Force summarization
  const success = await memory.summarizeAndStore();
  console.log("Summarization success:", success);

  // Clear cache
  memory.clearCache();
}

// ============================================================================
// Export examples
// ============================================================================

export {
  example1_basicMemory,
  example2_memoryAgent,
  example3_customStorage,
  example4_testing,
  example5_batchOperations,
  InMemoryStorage,
  MockStorage,
};
