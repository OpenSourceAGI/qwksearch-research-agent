import { createMessagesHandler } from "research-agent-ui/api";
import { getDB } from "@/lib/database";
import { messages } from "@/lib/database/schema";
import { requireUserId } from "@/lib/auth/session";

const handler = createMessagesHandler({ getDB, requireUserId, messagesSchema: messages });
export const { POST } = handler;
