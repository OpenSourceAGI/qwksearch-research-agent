import { createChatsShareHandler } from "research-agent-ui/api";
import { getDB } from "@/lib/database";
import { chats, messages } from "@/lib/database/schema";
import { requireUserId } from "@/lib/auth/session";

const handler = createChatsShareHandler({ getDB, requireUserId, schema: { chats, messages } });
export const { POST } = handler;
