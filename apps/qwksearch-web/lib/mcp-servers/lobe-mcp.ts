import { UIConfigField } from '../config/types';
import BaseMCPServer, { MCPServerMetadata } from './baseMCPServer';
import { MCPTool } from './types';

/**
 * MCP servers the chat agent calls through LobeChat's MCP client (see
 * `lib/lobe-engine/mcp-tools.ts`). These classes describe the settings form
 * and validate what it saves; the connection itself is made by the chat
 * engine when a message is sent.
 */

type LobeHttpMCPConfig = {
  url: string;
  authToken?: string;
  headers?: string;
};

type LobeStdioMCPConfig = {
  command: string;
  args?: string;
  env?: string;
};

const assertJsonObject = (value: unknown, field: string) => {
  if (value === undefined || value === '') return;
  try {
    const parsed = JSON.parse(String(value));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error();
  } catch {
    throw new Error(`Invalid config: ${field} must be a JSON object`);
  }
};

/** A remote MCP server over Streamable HTTP. Works on the Cloudflare Worker. */
export class LobeHttpMCPServer extends BaseMCPServer<LobeHttpMCPConfig> {
  async connect(): Promise<void> {}
  async disconnect(): Promise<void> {}
  async getTools(): Promise<MCPTool[]> {
    return [];
  }
  isConnected(): boolean {
    return false;
  }

  static getServerConfigFields(): UIConfigField[] {
    return [
      {
        name: 'Server URL',
        key: 'url',
        type: 'string',
        required: true,
        description: 'The MCP server endpoint (Streamable HTTP), e.g. https://example.com/mcp',
        scope: 'server',
        placeholder: 'https://example.com/mcp',
        env: 'MCP_SERVER_URL',
      },
      {
        name: 'Bearer Token',
        key: 'authToken',
        type: 'password',
        required: false,
        description: 'Sent as "Authorization: Bearer <token>" when set',
        scope: 'server',
        placeholder: 'Optional',
        env: 'MCP_SERVER_TOKEN',
      },
      {
        name: 'Headers',
        key: 'headers',
        type: 'textarea',
        required: false,
        description: 'Extra request headers as a JSON object, e.g. {"X-API-Key": "..."}',
        scope: 'server',
        placeholder: '{}',
      },
    ];
  }

  static getServerMetadata(): MCPServerMetadata {
    return {
      name: 'MCP Server (HTTP)',
      key: 'lobe-mcp',
      description: 'Give the chat agent the tools of any remote MCP server',
      icon: '🧩',
    };
  }

  static parseAndValidate(raw: any): LobeHttpMCPConfig {
    if (!raw || typeof raw !== 'object') throw new Error('Invalid config: must be an object');
    const { url, authToken, headers } = raw;
    if (!url || typeof url !== 'string') throw new Error('Invalid config: url is required and must be a string');
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') throw new Error();
    } catch {
      throw new Error('Invalid config: url must be an http(s) URL');
    }
    assertJsonObject(headers, 'headers');
    return {
      url,
      ...(authToken ? { authToken: String(authToken) } : {}),
      ...(headers ? { headers: String(headers) } : {}),
    };
  }
}

/** A local MCP server started as a command. Needs a Node runtime; skipped on the Worker. */
export class LobeStdioMCPServer extends BaseMCPServer<LobeStdioMCPConfig> {
  async connect(): Promise<void> {}
  async disconnect(): Promise<void> {}
  async getTools(): Promise<MCPTool[]> {
    return [];
  }
  isConnected(): boolean {
    return false;
  }

  static getServerConfigFields(): UIConfigField[] {
    return [
      {
        name: 'Command',
        key: 'command',
        type: 'string',
        required: true,
        description: 'The command that starts the server, e.g. npx (local and self-hosted Node only)',
        scope: 'server',
        placeholder: 'npx',
        env: 'MCP_SERVER_COMMAND',
      },
      {
        name: 'Arguments',
        key: 'args',
        type: 'string',
        required: false,
        description: 'Space-separated arguments, or a JSON array',
        scope: 'server',
        placeholder: '-y @modelcontextprotocol/server-everything',
        env: 'MCP_SERVER_ARGS',
      },
      {
        name: 'Environment',
        key: 'env',
        type: 'textarea',
        required: false,
        description: 'Environment variables for the process as a JSON object',
        scope: 'server',
        placeholder: '{}',
      },
    ];
  }

  static getServerMetadata(): MCPServerMetadata {
    return {
      name: 'MCP Server (local command)',
      key: 'lobe-mcp-stdio',
      description: 'Run a local MCP server for the chat agent (needs a Node runtime, not the Cloudflare Worker)',
      icon: '🖥️',
    };
  }

  static parseAndValidate(raw: any): LobeStdioMCPConfig {
    if (!raw || typeof raw !== 'object') throw new Error('Invalid config: must be an object');
    const { command, args, env } = raw;
    if (!command || typeof command !== 'string') {
      throw new Error('Invalid config: command is required and must be a string');
    }
    assertJsonObject(env, 'env');
    return {
      command,
      ...(args ? { args: String(args) } : {}),
      ...(env ? { env: String(env) } : {}),
    };
  }
}
