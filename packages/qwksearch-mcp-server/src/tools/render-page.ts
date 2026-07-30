import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerRenderPageTool(server: McpServer) {
  server.registerTool("render_page_with_javascript", {
    description:
      "Render a web page with full JavaScript execution using Cloudflare Browser Rendering. Use for JavaScript-heavy sites (SPAs, React apps) or pages behind bot protection. Slower but more complete than extract_page.",
    inputSchema: {
      url: z.string().describe("URL of the page to render"),
      wait: z.number().optional().default(0).describe("Additional wait time in ms after page load"),
      timeout: z.number().optional().default(30000).describe("Timeout in ms"),
      waitUntil: z
        .enum(["domcontentloaded", "load", "networkidle0", "networkidle2"])
        .optional()
        .default("networkidle2")
        .describe("When to consider navigation complete"),
    },
  }, async ({ url, wait, timeout, waitUntil }) => {
    const scraperUrl = process.env.SCRAPER_URL || "https://scraper.qwksearch.workers.dev";
    const scraperApiKey = process.env.SCRAPER_API_KEY;

    if (!scraperApiKey) {
      return {
        content: [{ type: "text" as const, text: "render_page_with_javascript is unavailable: SCRAPER_API_KEY environment variable not set." }],
        isError: true,
      };
    }

    try {
      const requestUrl = new URL("/api/render", scraperUrl);
      const response = await fetch(requestUrl.toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${scraperApiKey}`,
        },
        body: JSON.stringify({
          url,
          blockImages: true,
          wait,
          timeout,
          waitUntil,
          bypassCaptcha: true,
          sessionId: "default",
          format: "json",
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          content: [{ type: "text" as const, text: `Render failed: ${errorText}` }],
          isError: true,
        };
      }

      const data = await response.json() as any;
      let text = `Page rendered: ${data.url || url}\n`;
      if (data.title) text += `Title: ${data.title}\n`;
      if (data.loadTime) text += `Load Time: ${data.loadTime}ms\n`;
      text += `\n${data.html || ""}`;

      return { content: [{ type: "text" as const, text }] };
    } catch (error: any) {
      return {
        content: [{ type: "text" as const, text: `Render failed for "${url}": ${error.message}` }],
        isError: true,
      };
    }
  });
}
