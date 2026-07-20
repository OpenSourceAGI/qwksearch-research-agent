/**
 * Memory System Types and Constants
 *
 * Defines interfaces and configuration for the memory management system
 */

/**
 * Memory types for categorization
 */
export const MEMORY_TYPES = {
  FACT: "fact",
  CONVERSATION: "conversation",
  PREFERENCE: "preference",
  PERSONAL: "personal",
  WORK: "work",
  MANUAL: "manual",
} as const;

export type MemoryType = (typeof MEMORY_TYPES)[keyof typeof MEMORY_TYPES];

/**
 * Configuration constants for memory management
 */
export const MEMORY_CONFIG = {
  DEFAULT_MAX_MEMORIES: 100,
  DEFAULT_SUMMARY_THRESHOLD: 10,
  DEFAULT_CACHE_EXPIRY: 5 * 60 * 1000, // 5 minutes
  DEFAULT_BATCH_SIZE: 5,
  DEFAULT_RELEVANCE_THRESHOLD: 0.3,
  DEFAULT_IMPORTANCE_RANGE: { min: 0, max: 10 },
  DEFAULT_RATE_LIMIT: { requests: 10, windowMs: 60000 },
  DEFAULT_TIMEOUT: 30000, // 30 seconds
  VECTOR_SEARCH_ENABLED: true,
  AUTO_SUMMARIZATION_ENABLED: true,
} as const;

/**
 * Memory record structure
 */
export interface MemoryRecord {
  id: string;
  user_id: string;
  memory_type: MemoryType;
  content: string;
  importance: number;
  access_count: number;
  metadata?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
  relevance_score?: number;
}

/**
 * Message structure for conversation tracking
 */
export interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

/**
 * Memory search options
 */
export interface MemorySearchOptions {
  minImportance?: number;
  memoryType?: MemoryType;
  includeMetadata?: boolean;
}

/**
 * Memory update payload
 */
export interface MemoryUpdate {
  importance?: number;
  access_count?: number | { increment: number };
  updated_at?: Date;
  metadata?: Record<string, any>;
}

/**
 * Memory context options
 */
export interface MemoryContextOptions {
  maxMemories?: number;
  minImportance?: number;
}

/**
 * Performance metrics
 */
export interface MemoryMetrics {
  cacheHits: number;
  cacheMisses: number;
  vectorSearches: number;
  summarizations: number;
  errors: number;
  cacheSize: number;
  recentMessagesCount: number;
  isProcessing: boolean;
}

/**
 * Memory initialization options
 */
export interface MemoryOptions {
  maxMemories?: number;
  summaryThreshold?: number;
  cacheExpiry?: number;
  batchSize?: number;
  relevanceThreshold?: number;
  enableVectorSearch?: boolean;
  enableAutoSummarization?: boolean;
}

/**
 * Extracted fact structure
 */
export interface ExtractedFact {
  content: string;
  importance?: number;
  category?: MemoryType;
  metadata?: Record<string, any>;
}
