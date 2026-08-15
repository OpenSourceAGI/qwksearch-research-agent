import { createTopicSearchesHandler } from "research-agent-ui/api";
import { getUserId } from "@/lib/auth/session";
import { getDB } from "@/lib/database";
import { user as userSchema } from "@/lib/database/schema";
import { getEnv } from "@/lib/config/env";

export const POST = createTopicSearchesHandler({
  getUserId,
  requireUserId: async () => {
    const id = await getUserId();
    if (!id) throw new Error("Unauthorized");
    return id;
  },
  getDB,
  userSchema,
  getEnv,
});
