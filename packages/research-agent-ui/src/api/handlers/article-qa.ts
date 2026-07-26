import { generateText } from "ai";
import ModelRegistry from "chat-agent-toolkit/models/registry";
import type { ModelWithProvider } from "chat-agent-toolkit/config/config-types";
import type { ArticleDeps } from "../types";

interface ArticleQABody {
  article: string;
  question: string;
  chatHistory?: Array<{ role: string; content: string }>;
  chatModel?: ModelWithProvider;
}

export function createArticleQAHandler(deps: ArticleDeps) {
  return async (req: Request): Promise<Response> => {
    try {
      const body: ArticleQABody = await req.json();
      const { article, question, chatHistory = [], chatModel } = body;

      if (!article || !question) {
        return Response.json(
          { error: "Article and question are required" },
          { status: 400 },
        );
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

      const historyContext =
        chatHistory.length > 0
          ? `\n\nPrevious conversation:\n${chatHistory
              .map(
                (msg) =>
                  `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`,
              )
              .join("\n")}`
          : "";

      const systemPrompt = `You are a helpful AI assistant that answers questions about articles.
Provide clear, concise, and accurate answers based on the article content provided.
If the answer is not in the article, say so.`;

      const userPrompt = `Article content:
${article.slice(0, 15000)}

${historyContext}

User question: ${question}

Please provide a helpful answer based on the article content above.`;

      const { text: fullResponse } = await generateText({
        model: llm,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });

      return Response.json({ content: fullResponse, success: true });
    } catch (error) {
      console.error("Error in article Q&A:", error);
      return Response.json(
        {
          error: "An error occurred while generating the answer",
          details: error instanceof Error ? error.message : String(error),
        },
        { status: 500 },
      );
    }
  };
}
