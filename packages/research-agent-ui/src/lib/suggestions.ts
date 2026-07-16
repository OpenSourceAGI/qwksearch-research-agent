import grab from "grab-url";
import { Message } from "../components/ChatConversation/ChatWindow";

export const getSuggestions = async (chatHistory: Message[]) => {
  const chatModel = localStorage.getItem("chatModelKey");
  const chatModelProvider = localStorage.getItem("chatModelProviderId");
  const maxQuestions = parseInt(localStorage.getItem("maxFollowupQuestions") || "4");

  // Only send user/assistant messages — source messages contain large Document
  // objects that bloat the payload and are not needed for suggestion generation.
  const filteredHistory = chatHistory.filter(
    (msg) => msg.role === "user" || msg.role === "assistant",
  );

  try {
    const data = await grab<{ suggestions: string[] }>(
  `agent/suggestions`,
      {
        method: "POST",
        body: JSON.stringify({
          chatHistory: filteredHistory,
          chatModel: {
            providerId: chatModelProvider,
            key: chatModel,
          },
          maxQuestions,
        }),
      },
    );

    return Array.isArray(data.suggestions) ? data.suggestions : [];
  } catch (e) {
    return [];
  }
};
