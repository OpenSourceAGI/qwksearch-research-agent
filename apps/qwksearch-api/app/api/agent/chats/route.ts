/**
 * @fileoverview Chat session list management. GET returns all chat sessions
 * for the authenticated user with message counts. DELETE removes all of the
 * user's chat sessions and their associated messages.
 */
import { getDB } from "@/lib/database";
import { chats, messages } from "@/lib/database/schema";
import { eq, and, inArray, sql, count } from "drizzle-orm";
import { requireUserId } from "@/lib/auth/session";

export const GET = async (req: Request) => {
  try {
    const db = getDB();
    // Require authentication
    const userId = await requireUserId();

    // Get user's chats with message counts
    const userChats = await db
      .select({
        id: chats.id,
        title: chats.title,
        createdAt: chats.createdAt,
        focusMode: chats.focusMode,
        userId: chats.userId,
        files: chats.files,
        messageCount: count(messages.id),
      })
      .from(chats)
      .leftJoin(
        messages,
        and(eq(messages.chatId, chats.id), eq(messages.role, "user")),
      )
      .where(eq(chats.userId, userId))
      .groupBy(
        chats.id,
        chats.title,
        chats.createdAt,
        chats.focusMode,
        chats.userId,
        chats.files,
      )
      .orderBy(sql`${chats.createdAt} DESC`);

    return Response.json({ chats: userChats }, { status: 200 });
  } catch (err) {
    // Handle auth errors
    if (err instanceof Error && err.message === "Unauthorized") {
      return Response.json(
        { message: "Authentication required" },
        { status: 401 },
      );
    }

    console.error("Error in getting chats: ", err);
    return Response.json(
      { message: "An error has occurred." },
      { status: 500 },
    );
  }
};

export const DELETE = async (req: Request) => {
  try {
    const db = getDB();
    // Require authentication
    const userId = await requireUserId();

    // Get all chat IDs for the user
    const userChats = await db.query.chats.findMany({
      where: eq(chats.userId, userId),
      columns: { id: true },
    });

    if (userChats.length > 0) {
      const chatIds = userChats.map((chat) => chat.id);

      // Delete all messages for these chats first
      await db.delete(messages).where(inArray(messages.chatId, chatIds));

      // Delete all chats for the user
      await db.delete(chats).where(eq(chats.userId, userId));
    }

    return Response.json({ message: "All chats deleted" }, { status: 200 });
  } catch (err) {
    // Handle auth errors
    if (err instanceof Error && err.message === "Unauthorized") {
      return Response.json(
        { message: "Authentication required" },
        { status: 401 },
      );
    }

    console.error("Error in deleting all chats: ", err);
    return Response.json(
      { message: "An error has occurred." },
      { status: 500 },
    );
  }
};
