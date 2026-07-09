/**
 * @fileoverview Composio + Mastra Integration
 *
 * Connects Composio's MCP endpoint to Mastra agents.
 * Composio provides the tools, Mastra provides the agent framework.
 *
 * Architecture:
 * 1. Create Composio Tool Router session → Get MCP URL + headers
 * 2. Configure Mastra MCPClient with URL + headers
 * 3. Get tools with mcp.listTools() or mcp.listToolsets()
 * 4. Create Mastra Agent with tools
 * 5. Execute agent.generate() with multi-step tool calling
 *
 * @see https://composio.dev/toolkits/composio/framework/mastra-ai
 */

import { Composio } from '@composio/core';
import { Agent } from '@mastra/core/agent';
import { MCPClient } from '@mastra/mcp';

/**
 * Configuration for Composio + Mastra integration
 */
export interface ComposioMastraConfig {
  /** Composio API key */
  composioApiKey: string;
  /** User ID for scoping the session */
  userId: string;
  /** Toolkits to enable */
  toolkits: string[];
  /** Agent configuration */
  agent: {
    id: string;
    name: string;
    instructions: string;
    model: any; // Mastra model instance (e.g., openai('gpt-4o'))
    maxSteps?: number;
  };
  /** Whether to require approval before tool execution */
  requireToolApproval?: boolean;
}

/**
 * Composio + Mastra session manager
 * Handles MCP connection lifecycle and agent creation
 */
export class ComposioMastraSession {
  private composio: Composio;
  private mcpClient: MCPClient | null = null;
  private agent: Agent | null = null;
  private sessionEndpoint: { url: string; headers: Record<string, string> } | null =
    null;

  constructor(private config: ComposioMastraConfig) {
    this.composio = new Composio({
      apiKey: config.composioApiKey,
    });
  }

  /**
   * Create Composio Tool Router session
   * Returns MCP endpoint URL + auth headers
   */
  private async createSession() {
    if (this.sessionEndpoint) {
      return this.sessionEndpoint;
    }

    // Create Composio Tool Router session with specified toolkits.
    // `mcp: true` surfaces the session's MCP endpoint (url + headers).
    const session = await this.composio.toolRouter.create(this.config.userId, {
      toolkits: this.config.toolkits,
      mcp: true,
    });

    this.sessionEndpoint = {
      url: session.mcp.url,
      headers: {
        'x-api-key': this.config.composioApiKey,
        ...(session.mcp.headers ?? {}),
      },
    };

    return this.sessionEndpoint;
  }

  /**
   * Get or create Mastra MCP client
   * Connects to Composio's MCP endpoint via HTTP
   */
  async getMCPClient(): Promise<MCPClient> {
    if (this.mcpClient) {
      return this.mcpClient;
    }

    const endpoint = await this.createSession();

    // Create Mastra MCP client
    this.mcpClient = new MCPClient({
      id: `composio-${this.config.userId}`,
      servers: {
        composio: {
          url: new URL(endpoint.url),
          requestInit: {
            headers: endpoint.headers,
          },
        },
      },
    });

    return this.mcpClient;
  }

  /**
   * Get tools from Composio MCP
   * Use for static agent setup (same tools for all requests)
   */
  async getTools() {
    const mcp = await this.getMCPClient();
    return await mcp.listTools();
  }

  /**
   * Get toolsets from Composio MCP
   * Use for dynamic per-request tool configuration
   */
  async getToolsets() {
    const mcp = await this.getMCPClient();
    return await mcp.listToolsets();
  }

  /**
   * Create or get Mastra agent with Composio tools
   * Agent is cached and reused across generate() calls
   */
  async getAgent(): Promise<Agent> {
    if (this.agent) {
      return this.agent;
    }

    const tools = await this.getTools();

    this.agent = new Agent({
      id: this.config.agent.id,
      name: this.config.agent.name,
      instructions: this.config.agent.instructions,
      model: this.config.agent.model,
      tools,
    });

    return this.agent;
  }

