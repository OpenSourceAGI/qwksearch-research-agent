// @ts-nocheck
/**
 * Simple Memory Class
 *
 * Core memory management functionality with:
 * - Message deduplication
 * - Automatic summarization
 * - Vector-based relevance search
 * - Caching with TTL
 * - Batch processing
 * - Conflict resolution
 */

import { generateLanguageResponse } from "write-language";
import type { IMemoryStorage } from "./storage-interface";
import type {
  MemoryRecord,
  Message,
  MemorySearchOptions,
  MemoryMetrics,
  MemoryOptions,
  MemoryContextOptions,
  ExtractedFact,
  MemoryType,
} from "../types";
import { MEMORY_CONFIG, MEMORY_TYPES } from "../types";

export class SimpleMemory {
  private userId: string;
  private storage: IMemoryStorage;
  private maxMemories: number;
  private summaryThreshold: number;
  private cacheExpiry: number;
  private batchSize: number;
  private relevanceThreshold: number;
  private enableVectorSearch: boolean;
  private enableAutoSummarization: boolean;
  private recentMessages: Message[];
  private memoryCache: Map<string, { data: any; timestamp: number }>;
  private isProcessing: boolean;
  private processingQueue: any[];
  private summarizeTimeout?: NodeJS.Timeout;
  private metrics: {
    cacheHits: number;
    cacheMisses: number;
    vectorSearches: number;
    summarizations: number;
    errors: number;
  };

  /**
   * Initialize memory system for a user
   */
  constructor(
    userId: string,
    storage: IMemoryStorage,
    options: MemoryOptions = {},
  ) {
    if (!userId || !storage) {
      throw new Error("userId and storage are required parameters");
    }

    this.userId = userId;
    this.storage = storage;
    this.maxMemories =
      options.maxMemories || MEMORY_CONFIG.DEFAULT_MAX_MEMORIES;
    this.summaryThreshold =
      options.summaryThreshold || MEMORY_CONFIG.DEFAULT_SUMMARY_THRESHOLD;
    this.cacheExpiry =
      options.cacheExpiry || MEMORY_CONFIG.DEFAULT_CACHE_EXPIRY;
    this.batchSize = options.batchSize || MEMORY_CONFIG.DEFAULT_BATCH_SIZE;
    this.relevanceThreshold =
      options.relevanceThreshold || MEMORY_CONFIG.DEFAULT_RELEVANCE_THRESHOLD;

    // Feature flags
    this.enableVectorSearch =
      options.enableVectorSearch !== false &&
      MEMORY_CONFIG.VECTOR_SEARCH_ENABLED;
    this.enableAutoSummarization =
      options.enableAutoSummarization !== false &&
      MEMORY_CONFIG.AUTO_SUMMARIZATION_ENABLED;

    // State management
    this.recentMessages = [];
    this.memoryCache = new Map();
    this.isProcessing = false;
    this.processingQueue = [];

    // Performance metrics
    this.metrics = {
      cacheHits: 0,
      cacheMisses: 0,
      vectorSearches: 0,
      summarizations: 0,
      errors: 0,
    };
  }

  /**
   * Add a message to current session with intelligent deduplication
   */
  addMessage(
    role: "user" | "assistant",
    content: string,
    metadata: Record<string, any> = {},
  ): boolean {
    if (!role || !content || typeof content !== "string") {
      console.warn("Invalid message parameters:", { role, content });
      return false;
    }

    // Intelligent deduplication - check last few messages
    const lastMessages = this.recentMessages.slice(-3);
    const isDuplicate = lastMessages.some(
      (msg) =>
        msg.role === role &&
        msg.content === content &&
        Date.now() - msg.timestamp < 60000, // Within 1 minute
    );

    if (isDuplicate) {
      console.log("Duplicate message detected, skipping");
      return false;
    }

    // Add message with metadata
    const message: Message = {
      role,
      content: content.trim(),
      timestamp: metadata.timestamp || Date.now(),
      metadata: { ...metadata },
    };

    this.recentMessages.push(message);

    // Auto-summarization with debouncing
    if (
      this.enableAutoSummarization &&
      this.recentMessages.length >= this.summaryThreshold &&
      !this.isProcessing
    ) {
      this.debouncedSummarize();
    }

    return true;
  }

  /**
   * Debounced summarization to prevent excessive processing
   */
  private debouncedSummarize(): void {
    if (this.summarizeTimeout) {
      clearTimeout(this.summarizeTimeout);
    }

    this.summarizeTimeout = setTimeout(() => {
      this.summarizeAndStore().catch((error) => {
        console.error("Auto-summarization failed:", error);
        this.metrics.errors++;
      });
    }, 1000); // 1 second debounce
  }

