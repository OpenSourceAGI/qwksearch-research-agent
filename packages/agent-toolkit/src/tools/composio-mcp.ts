/**
 * @fileoverview Composio MCP Integration for AI SDK v5
 *
 * Composio provides dynamic MCP endpoints through sessions/Tool Router.
 * This module creates MCP clients connected to Composio's HTTP endpoints,
 * fetches available tools, and passes them to AI SDK models.
 *
 * Architecture:
 * 1. Create Composio session → Get MCP URL + headers
 * 2. Connect with createMCPClient (HTTP transport)
 * 3. Fetch tools with client.tools()
 * 4. Pass to streamText/generateText
 *
 * @see https://composio.dev/toolkits/ai_ml_api/framework/ai-sdk
 * @see https://ai-sdk.dev/docs/ai-sdk-core/mcp-tools
 */

import { Composio } from '@composio/core';
import { createMCPClient } from '@ai-sdk/mcp';
import type { MCPClient } from '@ai-sdk/mcp';
import type { ToolSet } from 'ai';

/**
 * Configuration for Composio MCP session
 */
export interface ComposioMCPConfig {
  /** Composio API key */
  apiKey: string;
  /** User ID to scope the session */
  userId: string;
  /** Toolkits to enable (e.g., ['GMAIL', 'NOTION', 'SLACK']) */
  toolkits: string[];
  /** Optional: Additional MCP headers (e.g., x-api-key if org requires it) */
  additionalHeaders?: Record<string, string>;
}

/**
 * Composio MCP session wrapper
 * Manages the lifecycle of MCP client connections to Composio
 */
export class ComposioMCPSession {
  private composio: Composio;
  private client: MCPClient | null = null;
  private mcpEndpoint: { url: string; headers: Record<string, string> } | null = null;

  constructor(private config: ComposioMCPConfig) {
    this.composio = new Composio({
      apiKey: config.apiKey,
    });
  }

  /**
   * Create Composio Tool Router session and get MCP endpoint
   * This returns the HTTP URL and auth headers for the MCP server
   */
  private async getOrCreateEndpoint() {
    if (this.mcpEndpoint) {
      return this.mcpEndpoint;
    }

    // Create dynamic Composio Tool Router session with specified toolkits.
    // `mcp: true` surfaces the session's MCP endpoint (url + headers).
    const session = await this.composio.toolRouter.create(this.config.userId, {
      toolkits: this.config.toolkits,
      mcp: true,
    });

    // Extract MCP endpoint info
    this.mcpEndpoint = {
      url: session.mcp.url,
      headers: {
        ...(session.mcp.headers ?? {}),
        ...this.config.additionalHeaders,
      },
    };

    return this.mcpEndpoint;
  }

  /**
   * Get or create the MCP client connection
   * Uses HTTP transport as recommended by Composio
   */
  async getClient(): Promise<MCPClient> {
    if (this.client) {
      return this.client;
    }

    const endpoint = await this.getOrCreateEndpoint();

    // Connect to Composio MCP endpoint via HTTP
    this.client = await createMCPClient({
      transport: {
        type: 'http',
        url: endpoint.url,
        headers: endpoint.headers,
        redirect: 'error',
      },
    });

    return this.client;
  }

  /**
   * Get all available tools from Composio MCP
   * These tools can be passed directly to streamText/generateText
   *
   * @returns Tools object compatible with AI SDK
   */
  async getTools(): Promise<ToolSet> {
    const client = await this.getClient();
    return (await client.tools()) as ToolSet;
  }

  /**
   * Close the MCP connection
   * Should be called after request completion or in finally block
   */
  async close() {
    if (this.client) {
      await this.client.close();
      this.client = null;
    }
  }

  /**
   * Get list of available toolkits from Composio
   * Useful for discovering what integrations are available
   */
  static async listAvailableToolkits(apiKey: string): Promise<string[]> {
    const composio = new Composio({ apiKey });
    const toolkits = await composio.toolkits.get();
    return toolkits.map((t) => t.name);
  }

  /**
   * Check if a user has authenticated a specific toolkit
   * Returns true if the user can access the toolkit's tools
   */
  async isToolkitAuthenticated(toolkit: string): Promise<boolean> {
    try {
      const accounts = await this.composio.connectedAccounts.list({
        userIds: [this.config.userId],
        toolkitSlugs: [toolkit],
        statuses: ['ACTIVE'],
      });
      return accounts.items.length > 0;
    } catch {
      return false;
    }
  }
}

/**
 * Helper function to create a one-shot Composio MCP session
 * For quick tool usage without managing session lifecycle
 *
 * @example
 * ```ts
 * const tools = await getComposioTools({
 *   apiKey: process.env.COMPOSIO_API_KEY!,
 *   userId: 'user-123',
 *   toolkits: ['GMAIL', 'SLACK'],
 * });
 *
 * const result = await generateText({
 *   model: openai('gpt-4o'),
 *   prompt: 'Check my unread emails',
 *   tools,
 * });
 * ```
 */
export async function getComposioTools(config: ComposioMCPConfig): Promise<ToolSet> {
  const session = new ComposioMCPSession(config);
  try {
    return await session.getTools();
  } finally {
    await session.close();
  }
}

/**
 * Create a reusable Composio MCP session
 * Better for multiple requests with the same toolkits
 *
 * @example
 * ```ts
 * const session = await createComposioSession({
 *   apiKey: process.env.COMPOSIO_API_KEY!,
 *   userId: 'user-123',
 *   toolkits: ['GMAIL', 'NOTION'],
 * });
 *
 * try {
 *   const tools = await session.getTools();
 *   const result = await streamText({ model, messages, tools });
 * } finally {
 *   await session.close();
 * }
 * ```
 */
export async function createComposioSession(
  config: ComposioMCPConfig
): Promise<ComposioMCPSession> {
  const session = new ComposioMCPSession(config);
  // Pre-initialize the connection
  await session.getClient();
  return session;
}
