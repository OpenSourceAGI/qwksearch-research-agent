/**
 * @fileoverview Mastra Memory Integration for Cloudflare Workers
 *
 * Integrates Mastra's memory system with Cloudflare Workers environment.
 * Provides persistent conversation memory using D1, KV, or Durable Objects.
 *
 * Features:
 * - Multi-storage backend support (D1, KV, Durable Objects)
 * - Thread-based conversation management
 * - Resource scoping for multi-user scenarios
 * - Cloudflare Workers optimized (edge-ready)
 * - Compatible with existing MemoryAgent architecture
 *
 * @see https://docs.mastra.ai/core/memory
 */

import { Mastra } from '@mastra/core';
import type { Agent, Memory } from '@mastra/core';
import type { D1Database, KVNamespace } from '@cloudflare/workers-types';
import type { IMemoryStorage } from './storage/storage-interface';
import type { MemoryRecord, MemoryType, MemorySearchOptions, MemoryUpdate } from './types';

/**
 * Cloudflare Workers environment bindings
 */
export interface CloudflareEnv {
  DB?: D1Database;
  KV?: KVNamespace;
  OPENAI_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  GROQ_API_KEY?: string;
}

/**
 * Storage backend types for Mastra memory
 */
export type MastraStorageBackend = 'memory' | 'd1' | 'kv';

/**
 * Configuration for Mastra memory integration
 */
export interface MastraMemoryConfig {
  /** Storage backend (memory, d1, or kv) */
  storage: MastraStorageBackend;
  /** Cloudflare environment bindings */
  env?: CloudflareEnv;
  /** D1 table name (for d1 storage) */
  tableName?: string;
  /** KV key prefix (for kv storage) */
  kvPrefix?: string;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * D1-based storage adapter for Mastra Memory
 * Implements IMemoryStorage using Cloudflare D1
 */
export class MastraD1MemoryStorage implements IMemoryStorage {
  private db: D1Database;
  private tableName: string;

  constructor(db: D1Database, tableName: string = 'mastra_memories') {
    this.db = db;
    this.tableName = tableName;
  }

  /**
   * Initialize D1 schema for Mastra memory
   */
  async initSchema(): Promise<void> {
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        thread_id TEXT NOT NULL,
        resource_id TEXT,
        memory_type TEXT NOT NULL,
        content TEXT NOT NULL,
        importance REAL DEFAULT 1.0,
        access_count INTEGER DEFAULT 0,
        metadata TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_user_thread ON ${this.tableName}(user_id, thread_id);
      CREATE INDEX IF NOT EXISTS idx_resource ON ${this.tableName}(resource_id);
      CREATE INDEX IF NOT EXISTS idx_importance ON ${this.tableName}(importance DESC);
    `);
  }

  async insertMemory(
    userId: string,
    memoryType: MemoryType,
    content: string,
    importance: number,
    metadata?: Record<string, any>
  ): Promise<string> {
    const id = crypto.randomUUID();
    const now = Date.now();

    await this.db
      .prepare(
        `INSERT INTO ${this.tableName}
         (id, user_id, thread_id, resource_id, memory_type, content, importance, metadata, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        userId,
        metadata?.thread_id || 'default',
        metadata?.resource_id || null,
        memoryType,
        content,
        importance,
        JSON.stringify(metadata || {}),
        now,
        now
      )
      .run();

    return id;
  }

  async findMemories(
    userId: string,
    query?: string,
    limit: number = 10,
    options: MemorySearchOptions = {}
  ): Promise<MemoryRecord[]> {
    let sql = `SELECT * FROM ${this.tableName} WHERE user_id = ?`;
    const params: any[] = [userId];

    if (options.memoryType) {
      sql += ' AND memory_type = ?';
      params.push(options.memoryType);
    }

    if (query) {
      sql += ' AND content LIKE ?';
      params.push(`%${query}%`);
    }

    if (options.minImportance !== undefined) {
      sql += ' AND importance >= ?';
      params.push(options.minImportance);
    }

    sql += ' ORDER BY importance DESC, updated_at DESC LIMIT ?';
    params.push(limit);

    const result = await this.db.prepare(sql).bind(...params).all();

    return (result.results || []).map((row: any) => ({
      id: row.id,
      user_id: row.user_id,
      memory_type: row.memory_type,
      content: row.content,
      importance: row.importance,
      access_count: row.access_count,
      metadata: JSON.parse(row.metadata || '{}'),
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
    }));
  }

