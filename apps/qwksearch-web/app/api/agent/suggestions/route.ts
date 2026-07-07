/**
 * @fileoverview Follow-up suggestion generator. POST accepts chat history
 * and a model config, then uses the suggestion generator agent to produce
 * contextual follow-up question suggestions.
 */
import generateSuggestions from "chat-agent-toolkit/tools/search/suggestionGeneratorAgent";
import ModelRegistry from "chat-agent-toolkit/models/registry";
import { ModelWithProvider } from "chat-agent-toolkit/models/types";
import type { ChatTurnMessage } from "chat-agent-toolkit/tools/search/meta-search-types";

interface SuggestionsGenerationBody {
  chatHistory: any[];
  chatModel: ModelWithProvider;
}

export const POST = async (req: Request) => {
  try {
    const body: SuggestionsGenerationBody = await req.json();

    const chatHistory = body.chatHistory
      .filter((msg: any) => msg.role === "user" || msg.role === "assistant")
      .map(
        (msg: any): ChatTurnMessage => ({
          role: msg.role,
          content: String(msg.content ?? ""),
        }),
      );

    const registry = new ModelRegistry();

    const llm = await registry.loadChatModel(
      body.chatModel.providerId,
      body.chatModel.key,
    );

    const rawSuggestions = await generateSuggestions(
      {
        chat_history: chatHistory,
      },
      llm,
    );

    // Split multi-question suggestions that have multiple question marks
    // Example: "What is X? How does Y work?" -> ["What is X?", "How does Y work?"]
    const splitSuggestions = rawSuggestions.flatMap((suggestion: string) => {
      // Check if the suggestion has multiple question marks (indicating multiple questions)
      const questionCount = (suggestion.match(/\?/g) || []).length;

      if (questionCount > 1) {
        // Split by question marks and clean up each question
        return suggestion
          .split(/\?/)
          .map(q => q.trim())
          .filter(q => q.length > 0)
          .map(q => q + '?');
      }

      return [suggestion];
    });

    return Response.json({ suggestions: splitSuggestions }, { status: 200 });
  } catch (err) {
    console.error(`An error occurred while generating suggestions: ${err}`);
    return Response.json(
      { message: "An error occurred while generating suggestions" },
      { status: 500 },
    );
  }
};
