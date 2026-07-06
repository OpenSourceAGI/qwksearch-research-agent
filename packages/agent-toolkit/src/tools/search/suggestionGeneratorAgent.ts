/**
 * @module research/chains/suggestionGeneratorAgent
 * @description Generates follow-up question suggestions from a conversation
 * using the Vercel AI SDK.
 */
import { generateText, type LanguageModel } from "ai";
import { LineListOutputParser } from "../../utils/outputParser";
import { formatChatHistoryAsString } from "../../utils";
import type { ChatTurnMessage } from "./meta-search-types";

const suggestionGeneratorPrompt = `
You are an AI suggestion generator for an AI powered search engine. You will be given a conversation below. You need to generate 4-5 suggestions based on the conversation. The suggestion should be relevant to the conversation that can be used by the user to ask the chat model for more information.
You need to make sure the suggestions are relevant to the conversation and are helpful to the user. Keep a note that the user might use these suggestions to ask a chat model for more information.
Make sure the suggestions are medium in length and are informative and relevant to the conversation.

Provide these suggestions separated by newlines between the XML tags <suggestions> and </suggestions>. For example:

<suggestions>
Tell me more about SpaceX and their recent projects
What is the latest news on SpaceX?
Who is the CEO of SpaceX?
</suggestions>

Conversation:
{chat_history}
`;

type SuggestionGeneratorInput = {
  chat_history: ChatTurnMessage[];
};

const outputParser = new LineListOutputParser({
  key: "suggestions",
});

const generateSuggestions = async (
  input: SuggestionGeneratorInput,
  llm: LanguageModel,
): Promise<string[]> => {
  const prompt = suggestionGeneratorPrompt.replace(
    "{chat_history}",
    formatChatHistoryAsString(input.chat_history),
  );

  const { text } = await generateText({
    model: llm,
    temperature: 0,
    prompt,
  });

  return outputParser.parse(text);
};

export default generateSuggestions;
