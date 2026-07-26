import grab from "grab-url";
import { Message } from "../components/ChatConversation/ChatWindow";

/**
 * Requests an LLM-generated title summarising a conversation. For
 * authenticated users the server persists the title on the chat; for guests
 * the caller is responsible for storing the returned title locally. Returns
 * an empty string on failure so callers can keep the existing title.
 */
export const generateChatTitle = async (
  chatId: string,
  chatHistory: Message[],
): Promise<string> => {
  const chatModel = localStorage.getItem("chatModelKey");
  const chatModelProvider = localStorage.getItem("chatModelProviderId");

  const filteredHistory = chatHistory
    .filter((msg) => msg.role === "user" || msg.role === "assistant")
    .map((msg) => ({ role: msg.role, content: (msg as any).content ?? "" }));

  if (filteredHistory.length === 0) return "";

  try {
    const data = await grab<{ title?: string }>(`agent/chat-title`, {
      method: "POST",
      body: JSON.stringify({
        chatId,
        chatHistory: filteredHistory,
        chatModel: {
          providerId: chatModelProvider,
          key: chatModel,
        },
      }),
    });

    return typeof data.title === "string" ? data.title : "";
  } catch {
    return "";
  }
};
