## MCP Server Integration

The QwkSearch web app now includes MCP (Messaging Control Protocol) server integration, allowing seamless communication with MCP-compatible clients like Claude Desktop.

### API Endpoints

1. **`POST /api/mcp/echo`**
   - Basic MCP endpoint for testing
   - Request: `{ "command": "{...}"}`
   - Response: `{ "result": "Command echoed"}`

2. **`POST /api/mcp/execute`**
   - Execute custom MCP commands
   - Request:
     ```json
     {
       "server_id": "qwksearch",
       "method": "search",
       "params": {"query": " llm research "}
     }
     ```
   - Response: Search results with citations

### Server Configuration
Add to `apps/qwksearch-web/app/next.config.mjs`:

```js
// Next.js config
module.exports = {
  middleware: [
    // Add MCP middleware
    async (req, res) => {
      if (req.path === '/api/mcp') {
        // Handle MCP requests here
        const { server_id, method, params } = req.body

        if (method === 'search') {
          const results = await qwksearchApiClient.search(params.query)
          res.json({ result: results })
        }
      }
    }
  ]
}
```