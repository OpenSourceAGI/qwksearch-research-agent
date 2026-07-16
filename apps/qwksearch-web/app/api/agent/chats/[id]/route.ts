import { createChatByIdHandler } from "research-agent-ui/api";
import { getDB } from "@/lib/database";
import { chats, messages } from "@/lib/database/schema";
import { requireUserId } from "@/lib/auth/session";

const handler = createChatByIdHandler({ getDB, requireUserId, schema: { chats, messages } });
export const { GET, DELETE } = handler;
