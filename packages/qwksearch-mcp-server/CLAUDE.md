# CLAUDE.md — `qwksearch-mcp-server`

**Read [`skills/ask-qwksearch-mcp-server`](../../skills/ask-qwksearch-mcp-server/SKILL.md)
first.**

An MCP server exposing web search and content extraction as tools, over
**stdio**. Published.

## stdio is the transport — stdout is the protocol

- **Never `console.log` to stdout.** A stray log line corrupts the JSON-RPC
  stream and the client disconnects with a parse error that points nowhere near
  the cause. Diagnostics go to stderr.
- Startup must be fast and must not require a browser or a long-lived service —
  clients spawn and kill this process routinely.

## Tool design

- **Tool names and schemas are the API.** An agent picks a tool from its
  description; renaming one breaks every configured client, and a vague
  description is a correctness bug, not a docs bug.
- Return structured, bounded results. An unbounded extraction dumped into a
  model's context is a cost and quality problem.
- Errors are results, not crashes: a failed search should return an error the
  agent can read, not kill the server.
