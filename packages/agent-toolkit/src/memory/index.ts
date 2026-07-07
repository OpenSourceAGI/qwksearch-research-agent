/**
 * @fileoverview Memory Management System
 *
 * Intelligent long-term memory for AI agents with persistent storage,
 * vector-based relevance search, and automatic conversation summarization.
 * Supports in-memory and Drizzle ORM-backed persistence.
 *
 * @module memory
 * @author ai-research-agent contributors
 */

// Core agent memory manager
export { MemoryAgent } from "./agent-memory-manager";
export type { MemoryAgentOptions } from "./agent-memory-manager";

// Storage implementations
export { SimpleMemory } from "./storage/in-memory-storage";
export { DrizzleMemoryStorage, createMemorySchema } from "./storage/drizzle-storage";
export type { IMemoryStorage } from "./storage/storage-interface";

// Types and constants
export {
  MEMORY_CONFIG,
  MEMORY_TYPES,
  type MemoryType,
  type MemoryRecord,
  type Message,
  type MemorySearchOptions,
  type MemoryUpdate,
  type MemoryContextOptions,
  type MemoryMetrics,
  type MemoryOptions,
  type ExtractedFact,
} from "./types";

// Mastra integration for Cloudflare Workers
export {
  MastraMemoryManager,
  MastraD1MemoryStorage,
  MastraKVMemoryStorage,
  createMastraMemory,
} from "./mastra-integration";
export type {
  CloudflareEnv,
  MastraStorageBackend,
  MastraMemoryConfig,
} from "./mastra-integration";
