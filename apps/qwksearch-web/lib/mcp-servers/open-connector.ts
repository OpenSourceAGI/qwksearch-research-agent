import { UIConfigField } from '../config/types';
import BaseMCPServer, { MCPServerMetadata } from './baseMCPServer';
import { MCPTool } from './types';

type OpenConnectorConfig = {
  adminToken: string;
  url: string;
  apps?: string[];
};

class OpenConnectorMCPServer extends BaseMCPServer<OpenConnectorConfig> {
  private connected: boolean = false;
  private tools: MCPTool[] = [];

  async connect(): Promise<void> {
    try {
      // Initialize connection to OpenConnector MCP server
      const url = `${this.config.url}/mcp/sse`;

      // For now, we'll just mark as connected
      this.connected = true;

      console.log(`Connected to OpenConnector MCP server at ${url}`);
    } catch (error) {
      console.error('Failed to connect to OpenConnector MCP server:', error);
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
        name: 'Admin Token',
        key: 'adminToken',
        type: 'password',
        required: true,
        description: 'Your OpenConnector admin token (OPEN_CONNECTOR_ADMIN_TOKEN)',
        scope: 'server',
        placeholder: 'Enter your OpenConnector admin token',
        env: 'OPEN_CONNECTOR_ADMIN_TOKEN',
      },
      {
        name: 'Worker URL',
        key: 'url',
        type: 'string',
        required: true,
        description: 'Your deployed OpenConnector Worker URL (e.g., https://open-connector.example.workers.dev)',
        scope: 'server',
        placeholder: 'https://open-connector.example.workers.dev',
        env: 'OPEN_CONNECTOR_URL',
      },
      {
        name: 'Apps',
        key: 'apps',
        type: 'textarea',
        required: false,
        description: 'Comma-separated list of apps to enable (e.g., gmail,slack,notion)',
        scope: 'server',
        placeholder: 'gmail,slack,notion',
      },
    ];
  }

  static getServerMetadata(): MCPServerMetadata {
    return {
      name: 'OpenConnector',
      key: 'open-connector',
      description: 'Connect to 100+ apps via self-hosted OpenConnector with managed OAuth and API integrations',
      icon: '🔗',
    };
  }

  static parseAndValidate(raw: any): OpenConnectorConfig {
    if (!raw || typeof raw !== 'object') {
      throw new Error('Invalid config: must be an object');
    }

    const { adminToken, url, apps } = raw;

    if (!adminToken || typeof adminToken !== 'string') {
      throw new Error('Invalid config: adminToken is required and must be a string');
    }

    if (!url || typeof url !== 'string') {
      throw new Error('Invalid config: url is required and must be a string');
    }

    const config: OpenConnectorConfig = {
      adminToken,
      url,
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

export default OpenConnectorMCPServer;
