import { createMCPClient } from "@ai-sdk/mcp";
import { Experimental_StdioMCPTransport } from "@ai-sdk/mcp/mcp-stdio";
import type { MCPClient } from "@ai-sdk/mcp";
import type { ToolSet } from "ai";

export interface QwkSearchMCPConfig {
  command?: string;
  args?: string[];
  env?: Record<string, string>;
}

/**
 * Long-lived MCP session for QwkSearch tools.
 * Spawns a local MCP server process and keeps it alive across tool calls.
 */
export class QwkSearchMCPSession {
  private client: MCPClient | null = null;
  private config: QwkSearchMCPConfig;

  constructor(config: QwkSearchMCPConfig = {}) {
    this.config = config;
  }

  async getTools(): Promise<ToolSet> {
    if (!this.client) {
      this.client = await createMCPClient({
        transport: new Experimental_StdioMCPTransport({
          command: this.config.command || "bun",
          args: this.config.args || ["run", "qwksearch-mcp-server/bin/qwksearch-mcp.ts"],
          env: {
            ...process.env as Record<string, string>,
            ...this.config.env,
          },
        }),
      });
    }
    return (await this.client.tools()) as ToolSet;
  }

  async close() {
    await this.client?.close();
    this.client = null;
  }
}

/**
 * One-shot helper to get QwkSearch MCP tools.
 * Creates a session, fetches tools, and returns them.
 * Caller should close the returned session when done.
 */
export async function getQwkSearchTools(
  config?: QwkSearchMCPConfig
): Promise<{ tools: ToolSet; session: QwkSearchMCPSession }> {
  const session = new QwkSearchMCPSession(config);
  const tools = await session.getTools();
  return { tools, session };
}
