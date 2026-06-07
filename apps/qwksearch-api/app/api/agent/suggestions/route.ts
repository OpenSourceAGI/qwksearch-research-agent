/**
 * @fileoverview Follow-up suggestion generator. POST accepts chat history
 * and a model config, then uses the suggestion generator agent to produce
 * contextual follow-up question suggestions.
 */
import generateSuggestions from "extract-webpage/search/suggestionGeneratorAgent";
import { ModelRegistry } from "chat-agent-toolkit";
import type { ModelWithProvider } from "chat-agent-toolkit";
import { AIMessage, BaseMessage, HumanMessage } from "@langchain/core/messages";

interface SuggestionsGenerationBody {
  chatHistory: any[];
  chatModel: ModelWithProvider;
}

export const POST = async (req: Request) => {
  try {
    const body: SuggestionsGenerationBody = await req.json();

    const chatHistory = body.chatHistory
      .map((msg: any) => {
        if (msg.role === "user") {
          return new HumanMessage(msg.content);
        } else if (msg.role === "assistant") {
          return new AIMessage(msg.content);
        }
      })
      .filter((msg) => msg !== undefined) as BaseMessage[];

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
