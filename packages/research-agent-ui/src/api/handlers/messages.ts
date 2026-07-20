import type { MessagesDeps } from "../types";

const VALID_ROLES = ["assistant", "user", "source", "suggestion"] as const;

/**
 * Flattens an error's `cause` chain into one string. Drizzle wraps driver
 * errors (e.g. D1's "no such column" / constraint failures) in a generic
 * "Failed query" error and puts the real one in `cause`, which structured
 * log sinks drop unless serialized explicitly.
 */
export function describeError(err: unknown): string {
  const parts: string[] = [];
  let current: unknown = err;
  for (let depth = 0; current != null && depth < 5; depth++) {
    parts.push(current instanceof Error ? current.message : String(current));
    current = current instanceof Error ? current.cause : undefined;
  }
  return parts.join(" <- caused by: ");
}

export function createMessagesHandler(deps: MessagesDeps) {
  const POST = async (req: Request): Promise<Response> => {
    try {
      const db = deps.getDB();
      const userId = await deps.requireUserId();

      const body = await req.json();
      const { chatId, messageId, role, suggestions, content, sources } = body;

      if (!chatId || !messageId || !role) {
        return Response.json(
          { message: "Missing required fields" },
          { status: 400 },
        );
      }

      if (!VALID_ROLES.includes(role)) {
        return Response.json(
          { message: `Invalid role: ${role}` },
          { status: 400 },
        );
      }

      await db.insert(deps.messagesSchema).values({
        chatId,
        userId,
        messageId,
        role,
        content: content || "",
        suggestions: suggestions || [],
        sources: sources || [],
        createdAt: new Date().toISOString(),
      });

      return Response.json({ message: "Message saved successfully" }, { status: 200 });
    } catch (err) {
      console.error("Error saving message:", describeError(err));
      return Response.json({ message: "Failed to save message" }, { status: 500 });
    }
  };

  return { POST };
}