  /**
   * Execute agent with a prompt
   * Handles multi-step tool calling automatically
   *
   * @param prompt - User prompt
   * @param options - Generation options
   * @returns Agent response with text and tool calls
   */
  async generate(
    prompt: string,
    options?: {
      maxSteps?: number;
      /** Extra context messages passed to the agent (model messages) */
      context?: any[];
    }
  ) {
    const agent = await this.getAgent();

    return await agent.generate(prompt, {
      maxSteps: options?.maxSteps || this.config.agent.maxSteps || 5,
      ...(options?.context && { context: options.context }),
    });
  }

  /**
   * Clean up MCP connection and agent
   * Call when done with the session
   */
  async cleanup() {
    if (this.mcpClient) {
      await this.mcpClient.disconnect();
      this.mcpClient = null;
    }
    this.agent = null;
    this.sessionEndpoint = null;
  }
}

/**
 * Quick helper to create a Composio + Mastra agent
 * For one-off usage without session management
 *
 * @example
 * ```ts
 * const result = await createComposioMastraAgent({
 *   composioApiKey: process.env.COMPOSIO_API_KEY!,
 *   userId: 'user-123',
 *   toolkits: ['GMAIL', 'SLACK'],
 *   agent: {
 *     id: 'email-agent',
 *     name: 'Email Assistant',
 *     instructions: 'Help with email tasks',
 *     model: openai('gpt-4o'),
 *   },
 * }).generate('Check my unread emails');
 * ```
 */
export async function createComposioMastraAgent(config: ComposioMastraConfig) {
  const session = new ComposioMastraSession(config);
  await session.getAgent(); // Initialize
  return session;
}

/**
 * Create Mastra agent with dynamic per-request toolsets
 * Better for multi-user scenarios where tools vary per request
 *
 * @example
 * ```ts
 * const agent = await createDynamicComposioAgent({
 *   composioApiKey: process.env.COMPOSIO_API_KEY!,
 *   agent: {
 *     id: 'dynamic-agent',
 *     name: 'Dynamic Assistant',
 *     instructions: 'Use available tools',
 *     model: openai('gpt-4o'),
 *   },
 * });
 *
 * // Each request can have different userId/toolkits
 * const result = await agent.generate({
 *   userId: 'user-123',
 *   toolkits: ['GMAIL'],
 *   prompt: 'Check emails',
 * });
 * ```
 */
export async function createDynamicComposioAgent(config: {
  composioApiKey: string;
  agent: {
    id: string;
    name: string;
    instructions: string;
    model: any;
    maxSteps?: number;
  };
}) {
  const composio = new Composio({
    apiKey: config.composioApiKey,
  });

  return {
    async generate(params: {
      userId: string;
      toolkits: string[];
      prompt: string;
      maxSteps?: number;
    }) {
      // Create Tool Router session for this user/toolkits
      const session = await composio.toolRouter.create(params.userId, {
        toolkits: params.toolkits,
        mcp: true,
      });

      // Connect MCP client
      const mcp = new MCPClient({
        id: `composio-${params.userId}`,
        servers: {
          composio: {
            url: new URL(session.mcp.url),
            requestInit: {
              headers: {
                'x-api-key': config.composioApiKey,
                ...(session.mcp.headers ?? {}),
              },
            },
          },
        },
      });

      try {
        // Get toolsets for this request
        const toolsets = await mcp.listToolsets();

        // Create agent; toolsets are provided per-request at generate time
        const agent = new Agent({
          id: config.agent.id,
          name: config.agent.name,
          instructions: config.agent.instructions,
          model: config.agent.model,
        });

        // Execute with dynamic toolsets
        return await agent.generate(params.prompt, {
          maxSteps: params.maxSteps || config.agent.maxSteps || 5,
          toolsets,
        });
      } finally {
        await mcp.disconnect();
      }
    },
  };
}
