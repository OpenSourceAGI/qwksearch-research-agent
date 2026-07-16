import generateSuggestions from "chat-agent-toolkit/tools/search/suggestionGeneratorAgent";
import ModelRegistry from "chat-agent-toolkit/models/registry";
import type { ModelWithProvider } from "chat-agent-toolkit/config/config-types";
import type { ChatTurnMessage } from "chat-agent-toolkit/tools/search/meta-search-types";

interface SuggestionsGenerationBody {
  chatHistory: any[];
  chatModel: ModelWithProvider;
  maxQuestions?: number;
}

export function createSuggestionsHandler() {
  const POST = async (req: Request): Promise<Response> => {
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
      { chat_history: chatHistory, maxQuestions: body.maxQuestions },
      llm,
    );

    const splitSuggestions = rawSuggestions.flatMap((suggestion: string) => {
      const questionCount = (suggestion.match(/\?/g) || []).length;
      if (questionCount > 1) {
        return suggestion
          .split(/\?/)
          .map((q) => q.trim())
          .filter((q) => q.length > 0)
          .map((q) => q + "?");
      }
      return [suggestion];
    });

    return Response.json({ suggestions: splitSuggestions }, { status: 200 });
  };

  return { POST };
}
