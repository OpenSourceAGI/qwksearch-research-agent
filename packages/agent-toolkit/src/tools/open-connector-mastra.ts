/**
 * @fileoverview OpenConnector + Mastra Integration
 *
 * Connects OpenConnector's MCP endpoint to Mastra agents.
 * OpenConnector provides the tools, Mastra provides the agent framework.
 *
 * Architecture:
 * 1. Connect to OpenConnector Worker URL at /mcp/sse
 * 2. Configure Mastra MCPClient with URL + auth headers
 * 3. Get tools with mcp.listTools() or mcp.listToolsets()
 * 4. Create Mastra Agent with tools
 * 5. Execute agent.generate() with multi-step tool calling
 *
 * @see https://github.com/OpenSourceAGI/open-connector
 */

import { Agent } from '@mastra/core/agent';
import { MCPClient } from '@mastra/mcp';

/**
 * Configuration for OpenConnector + Mastra integration
 */
export interface OpenConnectorMastraConfig {
  /** OpenConnector admin token */
  adminToken: string;
  /** Base URL of the deployed OpenConnector Worker */
  baseUrl: string;
  /** User ID for scoping the session */
  userId: string;
  /** Apps to enable */
  apps: string[];
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
 * OpenConnector + Mastra session manager
 * Handles MCP connection lifecycle and agent creation
 */
export class OpenConnectorMastraSession {
  private mcpClient: MCPClient | null = null;
  private agent: Agent | null = null;

  constructor(private config: OpenConnectorMastraConfig) {}

  /**
   * Get or create Mastra MCP client
   * Connects to OpenConnector's MCP endpoint via HTTP
   */
  async getMCPClient(): Promise<MCPClient> {
    if (this.mcpClient) {
      return this.mcpClient;
    }

    const mcpUrl = `${this.config.baseUrl}/mcp/sse`;

    // Create Mastra MCP client
    this.mcpClient = new MCPClient({
      id: `open-connector-${this.config.userId}`,
      servers: {
        openconnector: {
          url: new URL(mcpUrl),
          requestInit: {
            headers: {
              Authorization: `Bearer ${this.config.adminToken}`,
            },
          },
        },
      },
    });

    return this.mcpClient;
  }

  /**
   * Get tools from OpenConnector MCP
   * Use for static agent setup (same tools for all requests)
   */
  async getTools() {
    const mcp = await this.getMCPClient();
    return await mcp.listTools();
  }

  /**
   * Get toolsets from OpenConnector MCP
   * Use for dynamic per-request tool configuration
   */
  async getToolsets() {
    const mcp = await this.getMCPClient();
    return await mcp.listToolsets();
  }

  /**
   * Create or get Mastra agent with OpenConnector tools
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
  }
}

/**
 * Quick helper to create an OpenConnector + Mastra agent
 * For one-off usage without session management
 *
 * @example
 * ```ts
 * const result = await createOpenConnectorMastraAgent({
 *   adminToken: process.env.OPEN_CONNECTOR_ADMIN_TOKEN!,
 *   baseUrl: 'https://open-connector.example.workers.dev',
 *   userId: 'user-123',
 *   apps: ['gmail', 'slack'],
 *   agent: {
 *     id: 'email-agent',
 *     name: 'Email Assistant',
 *     instructions: 'Help with email tasks',
 *     model: openai('gpt-4o'),
 *   },
 * }).generate('Check my unread emails');
 * ```
 */
export async function createOpenConnectorMastraAgent(
  config: OpenConnectorMastraConfig
) {
  const session = new OpenConnectorMastraSession(config);
  await session.getAgent(); // Initialize
  return session;
}

/**
 * Create Mastra agent with dynamic per-request apps
 * Better for multi-user scenarios where tools vary per request
 *
 * @example
 * ```ts
 * const agent = await createDynamicOpenConnectorAgent({
 *   adminToken: process.env.OPEN_CONNECTOR_ADMIN_TOKEN!,
 *   baseUrl: 'https://open-connector.example.workers.dev',
 *   agent: {
 *     id: 'dynamic-agent',
 *     name: 'Dynamic Assistant',
 *     instructions: 'Use available tools',
 *     model: openai('gpt-4o'),
 *   },
 * });
 *
 * // Each request can have different userId/apps
 * const result = await agent.generate({
 *   userId: 'user-123',
 *   apps: ['gmail'],
 *   prompt: 'Check emails',
 * });
 * ```
 */
export async function createDynamicOpenConnectorAgent(config: {
  adminToken: string;
  baseUrl: string;
  agent: {
    id: string;
    name: string;
    instructions: string;
    model: any;
    maxSteps?: number;
  };
}) {
  return {
    async generate(params: {
      userId: string;
      apps: string[];
      prompt: string;
      maxSteps?: number;
    }) {
      const mcpUrl = `${config.baseUrl}/mcp/sse`;

      // Connect MCP client
      const mcp = new MCPClient({
        id: `open-connector-${params.userId}`,
        servers: {
          openconnector: {
            url: new URL(mcpUrl),
            requestInit: {
              headers: {
                Authorization: `Bearer ${config.adminToken}`,
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
