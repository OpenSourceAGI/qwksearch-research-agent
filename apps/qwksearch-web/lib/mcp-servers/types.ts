import { MCPServerMetadata } from './baseMCPServer';

export type MCPTool = {
  name: string;
  description: string;
  inputSchema?: any;
};

export type MCPServerType = 'open-connector' | 'custom';

export type { MCPServerMetadata };
