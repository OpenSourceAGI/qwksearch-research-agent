import { UIConfigField } from '../config/types';
import BaseMCPServer, { MCPServerMetadata } from './baseMCPServer';
import { MCPTool } from './types';

type ComposioConfig = {
  apiKey: string;
  url?: string;
  apps?: string[];
};

class ComposioMCPServer extends BaseMCPServer<ComposioConfig> {
  private connected: boolean = false;
  private tools: MCPTool[] = [];

  async connect(): Promise<void> {
    try {
      // Initialize connection to Composio MCP server
      const url = this.config.url || 'https://mcp.composio.dev/sse';

      // For now, we'll just mark as connected
      this.connected = true;

      console.log(`Connected to Composio MCP server at ${url}`);
    } catch (error) {
      console.error('Failed to connect to Composio MCP server:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.tools = [];
  }

  async getTools(): Promise<MCPTool[]> {
    if (!this.connected) {
      await this.connect();
    }

    // In a real implementation, this would fetch tools from the MCP server
    return this.tools;
  }

  isConnected(): boolean {
    return this.connected;
  }

  static getServerConfigFields(): UIConfigField[] {
    return [
      {
        name: 'API Key',
        key: 'apiKey',
        type: 'password',
        required: true,
        description: 'Your Composio API key',
        scope: 'server',
        placeholder: 'Enter your Composio API key',
        env: 'COMPOSIO_API_KEY',
      },
      {
        name: 'MCP Server URL',
        key: 'url',
        type: 'string',
        required: false,
        description: 'Composio MCP server URL (default: https://mcp.composio.dev/sse)',
        scope: 'server',
        placeholder: 'https://mcp.composio.dev/sse',
        default: 'https://mcp.composio.dev/sse',
        env: 'COMPOSIO_MCP_URL',
      },
      {
        name: 'Apps',
        key: 'apps',
        type: 'textarea',
        required: false,
        description: 'Comma-separated list of apps to enable (e.g., github,slack,gmail)',
        scope: 'server',
        placeholder: 'github,slack,gmail',
      },
    ];
  }

  static getServerMetadata(): MCPServerMetadata {
    return {
      name: 'Composio',
      key: 'composio',
      description: 'Connect to 100+ apps via Composio MCP server with managed OAuth and API integrations',
      icon: '🔗',
    };
  }

  static parseAndValidate(raw: any): ComposioConfig {
    if (!raw || typeof raw !== 'object') {
      throw new Error('Invalid config: must be an object');
    }

    const { apiKey, url, apps } = raw;

    if (!apiKey || typeof apiKey !== 'string') {
      throw new Error('Invalid config: apiKey is required and must be a string');
    }

    const config: ComposioConfig = {
      apiKey,
      url: url || 'https://mcp.composio.dev/sse',
    };

    if (apps) {
      if (typeof apps === 'string') {
        config.apps = apps.split(',').map((app) => app.trim());
      } else if (Array.isArray(apps)) {
        config.apps = apps;
      }
    }

    return config;
  }
}

export default ComposioMCPServer;
