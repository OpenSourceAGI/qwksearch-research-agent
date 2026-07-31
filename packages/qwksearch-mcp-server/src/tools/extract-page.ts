import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { extractContent } from "extract-webpage/url-to-content/url-to-content";

export function registerExtractPageTool(server: McpServer) {
  server.registerTool("extract_page", {
    description:
      "Extract content from a web page, PDF, or YouTube video. Uses Mozilla Readability and Postlight Mercury algorithms with 100+ custom adapters. Returns structured content with title, author, date, and citation.",
    inputSchema: {
      url: z.string().describe("URL of the page to extract"),
      images: z.boolean().optional().default(true).describe("Include images in output"),
      links: z.boolean().optional().default(true).describe("Include links in output"),
      formatting: z.boolean().optional().default(true).describe("Preserve formatting"),
      timeout: z.number().optional().default(10).describe("HTTP request timeout in seconds"),
    },
  }, async ({ url, images, links, formatting, timeout }) => {
    try {
      const result = await extractContent(url, {
        images,
        links,
        formatting,
        absoluteURLs: true,
        timeout,
      });

      if (!result || result.error) {
        return {
          content: [{ type: "text" as const, text: `Could not extract content from "${url}".` }],
          isError: true,
        };
      }

      let text = `Content extracted from: ${result.url || url}\n\n`;
      if (result.title) text += `Title: ${result.title}\n`;
      if (result.author) text += `Author: ${result.author}\n`;
      if (result.date) text += `Date: ${result.date}\n`;
      if (result.source) text += `Source: ${result.source}\n`;
      if (result.word_count) text += `Word Count: ${result.word_count}\n`;
      if (result.cite) text += `Citation: ${result.cite}\n`;
      if (result.html) text += `\nContent:\n${result.html}\n`;

      return { content: [{ type: "text" as const, text }] };
    } catch (error: any) {
      return {
        content: [{ type: "text" as const, text: `Extraction failed for "${url}": ${error.message}` }],
        isError: true,
      };
    }
  });
}
