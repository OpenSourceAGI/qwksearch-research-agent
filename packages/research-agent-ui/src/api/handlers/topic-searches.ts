/**
 * @fileoverview Handler that generates short LLM-powered suggested search
 * queries ("topics") related to a document/page.
 *
 * Loads a chat model via ModelRegistry, prompts it with the page's title and
 * content (truncated to 15000 chars), then parses the response into a
 * cleaned list of short search-query strings.
 */
import { generateText } from "ai";
import ModelRegistry from "chat-agent-toolkit/models/registry";
import type { ModelWithProvider } from "chat-agent-toolkit/config/config-types";
import type { ArticleDeps } from "../types";

interface TopicSearchesBody {
  title?: string;
  content: string;
  maxTopics?: number;
  chatModel?: ModelWithProvider;
}

export function createTopicSearchesHandler(deps: ArticleDeps) {
  return async (req: Request): Promise<Response> => {
    try {
      const body: TopicSearchesBody = await req.json();
      const { title = "", content, maxTopics = 4, chatModel } = body;

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

      const systemPrompt = `You are a helpful AI that suggests related searches for a reader based on a page they currently have open.
Generate ${maxTopics} short search queries (each a few words, phrased the way someone would type it into a search box) that dig deeper into topics related to the page.
Return ONLY the search queries, one per line, without numbering or bullet points.`;

      const userPrompt = `Page title: ${title}

Page content:
${content.slice(0, 15000)}

Generate ${maxTopics} short related search queries for this page.`;

      const { text: fullResponse } = await generateText({
        model: llm,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });

      const topics = fullResponse
        .split("\n")
        .map((t) => t.trim())
        .filter((t) => t.length > 0)
        .map((t) => t.replace(/^[\d\-\*\.\)]+\s*/, "").trim())
        .filter((t) => t.length > 2)
        .slice(0, maxTopics);

      return Response.json({ topics, success: true });
    } catch (error) {
      console.error("Error generating topic searches:", error);
      return Response.json(
        {
          error: "An error occurred while generating topic searches",
          details: error instanceof Error ? error.message : String(error),
        },
        { status: 500 },
      );
    }
  };
}