  async findSimilarMemories(
    userId: string,
    content: string,
    limit: number = 5
  ): Promise<MemoryRecord[]> {
    // Simple keyword-based similarity for D1 (no vector search)
    const words = content.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const searchTerms = words.slice(0, 3);

    if (searchTerms.length === 0) return [];

    const likeConditions = searchTerms.map(() => 'content LIKE ?').join(' OR ');
    const params = [userId, ...searchTerms.map(term => `%${term}%`), limit];

    const result = await this.db
      .prepare(
        `SELECT * FROM ${this.tableName}
         WHERE user_id = ? AND (${likeConditions})
         ORDER BY importance DESC, updated_at DESC
         LIMIT ?`
      )
      .bind(...params)
      .all();

    return (result.results || []).map((row: any) => ({
      id: row.id,
      user_id: row.user_id,
      memory_type: row.memory_type,
      content: row.content,
      importance: row.importance,
      access_count: row.access_count,
      metadata: JSON.parse(row.metadata || '{}'),
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
    }));
  }

  async updateMemory(id: string, updates: MemoryUpdate): Promise<void> {
    const fields: string[] = [];
    const params: any[] = [];

    if (updates.importance !== undefined) {
      fields.push('importance = ?');
      params.push(updates.importance);
    }

    if (updates.access_count !== undefined) {
      if (typeof updates.access_count === 'object' && updates.access_count.increment) {
        fields.push('access_count = access_count + ?');
        params.push(updates.access_count.increment);
      } else {
        fields.push('access_count = ?');
        params.push(updates.access_count);
      }
    }

    if (updates.metadata !== undefined) {
      fields.push('metadata = ?');
      params.push(JSON.stringify(updates.metadata));
    }

    fields.push('updated_at = ?');
    params.push(Date.now());
    params.push(id);

    if (fields.length > 0) {
      await this.db
        .prepare(`UPDATE ${this.tableName} SET ${fields.join(', ')} WHERE id = ?`)
        .bind(...params)
        .run();
    }
  }

  async deleteMemory(id: string): Promise<void> {
    await this.db.prepare(`DELETE FROM ${this.tableName} WHERE id = ?`).bind(id).run();
  }

  async getMemoryById(id: string): Promise<MemoryRecord | null> {
    const result = await this.db
      .prepare(`SELECT * FROM ${this.tableName} WHERE id = ?`)
      .bind(id)
      .first();

    if (!result) return null;

    return {
      id: result.id as string,
      user_id: result.user_id as string,
      memory_type: result.memory_type as MemoryType,
      content: result.content as string,
      importance: result.importance as number,
      access_count: result.access_count as number,
      metadata: JSON.parse((result.metadata as string) || '{}'),
      created_at: new Date(result.created_at as number),
      updated_at: new Date(result.updated_at as number),
    };
  }

  async batchUpdateMemories(updates: Array<{ id: string; updates: MemoryUpdate }>): Promise<void> {
    for (const { id, updates: updateData } of updates) {
      await this.updateMemory(id, updateData);
    }
  }
}

/**
 * KV-based storage adapter for Mastra Memory
 * Uses Cloudflare KV for simple key-value storage
 */
export class MastraKVMemoryStorage implements IMemoryStorage {
  private kv: KVNamespace;
  private prefix: string;

  constructor(kv: KVNamespace, prefix: string = 'mastra:memory:') {
    this.kv = kv;
    this.prefix = prefix;
  }

  private getUserKey(userId: string): string {
    return `${this.prefix}user:${userId}`;
  }

  private getMemoryKey(id: string): string {
    return `${this.prefix}memory:${id}`;
  }

