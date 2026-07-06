/**
 * @fileoverview Follow-up suggestion generator. POST accepts chat history
 * and a model config, then uses the suggestion generator agent to produce
 * contextual follow-up question suggestions.
 */
import generateSuggestions from "ai-research-agent/search/suggestionGeneratorAgent";
import ModelRegistry from "ai-research-agent/models/registry";
import { ModelWithProvider } from "ai-research-agent/models/types";
import type { ChatTurnMessage } from "ai-research-agent/search/meta-search-types";

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

    const suggestions = await generateSuggestions(
      {
        chat_history: chatHistory,
      },
      llm,
    );

    return Response.json({ suggestions }, { status: 200 });
  } catch (err) {
    console.error(`An error occurred while generating suggestions: ${err}`);
    return Response.json(
      { message: "An error occurred while generating suggestions" },
      { status: 500 },
    );
  }
};
