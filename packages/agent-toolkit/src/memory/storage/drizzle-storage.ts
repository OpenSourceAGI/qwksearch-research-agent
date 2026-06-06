/**
 * Drizzle Storage Adapter
 *
 * Implementation of IMemoryStorage using Drizzle ORM
 */

import { sql, eq, and, desc, or, like } from "drizzle-orm";
import type { IMemoryStorage } from "./storage-interface";
import type {
  MemoryRecord,
  MemoryType,
  MemorySearchOptions,
  MemoryUpdate,
} from "../types";

/**
 * Drizzle-based storage adapter
 */
export class DrizzleMemoryStorage implements IMemoryStorage {
  private db: any;
  private tableName: string;

  constructor(db: any, tableName: string = "user_memories") {
    this.db = db;
    this.tableName = tableName;
  }

  /**
   * Insert a new memory record
   */
  async insertMemory(
    userId: string,
    memoryType: MemoryType,
    content: string,
    importance: number,
    metadata?: Record<string, any>,
  ): Promise<string> {
    const result = await this.db
      .insert(this.tableName)
      .values({
        user_id: userId,
        memory_type: memoryType,
        content: content,
        importance: importance,
        access_count: 0,
        metadata: metadata || {},
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning({ id: "id" });

    return result[0]?.id;
  }

  /**
   * Find memories by user ID and optional filters
   */
  async findMemories(
    userId: string,
    query?: string,
    limit: number = 10,
    options: MemorySearchOptions = {},
  ): Promise<MemoryRecord[]> {
    const conditions = [eq("user_id", userId)];

    if (query && query.trim()) {
      conditions.push(like("content", `%${query}%`));
    }

    if (options.memoryType) {
      conditions.push(eq("memory_type", options.memoryType));
    }

    const results = await this.db
      .select({
        id: "id",
        user_id: "user_id",
        memory_type: "memory_type",
        content: "content",
        importance: "importance",
        access_count: "access_count",
        metadata: "metadata",
        created_at: "created_at",
        updated_at: "updated_at",
      })
      .from(this.tableName)
      .where(and(...conditions))
      .orderBy(desc("importance"), desc("access_count"), desc("updated_at"))
      .limit(Math.min(limit, 50)); // Cap at 50 for performance

    return results as MemoryRecord[];
  }

  /**
   * Find similar memories based on content
   */
  async findSimilarMemories(
    userId: string,
    content: string,
    limit: number = 5,
  ): Promise<MemoryRecord[]> {
    // Simple similarity check using keywords
    const words = content
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 2);
    const searchTerms = words.slice(0, 3); // Use first 3 words

    if (searchTerms.length === 0) {
      return [];
    }

    const conditions = searchTerms.map((term) => like("content", `%${term}%`));

    const results = await this.db
      .select()
      .from(this.tableName)
      .where(and(eq("user_id", userId), or(...conditions)))
      .orderBy(desc("importance"), desc("updated_at"))
      .limit(limit);

    return results as MemoryRecord[];
  }

  /**
   * Update a memory record
   */
  async updateMemory(id: string, updates: MemoryUpdate): Promise<void> {
    const updateData: any = {};

    if (updates.importance !== undefined) {
      updateData.importance = updates.importance;
    }

    if (updates.access_count !== undefined) {
      if (typeof updates.access_count === "object" && updates.access_count.increment) {
        updateData.access_count = sql`access_count + ${updates.access_count.increment}`;
      } else {
        updateData.access_count = updates.access_count;
      }
    }

    if (updates.updated_at !== undefined) {
      updateData.updated_at = updates.updated_at;
    }

    if (updates.metadata !== undefined) {
      updateData.metadata = updates.metadata;
    }

    await this.db.update(this.tableName).set(updateData).where(eq("id", id));
  }

  /**
   * Delete a memory record
   */
  async deleteMemory(id: string): Promise<void> {
    await this.db.delete(this.tableName).where(eq("id", id));
  }

  /**
   * Get memory by ID
   */
  async getMemoryById(id: string): Promise<MemoryRecord | null> {
    const results = await this.db
      .select()
      .from(this.tableName)
      .where(eq("id", id))
      .limit(1);

    return (results[0] as MemoryRecord) || null;
  }

  /**
   * Batch update memories
   */
  async batchUpdateMemories(
    updates: Array<{ id: string; updates: MemoryUpdate }>,
  ): Promise<void> {
    const promises = updates.map(({ id, updates: updateData }) =>
      this.updateMemory(id, updateData),
    );
    await Promise.allSettled(promises);
  }
}

/**
 * Database schema for memory system
 * This is kept here for reference but should be managed by your migration system
 */
export function createMemorySchema(db: any) {
  return {
    user_memories: {
      id: "uuid",
      user_id: "string",
      memory_type: "string",
      content: "text",
      importance: "number",
      access_count: "number",
      metadata: "jsonb",
      created_at: "timestamp",
      updated_at: "timestamp",
    },
  };
}
