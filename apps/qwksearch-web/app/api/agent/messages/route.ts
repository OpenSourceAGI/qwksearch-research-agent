import { createMessagesHandler } from "research-agent-ui/api";
import { getDB } from "@/lib/database";
import { messages } from "@/lib/database/schema";
import { requireUserId } from "@/lib/auth/agent-session";
import { withCors, corsPreflight } from "@/lib/cors";

const handler = createMessagesHandler({ getDB, requireUserId, messagesSchema: messages });
// Cross-origin embeds (debate-ai.com) reach these with the user's API key;
// see lib/auth/agent-session.ts.
export const POST = withCors(handler.POST);
export const OPTIONS = corsPreflight;
