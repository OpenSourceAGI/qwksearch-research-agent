---
name: ask-qwksearch-mcp-server
description: Guide to qwksearch-mcp-server (packages/qwksearch-mcp-server), the stdio MCP server exposing QwkSearch to any MCP client — the web_search, extract_page and render_page_with_javascript tools, their zod input schemas and text output shape, the lazily created shared Search instance, the SCRAPER_URL / SCRAPER_API_KEY environment, and how to register it with Claude Desktop or Claude Code. Use when adding or changing an MCP tool, when a tool returns isError, when render_page_with_javascript reports it is unavailable, or when wiring this server into an MCP client.
---

# Working With qwksearch-mcp-server

`packages/qwksearch-mcp-server`, published as **qwksearch-mcp-server**. A thin
`@modelcontextprotocol/sdk` server over stdio that hands three QwkSearch capabilities to
any MCP client. It is TypeScript run directly by **bun** — there is no build step and no
`dist/`.

## Setup

```bash
bun run start        # bun run bin/qwksearch-mcp.ts
bun run dev          # same, with --watch
```

Registered in an MCP client (`claude_desktop_config.json`, `.mcp.json`, …):

```json
{
  "mcpServers": {
    "qwksearch": {
      "command": "bunx",
      "args": ["qwksearch-mcp"],
      "env": { "SCRAPER_URL": "https://scraper.qwksearch.workers.dev", "SCRAPER_API_KEY": "…" }
    }
  }
}
```

The binary is `qwksearch-mcp` → `bin/qwksearch-mcp.ts`. The client must run it with a
TypeScript-capable runtime (bun), not plain `node`.

## The three tools

| Tool | Backed by | Inputs |
| --- | --- | --- |
| `web_search` | `search-web-api`'s `Search` (in-process, no network service) | `query`; `category` (`general` default, plus `news` `videos` `images` `science` `files` `it` `academic` `torrents` `social` `maps` `shopping`); `page` (1) |
| `extract_page` | `extract-webpage`'s `extractContent` — pages, PDFs and YouTube | `url`; `images` (true); `links` (true); `formatting` (true); `timeout` (10 s) |
| `render_page_with_javascript` | An HTTP POST to `{SCRAPER_URL}/api/render` (see **ask-html-renderer-api**) | `url`; `wait` (0 ms); `timeout` (30000 ms); `waitUntil` (`networkidle2`) |

All three return a single `{ type: "text" }` block of pre-formatted plain text — a
numbered result list, the article with its citation header, or the rendered HTML. None
returns structured JSON; a client that needs fields must parse the text or call the
underlying package directly.

## Recipes

**Add a tool.** Create `src/tools/<name>.ts` exporting `register<Name>Tool(server)` that
calls `server.registerTool(name, { description, inputSchema }, handler)` with a zod
shape, then import and call it in `src/index.ts` next to the other three. Follow the
existing error convention: catch, and return
`{ content: [{ type: "text", text: "… failed: " + e.message }], isError: true }` rather
than throwing — a thrown error kills the stdio session.

**The search instance is shared.** `getSearchInstance()` in `src/lib/search-instance.ts`
memoizes one `Search`, because constructing it registers all 71 engines and their health
trackers. Never `new Search()` inside a handler.

**Environment.** Only `render_page_with_javascript` reads env: `SCRAPER_URL` (default
`https://scraper.qwksearch.workers.dev`) and `SCRAPER_API_KEY`. `web_search` and
`extract_page` need nothing.

## Troubleshooting

| Symptom | Cause → fix |
| --- | --- |
| `render_page_with_javascript is unavailable: SCRAPER_API_KEY environment variable not set.` | Exactly what it says — the tool refuses to call unauthenticated. Set `SCRAPER_API_KEY` in the MCP client's `env` block, not just your shell. |
| The server exits immediately under an MCP client | The client is running `node` against a `.ts` entry. Use `bun`/`bunx`. |
| `Render failed: …` with a 401 body | The key does not match the worker's `SCRAPER_API_KEY` binding. |
| `No search results found` for a query that works elsewhere | `category` maps to `search.search(query, page, undefined, [category])`, and the enum includes values (`science`, `files`) with no engines registered under them. Try `general` or `academic`. |
| `Could not extract content from "…"` | `extractContent` returned an `error`. Raise `timeout`, or fall back to `render_page_with_javascript` for bot-protected pages. |
| Tool output is hard to consume programmatically | It is formatted text by design. Import `search-web-api` / `extract-webpage` directly if you need objects. |
| A tool change doesn't take effect | Restart the MCP client — stdio servers are spawned once per session. `bun run dev` only helps when you launched the server yourself. |
| stdout noise corrupts the protocol | Stdio MCP uses stdout for framing. `search-web-api` logs to `console.log`/`console.error`; keep new logging on stderr. |
