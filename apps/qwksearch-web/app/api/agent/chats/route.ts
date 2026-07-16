import { createChatsHandler } from "research-agent-ui/api";
import { getDB } from "@/lib/database";
import { chats, messages } from "@/lib/database/schema";
import { requireUserId } from "@/lib/auth/session";

const handler = createChatsHandler({ getDB, requireUserId, schema: { chats, messages } });
export const { GET, DELETE } = handler;
