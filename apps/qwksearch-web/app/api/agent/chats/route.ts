import { createChatsHandler } from "research-agent-ui/api";
import { getDB } from "@/lib/database";
import { chats, messages } from "@/lib/database/schema";
import { requireUserId } from "@/lib/auth/agent-session";
import { withCors, corsPreflight } from "@/lib/cors";

const handler = createChatsHandler({ getDB, requireUserId, schema: { chats, messages } });
// Cross-origin embeds (debate-ai.com) reach these with the user's API key;
// see lib/auth/agent-session.ts.
export const GET = withCors(handler.GET);
export const DELETE = withCors(handler.DELETE);
export const OPTIONS = corsPreflight;
