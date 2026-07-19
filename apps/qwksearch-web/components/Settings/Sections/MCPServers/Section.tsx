import React, { useState } from 'react';
import AddMCPServer from './AddMCPServerDialog';
import {
  MCPServerConfig,
  MCPServerUISection,
  UIConfigField,
} from '../../../../lib/config/types';
import MCPServerCard from './MCPServerCard';
import OpenConnectorApps from './OpenConnectorApps';

const MCPServers = ({
  fields,
  values,
}: {
  fields: MCPServerUISection[];
  values: MCPServerConfig[];
}) => {
  const [servers, setServers] = useState<MCPServerConfig[]>(values);

  return (
    <div className="flex-1 space-y-6 overflow-y-auto py-6">
      <div className="flex flex-row justify-between items-center px-6 ">
        <div className="flex flex-col gap-y-1">
          <p className="text-sm font-medium text-black dark:text-white">
            MCP Servers
          </p>
          <p className="text-xs text-black/70 dark:text-white/70">
            Connect to Model Context Protocol servers for enhanced AI capabilities
          </p>
        </div>
        <AddMCPServer mcpServers={fields} setServers={setServers} />
      </div>
      <div className="border-t border-light-200 dark:border-dark-200" />
      <div className="flex flex-col px-6 gap-y-4">
        {servers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 rounded-lg border-2 border-dashed border-light-200 dark:border-dark-200 bg-light-secondary/10 dark:bg-dark-secondary/10">
            <div className="p-3 rounded-full bg-blue-500/10 dark:bg-blue-500/10 mb-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-8 h-8 text-blue-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <p className="text-sm font-medium text-black/70 dark:text-white/70 mb-1">
              No MCP servers configured
            </p>
            <p className="text-xs text-black/50 dark:text-white/50 text-center max-w-sm mb-4">
              Add an MCP server to access tools like OpenConnector, filesystem access, and more.
            </p>
          </div>
        ) : (
          servers.map((server) => (
            <MCPServerCard
              key={`mcpserver-${server.id}`}
              fields={
                (fields.find((f) => f.key === server.type)?.fields ??
                  []) as UIConfigField[]
              }
              mcpServer={server}
              setServers={setServers}
            />
          ))
        )}
      </div>
      <div className="border-t border-light-200 dark:border-dark-200 mx-6" />
      <OpenConnectorApps />
    </div>
  );
};

export default MCPServers;
