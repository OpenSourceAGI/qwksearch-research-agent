/**
 * @fileoverview Handler that generates and persists an LLM-written chat title.
 */
import generateTitle from "chat-agent-toolkit/tools/search/titleGeneratorAgent";
import ModelRegistry from "chat-agent-toolkit/models/registry";
import type { ModelWithProvider } from "chat-agent-toolkit/config/config-types";
import type { ChatTurnMessage } from "chat-agent-toolkit/tools/search/meta-search-types";
import { eq } from "drizzle-orm";
import type { ChatsDeps } from "../types";

interface ChatTitleGenerationBody {
  chatId?: string;
  chatHistory: any[];
  chatModel: ModelWithProvider;
}

/**
 * Generates a concise LLM title for a conversation and, for authenticated
 * users who own the chat, persists it to the `chats.title` column. The
 * generated title is always returned so guest clients can store it locally.
 */
export function createChatTitleHandler(deps: ChatsDeps) {
  const { chats } = deps.schema;

  const POST = async (req: Request): Promise<Response> => {
    try {
      const body: ChatTitleGenerationBody = await req.json();

      const chatHistory = body.chatHistory
        .filter((msg: any) => msg.role === "user" || msg.role === "assistant")
        .map(
          (msg: any): ChatTurnMessage => ({
            role: msg.role,
            content: String(msg.content ?? ""),
          }),
        );

      if (chatHistory.length === 0) {
        return Response.json({ message: "No conversation content" }, { status: 400 });
      }

      const registry = new ModelRegistry();
      const llm = await registry.loadChatModel(
        body.chatModel.providerId,
        body.chatModel.key,
      );

      const title = await generateTitle({ chat_history: chatHistory }, llm);

      if (!title) {
        return Response.json({ message: "Failed to generate title" }, { status: 500 });
      }

      // Persist for authenticated owners; guests update local storage client-side.
      const userId = deps.getUserId ? await deps.getUserId() : null;
      if (userId && body.chatId) {
        try {
          const db = deps.getDB();
          const chat = await db.query.chats.findFirst({
            where: eq(chats.id, body.chatId),
          });
          if (chat && chat.userId === userId) {
            await db
              .update(chats)
              .set({ title })
              .where(eq(chats.id, body.chatId))
              .execute();
          }
        } catch (persistErr) {
          // Non-fatal: still return the generated title to the client.
          console.error("Failed to persist chat title:", persistErr);
        }
      }

      return Response.json({ title }, { status: 200 });
    } catch (err) {
      console.error("Error generating chat title:", err);
      return Response.json({ message: "Failed to generate title" }, { status: 500 });
    }
  };

  return { POST };
}
