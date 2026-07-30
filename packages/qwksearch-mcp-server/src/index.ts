import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerWebSearchTool } from "./tools/web-search.js";
import { registerExtractPageTool } from "./tools/extract-page.js";
import { registerRenderPageTool } from "./tools/render-page.js";

const server = new McpServer({
  name: "qwksearch",
  version: "1.0.0",
}, {
  capabilities: { tools: {} },
});

registerWebSearchTool(server);
registerExtractPageTool(server);
registerRenderPageTool(server);

const transport = new StdioServerTransport();
await server.connect(transport);
