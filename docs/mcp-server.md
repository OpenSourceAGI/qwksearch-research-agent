## QwkSearch MCP Server

The QwkSearch MCP (Messaging Control Protocol) server provides a standardized interface for external AI assistants to access web search, content extraction, and rendering capabilities. This enables seamless integration with tools like Claude Desktop, GPT-4o, and other MCP-compatible AI systems.

### Core Features
- 🌐 **Web Search**: 75+ search engines across 10 categories (general, news, academic, etc)
- 📄 **Content Extraction**: PDFs, YouTube videos, and web pages with structured metadata
- 🧠 **JavaScript Rendering**: Cloudflare Browser Rendering for JavaScript-heavy sites
- 📎 **Citation Generation**: APA/MLA formatted citations
- 🔄 **Tool-call integration**: Compatible with Claude, GPT-4o, and other LLM platforms

### Quick Setup
```bash
# From repository root
cd packages/qwksearch-mcp-server
npm install
npm run start   # Starts server on stdin/stdout
```

### Environment Variables
| Variable        | Description                  | Default Value                          |
|-----------------|------------------------------|----------------------------------------|
| SCRAPER_API_KEY | Required for page rendering   | [Set in .env](https://github.com/OpenSourceAGI/qwksearch-research-agent/blob/main/apps/qwksearch-web/.env.example) |
| SCRAPER_URL     | Cloudflare scraper endpoint   | https://scraper.qwksearch.workers.dev  |

### Web API Integration
Add this middleware to `next.config.mjs`:
```js
// Add MCP support
import { createMcpMiddleware } from '@modelcontextprotocol/sdk/server/mcp.js';

module.exports = {
  middleware: [
    createMcpMiddleware({
      server: new McpServer({
        name: 'qwksearch',
        version: '1.0.0',
      }, {
        capabilities: {
          tools: {}
        }
      }),
      transport: new StdioServerTransport()
    })
  ]
};
```

### Example Request
```bash
# Search for AI research papers
curl -X POST http://localhost:3000/api/mcp/execute \
  -H "Content-Type: application/json" \
  -d '{"server_id":"qwksearch","method":"web_search","params":{"query":"AI research","category":"academic"}}"'```

### Testing
Run the test suite:
```bash
cd packages/qwksearch-mcp-server
npm test
```