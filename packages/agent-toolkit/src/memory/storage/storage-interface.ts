/**
 * Storage Interface
 *
 * Abstract interface for memory storage implementations.
 * This allows swapping database backends without changing memory logic.
 */

import type {
  MemoryRecord,
  MemoryType,
  MemorySearchOptions,
  MemoryUpdate,
} from "./types";

/**
 * Storage interface that any database adapter must implement
 */
export interface IMemoryStorage {
  /**
   * Insert a new memory record
   */
  insertMemory(
    userId: string,
    memoryType: MemoryType,
    content: string,
    importance: number,
    metadata?: Record<string, any>,
  ): Promise<string>;

  /**
   * Find memories by user ID and optional filters
   */
  findMemories(
    userId: string,
    query?: string,
    limit?: number,
    options?: MemorySearchOptions,
  ): Promise<MemoryRecord[]>;

  /**
   * Find similar memories based on content
   */
  findSimilarMemories(
    userId: string,
    content: string,
    limit?: number,
  ): Promise<MemoryRecord[]>;

  /**
   * Update a memory record
   */
  updateMemory(id: string, updates: MemoryUpdate): Promise<void>;

  /**
   * Delete a memory record
   */
  deleteMemory(id: string): Promise<void>;

  /**
   * Get memory by ID
   */
  getMemoryById(id: string): Promise<MemoryRecord | null>;

  /**
   * Batch update memories
   */
  batchUpdateMemories(updates: Array<{ id: string; updates: MemoryUpdate }>): Promise<void>;
}
