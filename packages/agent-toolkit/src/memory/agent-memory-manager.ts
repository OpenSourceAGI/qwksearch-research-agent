// @ts-nocheck
/**
 * Memory Agent
 *
 * Enhanced Memory Agent with:
 * - Rate limiting
 * - Multiple LLM provider support
 * - Health monitoring
 * - Conversation management
 * - Memory analytics
 */

import { SimpleMemory } from "./storage/in-memory-storage";
import type { IMemoryStorage } from "./storage/storage-interface";
import type { MemoryType, MemorySearchOptions } from "./types";
import { MEMORY_CONFIG, MEMORY_TYPES } from "./types";

/**
 * LLM provider interface
 */
interface LLMProvider {
  invoke: (prompt: string) => Promise<{ content: string; tokensUsed: number }>;
}

/**
 * Chat options
 */
interface ChatOptions {
  provider?: string;
  apiKey?: string;
  model?: string;
  temperature?: number;
  systemPrompt?: string;
  includeHistory?: boolean;
  maxMemories?: number;
  minImportance?: number;
}

/**
 * Chat response
 */
interface ChatResponse {
  content?: string;
  memoryContext?: string;
  success: boolean;
  tokensUsed?: number;
  responseTime?: number;
  sessionId?: string;
  timestamp: string;
  error?: string;
}

/**
 * Agent analytics
 */
interface AgentAnalytics {
  totalMessages: number;
  totalTokens: number;
  averageResponseTime: number;
  errorCount: number;
  sessionStartTime: number;
}

/**
 * Rate limit configuration
 */
interface RateLimitConfig {
  requests: number;
  windowMs: number;
}

/**
 * Agent options
 */
export interface MemoryAgentOptions {
  memoryOptions?: any;
  defaultProvider?: string;
  defaultApiKey?: string;
  defaultModel?: string;
  rateLimit?: RateLimitConfig;
  providers?: Record<string, (apiKey: string, model: string, temperature: number) => LLMProvider>;
}

export class MemoryAgent {
  private memory: SimpleMemory;
  private defaultProvider: string;
  private defaultApiKey?: string;
  private defaultModel?: string;
  private rateLimiter: Map<string, number[]>;
  private rateLimitConfig: RateLimitConfig;
  private providers: Record<string, (apiKey: string, model: string, temperature: number) => LLMProvider>;
  private sessionId: string;
  private conversationHistory: Array<{ role: string; content: string }>;
  private analytics: AgentAnalytics;
  private userId: string;

  /**
   * Initialize memory agent
   */
  constructor(userId: string, storage: IMemoryStorage, options: MemoryAgentOptions = {}) {
    if (!userId || !storage) {
      throw new Error("userId and storage are required parameters");
    }

    this.userId = userId;
    this.memory = new SimpleMemory(userId, storage, options.memoryOptions || {});
    this.defaultProvider = options.defaultProvider || "groq";
    this.defaultApiKey = options.defaultApiKey;
    this.defaultModel = options.defaultModel;

    // Rate limiting
    this.rateLimiter = new Map();
    this.rateLimitConfig = {
      ...MEMORY_CONFIG.DEFAULT_RATE_LIMIT,
      ...options.rateLimit,
    };

    // LLM providers
    this.providers = options.providers || this.getDefaultProviders();

    // Session management
    this.sessionId = this.generateSessionId();
    this.conversationHistory = [];

    // Analytics
    this.analytics = {
      totalMessages: 0,
      totalTokens: 0,
      averageResponseTime: 0,
      errorCount: 0,
      sessionStartTime: Date.now(),
    };
  }