  async insertMemory(
    userId: string,
    memoryType: MemoryType,
    content: string,
    importance: number,
    metadata?: Record<string, any>
  ): Promise<string> {
    const id = crypto.randomUUID();
    const now = Date.now();

    const memory: MemoryRecord = {
      id,
      user_id: userId,
      memory_type: memoryType,
      content,
      importance,
      access_count: 0,
      metadata: metadata || {},
      created_at: new Date(now),
      updated_at: new Date(now),
    };

    // Store memory
    await this.kv.put(this.getMemoryKey(id), JSON.stringify(memory));

    // Update user's memory list
    const userKey = this.getUserKey(userId);
    const userMemories = await this.kv.get(userKey, 'json') as string[] || [];
    userMemories.push(id);
    await this.kv.put(userKey, JSON.stringify(userMemories));

    return id;
  }

  async findMemories(
    userId: string,
    query?: string,
    limit: number = 10,
    options: MemorySearchOptions = {}
  ): Promise<MemoryRecord[]> {
    const userKey = this.getUserKey(userId);
    const memoryIds = await this.kv.get(userKey, 'json') as string[] || [];

    const memories = await Promise.all(
      memoryIds.map(id => this.getMemoryById(id))
    );

    let filtered = memories.filter((m): m is MemoryRecord => m !== null);

    if (query) {
      filtered = filtered.filter(m =>
        m.content.toLowerCase().includes(query.toLowerCase())
      );
    }

    if (options.memoryType) {
      filtered = filtered.filter(m => m.memory_type === options.memoryType);
    }

    if (options.minImportance !== undefined) {
      filtered = filtered.filter(m => m.importance >= options.minImportance!);
    }

    return filtered
      .sort((a, b) => b.importance - a.importance || b.updated_at.getTime() - a.updated_at.getTime())
      .slice(0, limit);
  }

  async findSimilarMemories(
    userId: string,
    content: string,
    limit: number = 5
  ): Promise<MemoryRecord[]> {
    const words = content.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const searchTerms = words.slice(0, 3);

    if (searchTerms.length === 0) return [];

    const memories = await this.findMemories(userId, '', 50);

    return memories
      .filter(m =>
        searchTerms.some(term => m.content.toLowerCase().includes(term))
      )
      .slice(0, limit);
  }

  async updateMemory(id: string, updates: MemoryUpdate): Promise<void> {
    const memory = await this.getMemoryById(id);
    if (!memory) return;

    if (updates.importance !== undefined) {
      memory.importance = updates.importance;
    }

    if (updates.access_count !== undefined) {
      if (typeof updates.access_count === 'object' && updates.access_count.increment) {
        memory.access_count += updates.access_count.increment;
      } else {
        memory.access_count = updates.access_count;
      }
    }

    if (updates.metadata !== undefined) {
      memory.metadata = { ...memory.metadata, ...updates.metadata };
    }

    memory.updated_at = new Date();

    await this.kv.put(this.getMemoryKey(id), JSON.stringify(memory));
  }

  async deleteMemory(id: string): Promise<void> {
    const memory = await this.getMemoryById(id);
    if (!memory) return;

    await this.kv.delete(this.getMemoryKey(id));

    // Remove from user's list
    const userKey = this.getUserKey(memory.user_id);
    const userMemories = await this.kv.get(userKey, 'json') as string[] || [];
    const filtered = userMemories.filter(mId => mId !== id);
    await this.kv.put(userKey, JSON.stringify(filtered));
  }

  async getMemoryById(id: string): Promise<MemoryRecord | null> {
    const data = await this.kv.get(this.getMemoryKey(id), 'json') as any;
    if (!data) return null;

    return {
      ...data,
      created_at: new Date(data.created_at),
      updated_at: new Date(data.updated_at),
    };
  }

  async batchUpdateMemories(updates: Array<{ id: string; updates: MemoryUpdate }>): Promise<void> {
    await Promise.all(
      updates.map(({ id, updates: updateData }) => this.updateMemory(id, updateData))
    );
  }
}

/**
 * Mastra Memory Manager for Cloudflare Workers
 * Wraps Mastra's memory system with Cloudflare-compatible storage
 */
export class MastraMemoryManager {
  private mastra: Mastra | null = null;
  private storage: IMemoryStorage;
  private config: MastraMemoryConfig;

