/**
 * @fileoverview OpenConnector MCP Integration for AI SDK v5
 *
 * OpenConnector is a self-hosted Cloudflare Workers integration platform
 * that provides OAuth-managed access to 100+ apps. This module creates
 * MCP clients connected to OpenConnector's HTTP endpoints, fetches
 * available tools, and passes them to AI SDK models.
 *
 * Architecture:
 * 1. Connect to OpenConnector Worker URL at /mcp/sse
 * 2. Authenticate with admin token via Authorization header
 * 3. Fetch tools with client.tools()
 * 4. Pass to streamText/generateText
 *
 * @see https://github.com/OpenSourceAGI/open-connector
 */

import { createMCPClient } from '@ai-sdk/mcp';
import type { MCPClient } from '@ai-sdk/mcp';
import type { ToolSet } from 'ai';

/**
 * Configuration for OpenConnector MCP session
 */
export interface OpenConnectorMCPConfig {
  /** OpenConnector admin token (OPEN_CONNECTOR_ADMIN_TOKEN) */
  adminToken: string;
  /** Base URL of the deployed OpenConnector Worker */
  baseUrl: string;
  /** User ID to scope the session */
  userId: string;
  /** Apps to enable (e.g., ['gmail', 'notion', 'slack']) */
  apps: string[];
}

/**
 * OpenConnector MCP session wrapper
 * Manages the lifecycle of MCP client connections to OpenConnector
 */
export class OpenConnectorMCPSession {
  private client: MCPClient | null = null;

  constructor(private config: OpenConnectorMCPConfig) {}

  /**
   * Get or create the MCP client connection
   * Uses HTTP SSE transport as provided by OpenConnector
   */
  async getClient(): Promise<MCPClient> {
    if (this.client) {
      return this.client;
    }

    // Construct MCP endpoint URL
    const mcpUrl = `${this.config.baseUrl}/mcp/sse`;

    // Connect to OpenConnector MCP endpoint via HTTP
    this.client = await createMCPClient({
      transport: {
        type: 'http',
        url: mcpUrl,
        headers: {
          Authorization: `Bearer ${this.config.adminToken}`,
        },
        redirect: 'error',
      },
    });

    return this.client;
  }

  /**
   * Get all available tools from OpenConnector MCP
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
   * Health check for the OpenConnector Worker
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/health`, {
        headers: {
          Authorization: `Bearer ${this.config.adminToken}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

/**
 * Helper function to create a one-shot OpenConnector MCP session
 * For quick tool usage without managing session lifecycle
 *
 * @example
 * ```ts
 * const tools = await getOpenConnectorTools({
 *   adminToken: process.env.OPEN_CONNECTOR_ADMIN_TOKEN!,
 *   baseUrl: 'https://open-connector.example.workers.dev',
 *   userId: 'user-123',
 *   apps: ['gmail', 'slack'],
 * });
 *
 * const result = await generateText({
 *   model: openai('gpt-4o'),
 *   prompt: 'Check my unread emails',
 *   tools,
 * });
 * ```
 */
export async function getOpenConnectorTools(
  config: OpenConnectorMCPConfig
): Promise<ToolSet> {
  const session = new OpenConnectorMCPSession(config);
  try {
    return await session.getTools();
  } finally {
    await session.close();
  }
}

/**
 * Create a reusable OpenConnector MCP session
 * Better for multiple requests with the same apps
 *
 * @example
 * ```ts
 * const session = await createOpenConnectorSession({
 *   adminToken: process.env.OPEN_CONNECTOR_ADMIN_TOKEN!,
 *   baseUrl: 'https://open-connector.example.workers.dev',
 *   userId: 'user-123',
 *   apps: ['gmail', 'notion'],
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
export async function createOpenConnectorSession(
  config: OpenConnectorMCPConfig
): Promise<OpenConnectorMCPSession> {
  const session = new OpenConnectorMCPSession(config);
  // Pre-initialize the connection
  await session.getClient();
  return session;
}
