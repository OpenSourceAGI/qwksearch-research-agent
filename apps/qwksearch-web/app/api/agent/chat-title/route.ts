import { createChatTitleHandler } from "research-agent-ui/api";
import { getDB } from "@/lib/database";
import { chats, messages } from "@/lib/database/schema";
import { getUserId, requireUserId } from "@/lib/auth/agent-session";
import { withCors, corsPreflight } from "@/lib/cors";

const handler = createChatTitleHandler({
  getDB,
  requireUserId,
  getUserId,
  schema: { chats, messages },
});

// Cross-origin embeds (debate-ai.com) reach these with the user's API key;
// see lib/auth/agent-session.ts.
export const POST = withCors(handler.POST);
export const OPTIONS = corsPreflight;
