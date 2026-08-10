## QwkSearch MCP Server

The QwkSearch MCP server enables integrated messaging control protocol support for connecting with compatible AI assistants and tools.

### Features
- Seamless integration with MCP-compatible clients
- Exposes QwkSearch search and extraction capabilities
- Supports tool-call-style interactions from AI assistants

### Setup
From repository root:
```bash
cd packages/qwksearch-mcp-server
npm install
npm run start
```

### Configuration
Configure in your MCP client (e.g., Claude Desktop):
```json
{
  "mcpServers": {
    "qwksearch": {
      "command": "node",
      "args": ["packages/qwksearch-mcp-server/dist/index.js"],
      "env": {}
    }
  }
}
```

### Capabilities
- Web search across 100+ sites
- PDF/YouTube/URL extraction
- AI-powered summarization
- Citation generation (APA/MLA)

For usage examples, see test files in `/packages/qwksearch-mcp-server/test`.