import { createChatTitleHandler } from "research-agent-ui/api";
import { getDB } from "@/lib/database";
import { chats, messages } from "@/lib/database/schema";
import { getUserId, requireUserId } from "@/lib/auth/session";

const handler = createChatTitleHandler({
  getDB,
  requireUserId,
  getUserId,
  schema: { chats, messages },
});

export const { POST } = handler;
