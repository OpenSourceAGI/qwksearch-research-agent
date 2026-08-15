/**
 * @fileoverview Handler that generates short LLM-powered tips about a document/page.
 *
 * Loads a chat model via ModelRegistry, prompts it with the page's title and
 * content (truncated to 15000 chars), then parses the response into a
 * cleaned list of short tips.
 */
import { generateText } from "ai";
import ModelRegistry from "chat-agent-toolkit/models/registry";
import type { ModelWithProvider } from "chat-agent-toolkit/config/config-types";
import type { ArticleDeps } from "../types";

interface PageTipsBody {
  title?: string;
  content: string;
  maxTips?: number;
  chatModel?: ModelWithProvider;
}

export function createPageTipsHandler(deps: ArticleDeps) {
  return async (req: Request): Promise<Response> => {
    try {
      const body: PageTipsBody = await req.json();
      const { title = "", content, maxTips = 4, chatModel } = body;

      if (!content) {
        return Response.json({ error: "Content is required" }, { status: 400 });
      }

      const registry = new ModelRegistry();
      let llm;

      try {
        llm = await registry.loadChatModel(chatModel?.providerId, chatModel?.key);
      } catch (error) {
        return Response.json(
          {
            error:
              error instanceof Error
                ? error.message
                : "Failed to load language model",
          },
          { status: 500 },
        );
      }

      const systemPrompt = `You are a helpful AI that surfaces short, useful tips about a page the reader currently has open.
Generate ${maxTips} concise tips (each a single sentence) highlighting the most useful takeaways or things worth noticing on the page.
Return ONLY the tips, one per line, without numbering or bullet points.`;

      const userPrompt = `Page title: ${title}

Page content:
${content.slice(0, 15000)}

Generate ${maxTips} short tips about this page.`;

      const { text: fullResponse } = await generateText({
        model: llm,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });

      const tips = fullResponse
        .split("\n")
        .map((t) => t.trim())
        .filter((t) => t.length > 0)
        .map((t) => t.replace(/^[\d\-\*\.\)]+\s*/, "").trim())
        .filter((t) => t.length > 10)
        .slice(0, maxTips);

      return Response.json({ tips, success: true });
    } catch (error) {
      console.error("Error generating page tips:", error);
      return Response.json(
        {
          error: "An error occurred while generating page tips",
          details: error instanceof Error ? error.message : String(error),
        },
        { status: 500 },
      );
    }
  };
}
