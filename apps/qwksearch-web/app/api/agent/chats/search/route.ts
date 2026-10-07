import { createChatsSearchHandler } from "research-agent-ui/api";
import { getDB } from "@/lib/database";
import { chats, messages } from "@/lib/database/schema";
import { requireUserId } from "@/lib/auth/agent-session";
import { withCors, corsPreflight } from "@/lib/cors";

const handler = createChatsSearchHandler({ getDB, requireUserId, schema: { chats, messages } });
// Cross-origin embeds (debate-ai.com) reach these with the user's API key;
// see lib/auth/agent-session.ts.
export const GET = withCors(handler.GET);
export const OPTIONS = corsPreflight;