  /**
   * Get default LLM providers
   */
  private getDefaultProviders(): Record<string, (apiKey: string, model: string, temperature: number) => LLMProvider> {
    return {
      groq: (apiKey, model, temperature) => ({
        invoke: async (prompt) => {
          // Implementation would go here
          return { content: "Default response", tokensUsed: 0 };
        },
      }),
      openai: (apiKey, model, temperature) => ({
        invoke: async (prompt) => {
          // Implementation would go here
          return { content: "Default response", tokensUsed: 0 };
        },
      }),
    };
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `${this.userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Rate limiting check with sliding window
   */
  private checkRateLimit(key: string, maxRequests?: number, windowMs?: number): boolean {
    const config = {
      maxRequests: maxRequests || this.rateLimitConfig.requests,
      windowMs: windowMs || this.rateLimitConfig.windowMs,
    };

    const now = Date.now();
    const requests = this.rateLimiter.get(key) || [];

    // Remove old requests outside the window
    const validRequests = requests.filter(
      (time) => now - time < config.windowMs,
    );

    if (validRequests.length >= config.maxRequests) {
      return false;
    }

    validRequests.push(now);
    this.rateLimiter.set(key, validRequests);
    return true;
  }

  /**
   * Main chat method with comprehensive error handling
   */
  async chat(message: string, options: ChatOptions = {}): Promise<ChatResponse> {
    const startTime = Date.now();

    // Input validation
    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return {
        error: "Message cannot be empty",
        success: false,
        timestamp: new Date().toISOString(),
      };
    }

    // Rate limiting
    const rateLimitKey = `chat-${this.userId}`;
    if (!this.checkRateLimit(rateLimitKey)) {
      return {
        error: "Rate limit exceeded. Please try again later.",
        success: false,
        timestamp: new Date().toISOString(),
      };
    }

    try {
      // Add user message to memory
      this.memory.addMessage("user", message, {
        sessionId: this.sessionId,
        timestamp: Date.now(),
      });

      // Get memory context
      const memoryContext = await this.memory.getMemoryContext(message, true, {
        maxMemories: options.maxMemories || 8,
        minImportance: options.minImportance || 0.5,
      });

      // Build enhanced prompt
      const prompt = this.buildPrompt(message, memoryContext, options);

      // Generate response
      const response = await this.generateResponse(prompt, options);

      if (!response || !response.content) {
        throw new Error("Invalid response from LLM");
      }

      // Add response to memory
      this.memory.addMessage("assistant", response.content, {
        sessionId: this.sessionId,
        tokensUsed: response.tokensUsed,
        timestamp: Date.now(),
      });

      // Update analytics
      this.updateAnalytics(response.tokensUsed, Date.now() - startTime);

      return {
        content: response.content,
        memoryContext: memoryContext,
        success: true,
        tokensUsed: response.tokensUsed || 0,
        responseTime: Date.now() - startTime,
        sessionId: this.sessionId,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Chat error:", error);
      this.analytics.errorCount++;

      return {
        error: error.message || "An unexpected error occurred",
        success: false,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Generate LLM response with timeout and error handling
   */
  private async generateResponse(prompt: string, options: ChatOptions): Promise<{ content: string; tokensUsed: number }> {
    const provider = options.provider || this.defaultProvider;
    const apiKey = options.apiKey || this.defaultApiKey;
    const model = options.model || this.defaultModel;
    const temperature = options.temperature || 0.7;

    if (!this.providers || !this.providers[provider]) {
      throw new Error(`Provider ${provider} not available`);
    }

    const llm = this.providers[provider](apiKey || "", model || "", temperature);

    // Add timeout to LLM call
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error("LLM request timeout")),
        MEMORY_CONFIG.DEFAULT_TIMEOUT,
      ),
    );

    return await Promise.race([llm.invoke(prompt), timeoutPromise]);
  }

  /**
   * Build enhanced prompt with context
   */
  private buildPrompt(message: string, memoryContext: string, options: ChatOptions): string {
    let prompt = "";

    // Add system context if provided
    if (options.systemPrompt) {
      prompt += `${options.systemPrompt}\n\n`;
    }

    // Add memory context
    if (memoryContext) {
      prompt += `${memoryContext}\n\n`;
    }

    // Add conversation history if requested
    if (options.includeHistory && this.conversationHistory.length > 0) {
      prompt += "Recent conversation history:\n";
      this.conversationHistory.slice(-5).forEach((msg) => {
        prompt += `${msg.role}: ${msg.content}\n`;
      });
      prompt += "\n";
    }

    prompt += `User: ${message}\n\nAssistant:`;

    return prompt;
  }

  /**
   * Update analytics
   */
  private updateAnalytics(tokensUsed: number, responseTime: number): void {
    this.analytics.totalMessages++;
    this.analytics.totalTokens += tokensUsed || 0;
    this.analytics.averageResponseTime =
      (this.analytics.averageResponseTime * (this.analytics.totalMessages - 1) +
        responseTime) /
      this.analytics.totalMessages;
  }

  /**
   * Remember a fact manually
   */
  async remember(
    fact: string,
    importance: number = 1,
    category: MemoryType = MEMORY_TYPES.MANUAL,
    metadata: Record<string, any> = {},
  ): Promise<string> {
    try {
      return await this.memory.storeFact(fact, importance, category, {
        ...metadata,
        source: "manual",
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error("Error remembering fact:", error);
      throw error;
    }
  }

  /**
   * Get memories with filtering
   */
  async getMemories(query: string = "", limit: number = 10, options: MemorySearchOptions = {}): Promise<any[]> {
    return await this.memory.recallRelevantMemories(query, limit, options);
  }

  /**
   * Force store summary of current conversation
   */
  async forceStoreSummary(): Promise<boolean> {
    return await this.memory.summarizeAndStore();
  }

  /**
   * Health check for the agent
   */
  async healthCheck(): Promise<any> {
    try {
      const memoryMetrics = this.memory.getMetrics();
      const rateLimitStatus = this.checkRateLimit("health-check", 1, 1000);

      return {
        status: "healthy",
        memory: memoryMetrics,
        rateLimit: rateLimitStatus,
        analytics: this.analytics,
        sessionId: this.sessionId,
        uptime: Date.now() - this.analytics.sessionStartTime,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: "unhealthy",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get analytics and performance metrics
   */
  getAnalytics(): any {
    return {
      ...this.analytics,
      memory: this.memory.getMetrics(),
      sessionId: this.sessionId,
      uptime: Date.now() - this.analytics.sessionStartTime,
    };
  }

  /**
   * Reset session and clear conversation history
   */
  resetSession(): void {
    this.sessionId = this.generateSessionId();
    this.conversationHistory = [];
    this.analytics.sessionStartTime = Date.now();
  }
}