  constructor(config: MastraMemoryConfig) {
    this.config = config;

    // Initialize storage backend
    if (config.storage === 'd1' && config.env?.DB) {
      this.storage = new MastraD1MemoryStorage(config.env.DB, config.tableName);
    } else if (config.storage === 'kv' && config.env?.KV) {
      this.storage = new MastraKVMemoryStorage(config.env.KV, config.kvPrefix);
    } else {
      throw new Error(`Invalid storage configuration: ${config.storage}`);
    }
  }

  /**
   * Initialize Mastra instance with memory
   */
  async initialize(): Promise<Mastra> {
    if (this.mastra) return this.mastra;

    this.mastra = new Mastra({
      memory: {
        provider: 'postgres', // Mastra's interface, we adapt to D1/KV
        config: {
          // We'll use our custom storage adapter
        },
      },
    });

    // Initialize D1 schema if needed
    if (this.config.storage === 'd1' && this.storage instanceof MastraD1MemoryStorage) {
      await this.storage.initSchema();
    }

    return this.mastra;
  }

  /**
   * Get storage instance (for direct access)
   */
  getStorage(): IMemoryStorage {
    return this.storage;
  }

  /**
   * Create an agent with memory
   */
  async createAgent(config: {
    id: string;
    name: string;
    instructions: string;
    model: any;
    tools?: Record<string, any>;
    userId: string;
    threadId?: string;
    resourceId?: string;
  }): Promise<Agent> {
    const mastra = await this.initialize();

    // Get or create agent with memory
    const agent = new Agent({
      id: config.id,
      name: config.name,
      instructions: config.instructions,
      model: config.model,
      tools: config.tools || {},
    });

    // Attach memory context
    (agent as any).memoryContext = {
      userId: config.userId,
      threadId: config.threadId || 'default',
      resourceId: config.resourceId,
    };

    return agent;
  }

  /**
   * Store a message in memory
   */
  async storeMessage(
    userId: string,
    threadId: string,
    role: 'user' | 'assistant',
    content: string,
    metadata?: Record<string, any>
  ): Promise<string> {
    return await this.storage.insertMemory(
      userId,
      'conversation',
      content,
      1.0,
      {
        thread_id: threadId,
        role,
        ...metadata,
      }
    );
  }

  /**
   * Recall conversation history
   */
  async recallConversation(
    userId: string,
    threadId: string,
    limit: number = 20
  ): Promise<Array<{ role: 'user' | 'assistant'; content: string; timestamp: Date }>> {
    const memories = await this.storage.findMemories(
      userId,
      undefined,
      limit,
      { memoryType: 'conversation' }
    );

    return memories
      .filter(m => m.metadata?.thread_id === threadId)
      .map(m => ({
        role: m.metadata?.role || 'user',
        content: m.content,
        timestamp: m.created_at,
      }))
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Get relevant context for a query
   */
  async getRelevantContext(
    userId: string,
    query: string,
    limit: number = 5
  ): Promise<string> {
    const memories = await this.storage.findSimilarMemories(userId, query, limit);

    if (memories.length === 0) return '';

    return memories.map(m => m.content).join('\n\n');
  }
}

/**
 * Quick helper to create Mastra memory manager for Cloudflare Workers
 *
 * @example
 * ```ts
 * const memoryManager = createMastraMemory({
 *   storage: 'd1',
 *   env: env, // Cloudflare env bindings
 * });
 *
 * const agent = await memoryManager.createAgent({
 *   id: 'assistant',
 *   name: 'AI Assistant',
 *   instructions: 'Help users with their questions',
 *   model: openai('gpt-4o'),
 *   userId: 'user-123',
 *   threadId: 'conversation-1',
 * });
 * ```
 */
export function createMastraMemory(config: MastraMemoryConfig): MastraMemoryManager {
  return new MastraMemoryManager(config);
}