  /**
   * Store important facts with validation and conflict resolution
   */
  async storeFact(
    content: string,
    importance: number = 1,
    category: MemoryType = MEMORY_TYPES.FACT,
    metadata: Record<string, any> = {},
  ): Promise<string> {
    // Input validation
    if (
      !content ||
      typeof content !== "string" ||
      content.trim().length === 0
    ) {
      throw new Error("Content cannot be empty");
    }

    if (
      importance < MEMORY_CONFIG.DEFAULT_IMPORTANCE_RANGE.min ||
      importance > MEMORY_CONFIG.DEFAULT_IMPORTANCE_RANGE.max
    ) {
      throw new Error(
        `Importance must be between ${MEMORY_CONFIG.DEFAULT_IMPORTANCE_RANGE.min} and ${MEMORY_CONFIG.DEFAULT_IMPORTANCE_RANGE.max}`,
      );
    }

    const normalizedContent = content.trim();
    const normalizedCategory = Object.values(MEMORY_TYPES).includes(category)
      ? category
      : MEMORY_TYPES.FACT;

    try {
      // Check for existing similar facts using fuzzy matching
      const existingFacts = await this.findSimilarFacts(normalizedContent);

      if (existingFacts.length > 0) {
        // Update existing fact if importance is higher
        const bestMatch = existingFacts[0];
        if (importance > bestMatch.importance) {
          await this.storage.updateMemory(bestMatch.id, {
            importance,
            updated_at: new Date(),
            access_count: { increment: 1 },
            metadata: { ...bestMatch.metadata, ...metadata },
          });
        }
        return bestMatch.id;
      }

      // Insert new fact
      const id = await this.storage.insertMemory(
        this.userId,
        normalizedCategory,
        normalizedContent,
        Math.max(0, Math.min(10, importance)),
        metadata,
      );

      // Clear cache after new insertion
      this.clearCache();

      return id;
    } catch (error) {
      console.error("Error storing fact:", error);
      this.metrics.errors++;
      throw error;
    }
  }

  /**
   * Find similar facts using content similarity
   */
  private async findSimilarFacts(content: string): Promise<MemoryRecord[]> {
    try {
      return await this.storage.findSimilarMemories(this.userId, content, 5);
    } catch (error) {
      console.error("Error finding similar facts:", error);
      return [];
    }
  }

  /**
   * Enhanced memory recall with caching and vector search
   */
  async recallRelevantMemories(
    query: string = "",
    limit: number = 10,
    options: MemorySearchOptions = {},
  ): Promise<MemoryRecord[]> {
    const cacheKey = `${query}-${limit}-${JSON.stringify(options)}`;

    // Check cache first
    if (this.memoryCache.has(cacheKey)) {
      const cached = this.memoryCache.get(cacheKey)!;
      if (Date.now() - cached.timestamp < this.cacheExpiry) {
        this.metrics.cacheHits++;
        return cached.data;
      }
      this.memoryCache.delete(cacheKey);
    }

    this.metrics.cacheMisses++;

    try {
      let memories = await this.storage.findMemories(
        this.userId,
        query,
        limit,
        options,
      );

      if (memories.length === 0) {
        return [];
      }

      // Apply vector search if enabled and query provided
      if (this.enableVectorSearch && query.trim() && memories.length > 0) {
        memories = await this.applyVectorSearch(query, memories, options);
      }

      // Apply relevance filtering
      if (options.minImportance) {
        memories = memories.filter(
          (m) => m.importance >= options.minImportance!,
        );
      }

      // Format results
      const result = memories.map((m) => ({
        ...m,
        relevance_score: m.relevance_score || 0,
        metadata: options.includeMetadata ? m.metadata : undefined,
      }));

      // Cache the result
      this.memoryCache.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
      });

