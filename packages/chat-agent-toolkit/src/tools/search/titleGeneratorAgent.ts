/**
 * @module research/chains/titleGeneratorAgent
 * @description Generates a short, human-friendly title summarising a chat
 * conversation using the Vercel AI SDK. Used to give conversations with
 * multiple turns a meaningful title instead of the truncated first message.
 */
import { generateText, type LanguageModel } from "ai";
import { formatChatHistoryAsString } from "../../utils";
import type { ChatTurnMessage } from "./meta-search-types";

const titleGeneratorPrompt = `
You are a title generator for an AI powered search engine. You will be given a conversation between a user and an AI. Generate a concise, descriptive title that captures the overall topic of the whole conversation.

Rules for the title:
- Maximum 6 words, ideally 3-5.
- No surrounding quotes, no trailing punctuation.
- Use title case.
- Describe the subject matter, not the fact that it is a conversation (e.g. "Quantum Computing Basics", not "A Chat About Quantum Computing").

Return only the title between the XML tags <title> and </title>. For example:

<title>SpaceX Starship Launch Timeline</title>

Conversation:
{chat_history}
`;

type TitleGeneratorInput = {
  chat_history: ChatTurnMessage[];
};

/**
 * Extracts the title from the model output, tolerating responses that omit
 * the XML tags. Falls back to the trimmed raw text, stripped of surrounding
 * quotes and truncated to a sane length.
 */
const parseTitle = (text: string): string => {
  const match = text.match(/<title>([\s\S]*?)<\/title>/i);
  const raw = (match ? match[1] : text).trim();
  return raw.replace(/^["'\s]+|["'\s]+$/g, "").slice(0, 80);
};

const generateTitle = async (
  input: TitleGeneratorInput,
  llm: LanguageModel,
): Promise<string> => {
  const prompt = titleGeneratorPrompt.replace(
    "{chat_history}",
    formatChatHistoryAsString(input.chat_history),
  );

  const { text } = await generateText({
    model: llm,
    temperature: 0,
    prompt,
  });

  return parseTitle(text);
};

export default generateTitle;
