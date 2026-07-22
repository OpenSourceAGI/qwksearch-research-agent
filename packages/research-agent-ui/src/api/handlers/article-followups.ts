import ModelRegistry from "chat-agent-toolkit/models/registry";
import type { ModelWithProvider } from "chat-agent-toolkit/config/config-types";
import type { ArticleDeps } from "../types";

interface ArticleFollowupsBody {
  article: string;
  chatHistory?: Array<{ role: string; content: string }>;
  maxQuestions?: number;
  chatModel?: ModelWithProvider;
}

export function createArticleFollowupsHandler(deps: ArticleDeps) {
  return async (req: Request): Promise<Response> => {
    try {
      const body: ArticleFollowupsBody = await req.json();
      const { article, chatHistory = [], maxQuestions = 5, chatModel } = body;

      if (!article) {
        return Response.json({ error: "Article is required" }, { status: 400 });
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
          ? `\n\nPrevious questions asked:\n${chatHistory
              .filter((msg) => msg.role === "user")
              .map((msg) => `- ${msg.content}`)
              .join("\n")}`
          : "";

      const systemPrompt = `You are a helpful AI that generates insightful follow-up questions about articles.
Generate ${maxQuestions} thought-provoking questions that would help readers understand the article better.
Return ONLY the questions, one per line, without numbering or bullet points.`;

      const userPrompt = `Article content:
${article.slice(0, 15000)}

${historyContext}

Generate ${maxQuestions} follow-up questions that would help readers dive deeper into this article.`;

      const stream = await llm.stream([
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ]);

      let fullResponse = "";
      for await (const chunk of stream) {
        fullResponse += chunk.content;
      }

      const questions = fullResponse
        .split("\n")
        .map((q) => q.trim())
        .filter((q) => q.length > 0)
        .map((q) => q.replace(/^[\d\-\*\.\)]+\s*/, "").trim())
        .filter((q) => q.length > 10)
        .slice(0, maxQuestions);

      return Response.json({ extract: questions, success: true });
    } catch (error) {
      console.error("Error generating follow-up questions:", error);
      return Response.json(
        {
          error: "An error occurred while generating follow-up questions",
          details: error instanceof Error ? error.message : String(error),
        },
        { status: 500 },
      );
    }
  };
}
