import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export type RegisteredTool = {
  name: string;
  config: {
    description: string;
    inputSchema: Record<string, unknown>;
  };
  handler: (args: Record<string, unknown>) => Promise<{
    content: { type: 'text'; text: string }[];
    isError?: boolean;
  }>;
};

/**
 * Captures `registerTool` calls so a tool's handler can be invoked directly,
 * without standing up an MCP transport.
 */
export function createFakeServer() {
  const tools = new Map<string, RegisteredTool>();

  const server = {
    registerTool(name: string, config: RegisteredTool['config'], handler: RegisteredTool['handler']) {
      tools.set(name, { name, config, handler });
    },
  };

  return {
    server: server as unknown as McpServer,
    tools,
    get(name: string): RegisteredTool {
      const tool = tools.get(name);
      if (!tool) throw new Error(`Tool "${name}" was never registered`);
      return tool;
    },
  };
}