      return result;
    } catch (error) {
      console.error("Error retrieving memories:", error);
      this.metrics.errors++;
      return [];
    }
  }

  /**
   * Apply vector search to memories
   */
  private async applyVectorSearch(
    query: string,
    memories: MemoryRecord[],
    options: MemorySearchOptions,
  ): Promise<MemoryRecord[]> {
    // Placeholder for vector search implementation
    // In production, integrate with your vector similarity API
    // try {
    //   this.metrics.vectorSearches++;
    //   const sentencesByRelevance = await weighRelevanceConceptVectorAPI(
    //     query,
    //     memories.map(m => m.content)
    //   );
    //   await this.updateRelevanceScores(memories, sentencesByRelevance);
    //   return memories
    //     .map(memory => {
    //       const relevanceData = sentencesByRelevance.find(s => s.sentence === memory.content);
    //       return {
    //         ...memory,
    //         relevance_score: relevanceData?.relevance || 0
    //       };
    //     })
    //     .sort((a, b) => b.relevance_score - a.relevance_score);
    // } catch (vectorError) {
    //   console.warn('Vector search failed, falling back to basic search:', vectorError);
    //   return memories;
    // }
    return memories;
  }

  /**
   * Update relevance scores for memories
   */
  private async updateRelevanceScores(
    memories: MemoryRecord[],
    sentencesByRelevance: Array<{ sentence: string; relevance: number }>,
  ): Promise<void> {
    const updates = sentencesByRelevance
      .filter((m) => m.relevance > this.relevanceThreshold)
      .map((m) => {
        const memory = memories.find((mem) => mem.content === m.sentence);
        if (memory) {
          return {
            id: memory.id,
            updates: {
              importance: Math.min(10, memory.importance + m.relevance * 0.5),
              access_count: { increment: 1 },
              updated_at: new Date(),
            },
          };
        }
        return null;
      })
      .filter(Boolean) as Array<{ id: string; updates: any }>;

    if (updates.length > 0) {
      await this.storage.batchUpdateMemories(updates);
    }
  }

  /**
   * Improved summarization with error handling and batch processing
   */
  async summarizeAndStore(): Promise<boolean> {
    if (this.recentMessages.length === 0 || this.isProcessing) {
      return false;
    }

    this.isProcessing = true;
    this.metrics.summarizations++;

    try {
      // Create conversation summary
      const conversationText = this.recentMessages
        .map((msg) => `${msg.role}: ${msg.content}`)
        .join("\n");

      // Extract facts using LLM
      const factsResponse =
        await this.extractFactsFromConversation(conversationText);

      if (!Array.isArray(factsResponse) || factsResponse.length === 0) {
        console.warn("No facts extracted from conversation");
        return false;
      }

      // Process facts in batches
      await this.processFactsInBatches(factsResponse);

      // Clear processed messages
      this.recentMessages = [];

      return true;
    } catch (error) {
      console.error("Error in summarizeAndStore:", error);
      this.metrics.errors++;
      return false;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Extract facts from conversation using LLM
   */
  private async extractFactsFromConversation(
    conversationText: string,
  ): Promise<ExtractedFact[]> {
    try {
      const { extract: factsResponse } = await generateLanguageResponse({
        agent: "remember-facts",
        chat_history: conversationText,
        provider: "groq",
        model: "mixtral-8x7b-32768",
        timeout: MEMORY_CONFIG.DEFAULT_TIMEOUT,
      });

      return Array.isArray(factsResponse) ? factsResponse : [];
    } catch (error) {
      console.error("Error extracting facts:", error);
      return [];
    }
  }

  /**
   * Process facts in batches to avoid overwhelming the database
   */
  private async processFactsInBatches(
    factsResponse: ExtractedFact[],
  ): Promise<void> {
    for (let i = 0; i < factsResponse.length; i += this.batchSize) {
      const batch = factsResponse.slice(i, i + this.batchSize);

      const storePromises = batch.map(async (fact) => {
        try {
          if (fact && typeof fact === "object" && fact.content) {
            return await this.storeFact(
              fact.content,
              fact.importance || 1,
              fact.category || MEMORY_TYPES.CONVERSATION,
              fact.metadata || {},
            );
          } else if (typeof fact === "string" && fact.trim()) {
            return await this.storeFact(
              fact.trim(),
              1,
              MEMORY_TYPES.CONVERSATION,
            );
          }
        } catch (error) {
          console.error("Error storing individual fact:", error);
          return null;
        }
      });

      await Promise.allSettled(storePromises);

      // Small delay between batches
      if (i + this.batchSize < factsResponse.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
  }

  /**
   * Clear cache utility
   */
  clearCache(): void {
    this.memoryCache.clear();
  }

  /**
   * Get memory context with better formatting and relevance
   */
  async getMemoryContext(
    query: string = "",
    includeRecent: boolean = true,
    options: MemoryContextOptions = {},
  ): Promise<string> {
    const memories = await this.recallRelevantMemories(
      query,
      options.maxMemories || 8,
      { minImportance: options.minImportance || 0.5 },
    );

    if (memories.length === 0 && this.recentMessages.length === 0) {
      return "";
    }

    let context = "";

    // Add relevant memories
    if (memories.length > 0) {
      context += "What I remember about you:\n";
      memories
        .filter((memory) => memory.importance > (options.minImportance || 0.5))
        .forEach((memory) => {
          const importanceIndicator =
            memory.importance >= 8
              ? "\u2b50"
              : memory.importance >= 5
                ? "\u2022"
                : "-";
          context += `${importanceIndicator} ${memory.content}\n`;
        });
    }

    // Add recent conversation if requested
    if (includeRecent && this.recentMessages.length > 0) {
      context += context
        ? "\nRecent conversation:\n"
        : "Recent conversation:\n";
      this.recentMessages.slice(-3).forEach((msg) => {
        const truncatedContent =
          msg.content.length > 100
            ? msg.content.substring(0, 100) + "..."
            : msg.content;
        context += `${msg.role}: ${truncatedContent}\n`;
      });
    }

    return context;
  }

  /**
   * Get performance metrics
   */
  getMetrics(): MemoryMetrics {
    return {
      ...this.metrics,
      cacheSize: this.memoryCache.size,
      recentMessagesCount: this.recentMessages.length,
      isProcessing: this.isProcessing,
    };
  }
}
