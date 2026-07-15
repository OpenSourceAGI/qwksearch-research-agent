import { MCPServerUISection } from '../config/types';
import OpenConnectorMCPServer from './open-connector';
import BaseMCPServer, { MCPServerConstructor } from './baseMCPServer';

const mcpServers: Record<string, MCPServerConstructor<any>> = {
  'open-connector': OpenConnectorMCPServer,
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

export { mcpServers, BaseMCPServer, OpenConnectorMCPServer };
export default mcpServers;
