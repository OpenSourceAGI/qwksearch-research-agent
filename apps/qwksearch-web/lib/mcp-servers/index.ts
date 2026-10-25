import { MCPServerUISection } from '../config/types';
import OpenConnectorMCPServer from './open-connector';
import { LobeHttpMCPServer, LobeStdioMCPServer } from './lobe-mcp';
import BaseMCPServer, { MCPServerConstructor } from './baseMCPServer';

const mcpServers: Record<string, MCPServerConstructor<any>> = {
  'open-connector': OpenConnectorMCPServer,
  'lobe-mcp': LobeHttpMCPServer,
  'lobe-mcp-stdio': LobeStdioMCPServer,
};

export const getMCPServersUIConfigSection = (): MCPServerUISection[] => {
  return Object.values(mcpServers).map((server) => {
    const metadata = server.getServerMetadata();
    return {
      name: metadata.name,
      key: metadata.key,
      fields: server.getServerConfigFields(),
    };
  });
};

export const getMCPServerByKey = (
  key: string,
): MCPServerConstructor<any> | undefined => {
  return mcpServers[key];
};

export { mcpServers, BaseMCPServer, OpenConnectorMCPServer, LobeHttpMCPServer, LobeStdioMCPServer };
export default mcpServers;
