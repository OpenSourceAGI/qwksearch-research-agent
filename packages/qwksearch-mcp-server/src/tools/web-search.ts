import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getSearchInstance } from "../lib/search-instance.js";

export function registerWebSearchTool(server: McpServer) {
  server.registerTool("web_search", {
    description:
      "Search the web for information on any topic. Returns relevant search results with titles, descriptions, and URLs from 75+ search engines across 10 categories.",
    inputSchema: {
      query: z.string().describe("Search query string"),
      category: z
        .enum(["general", "news", "videos", "images", "science", "files", "it", "academic", "torrents", "social", "maps", "shopping"])
        .optional()
        .default("general")
        .describe("Search category to focus results"),
      page: z
        .number()
        .optional()
        .default(1)
        .describe("Result page number"),
    },
  }, async ({ query, category, page }) => {
    try {
      const search = getSearchInstance();
      const results = await search.search(query, page, undefined, [category]);

      if (!results || results.length === 0) {
        return {
          content: [{ type: "text" as const, text: `No search results found for "${query}".` }],
        };
      }

      let text = `Search results for "${query}" (${category}):\n\n`;
      for (const [i, r] of results.entries()) {
        text += `${i + 1}. ${r.title}\n`;
        text += `   URL: ${r.url || r.link}\n`;
        if (r.content) text += `   ${r.content}\n`;
        if (r.engines?.length) text += `   Sources: ${r.engines.join(", ")}\n`;
        text += "\n";
      }
      text += `Found ${results.length} results.`;

      return { content: [{ type: "text" as const, text }] };
    } catch (error: any) {
      return {
        content: [{ type: "text" as const, text: `Search failed: ${error.message}` }],
        isError: true,
      };
    }
  });
}
