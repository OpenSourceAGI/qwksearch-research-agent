/**
 * @fileoverview Handlers for listing, deleting, searching, sharing, and fetching chats.
 *
 * Exposes createChatsHandler (list/delete all chats for a user),
 * createChatByIdHandler (fetch/delete a single chat, honoring public share
 * access), createChatsSearchHandler (search chats by title/message content),
 * and createChatsShareHandler (mark a chat public and produce a share URL).
 */
import { eq, and, inArray, sql, count, or, like, max } from "drizzle-orm";
import type { ChatsDeps } from "../types";

export function createChatsHandler(deps: ChatsDeps) {
  const { chats, messages } = deps.schema;

  const GET = async (_req: Request): Promise<Response> => {
    try {
      const db = deps.getDB();
      const userId = await deps.requireUserId();

      const userChats = await db
        .select({
          id: chats.id,
          title: chats.title,
          createdAt: chats.createdAt,
          focusMode: chats.focusMode,
          userId: chats.userId,
          files: chats.files,
          messageCount: count(messages.id),
          lastMessageAt: max(messages.createdAt),
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
      if (err instanceof Error && err.message === "Unauthorized") {
        return Response.json(
          { message: "Authentication required" },
          { status: 401 },
        );
      }
      console.error("Error in getting chats: ", err);
      return Response.json({ message: "An error has occurred." }, { status: 500 });
    }
  };

  const DELETE = async (_req: Request): Promise<Response> => {
    try {
      const db = deps.getDB();
      const userId = await deps.requireUserId();

      const userChats = await db.query.chats.findMany({
        where: eq(chats.userId, userId),
        columns: { id: true },
      });

      if (userChats.length > 0) {
        const chatIds = userChats.map((chat: any) => chat.id);
        await db.delete(messages).where(inArray(messages.chatId, chatIds));
        await db.delete(chats).where(eq(chats.userId, userId));
      }

      return Response.json({ message: "All chats deleted" }, { status: 200 });
    } catch (err) {
      if (err instanceof Error && err.message === "Unauthorized") {
        return Response.json(
          { message: "Authentication required" },
          { status: 401 },
        );
      }
      console.error("Error in deleting all chats: ", err);
      return Response.json({ message: "An error has occurred." }, { status: 500 });
    }
  };

  return { GET, DELETE };
}

export function createChatByIdHandler(deps: ChatsDeps) {
  const { chats, messages } = deps.schema;

  const GET = async (
    _req: Request,
    { params }: { params: Promise<{ id: string }> },
  ): Promise<Response> => {
    try {
      const db = deps.getDB();
      const { id } = await params;

      let userId: string | undefined;
      try {
        userId = await deps.requireUserId();
      } catch {
        userId = undefined;
      }

      const chatExists = await db.query.chats.findFirst({
        where: eq(chats.id, id),
      });

      if (!chatExists) {
        return Response.json({ message: "Chat not found" }, { status: 404 });
      }

      const hasAccess = chatExists.userId === userId || chatExists.isPublic;
      if (!hasAccess) {
        return Response.json(
          { message: "Unauthorized - this chat is private" },
          { status: 403 },
        );
      }

      const chatMessages = await db.query.messages.findMany({
        where: eq(messages.chatId, id),
      });

      return Response.json({ chat: chatExists, messages: chatMessages }, { status: 200 });
    } catch (err) {
      console.error("Error in getting chat by id: ", err);
      return Response.json({ message: "An error has occurred." }, { status: 500 });
    }
  };

  const DELETE = async (
    _req: Request,
    { params }: { params: Promise<{ id: string }> },
  ): Promise<Response> => {
    try {
      const db = deps.getDB();
      const { id } = await params;
      const userId = await deps.requireUserId();

      const chatExists = await db.query.chats.findFirst({
        where: and(eq(chats.id, id), eq(chats.userId, userId)),
      });

      if (!chatExists) {
        return Response.json({ message: "Chat not found" }, { status: 404 });
      }

      await db.delete(chats).where(eq(chats.id, id)).execute();
      await db.delete(messages).where(eq(messages.chatId, id)).execute();

      return Response.json({ message: "Chat deleted successfully" }, { status: 200 });
    } catch (err) {
      if (err instanceof Error && err.message === "Unauthorized") {
        return Response.json(
          { message: "Authentication required" },
          { status: 401 },
        );
      }
      console.error("Error in deleting chat by id: ", err);
      return Response.json({ message: "An error has occurred." }, { status: 500 });
    }
  };

  return { GET, DELETE };
}

export function createChatsSearchHandler(deps: ChatsDeps) {
  const { chats, messages } = deps.schema;

  const GET = async (req: Request): Promise<Response> => {
    try {
      const db = deps.getDB();
      const userId = await deps.requireUserId();

      const { searchParams } = new URL(req.url);
      const query = searchParams.get("q");

      if (!query || query.trim().length === 0) {
        return Response.json({ chats: [] }, { status: 200 });
      }

      const searchTerm = `%${query.trim()}%`;

      const chatResults = await db
        .select({
          id: chats.id,
          title: chats.title,
          createdAt: chats.createdAt,
          focusMode: chats.focusMode,
          userId: chats.userId,
          files: chats.files,
        })
        .from(chats)
        .where(and(eq(chats.userId, userId), like(chats.title, searchTerm)))
        .orderBy(sql`${chats.createdAt} DESC`);

      const messageResults = await db
        .selectDistinct({
          id: chats.id,
          title: chats.title,
          createdAt: chats.createdAt,
          focusMode: chats.focusMode,
          userId: chats.userId,
          files: chats.files,
        })
        .from(messages)
        .innerJoin(chats, eq(messages.chatId, chats.id))
        .where(
          and(
            eq(chats.userId, userId),
            or(like(messages.content, searchTerm)),
          ),
        )
        .orderBy(sql`${chats.createdAt} DESC`);

      const combinedResults = [...chatResults, ...messageResults];
      const uniqueChats = Array.from(
        new Map(combinedResults.map((chat) => [chat.id, chat])).values(),
      );

      const chatIds = uniqueChats.map((chat) => chat.id);
      const messageCounts = chatIds.length
        ? await db
            .select({
              chatId: messages.chatId,
              count: sql<number>`count(*)`,
            })
            .from(messages)
            .where(
              and(
                sql`${messages.chatId} IN (${sql.join(
                  chatIds.map((id) => sql`${id}`),
                  sql`, `,
                )})`,
                eq(messages.role, "user"),
              ),
            )
            .groupBy(messages.chatId)
        : [];

      const countMap = new Map(
        messageCounts.map((mc: any) => [mc.chatId, Number(mc.count)]),
      );

      const resultsWithCounts = uniqueChats.map((chat) => ({
        ...chat,
        messageCount: countMap.get(chat.id) || 0,
      }));

      return Response.json({ chats: resultsWithCounts }, { status: 200 });
    } catch (err) {
      if (err instanceof Error && err.message === "Unauthorized") {
        return Response.json(
          { message: "Authentication required" },
          { status: 401 },
        );
      }
      console.error("Error searching chats:", err);
      return Response.json({ message: "An error has occurred." }, { status: 500 });
    }
  };

  return { GET };
}

export function createChatsShareHandler(deps: ChatsDeps) {
  const { chats } = deps.schema;

  const POST = async (req: Request): Promise<Response> => {
    try {
      const db = deps.getDB();
      const { chatId } = await req.json();

      if (!chatId) {
        return Response.json(
          { success: false, error: "Chat ID is required" },
          { status: 400 },
        );
      }

      const userId = await deps.requireUserId();

      const chat = await db.query.chats.findFirst({
        where: eq(chats.id, chatId),
      });

      if (!chat) {
        return Response.json({ success: false, error: "Chat not found" }, { status: 404 });
      }

      if (chat.userId !== userId) {
        return Response.json({ success: false, error: "Unauthorized" }, { status: 403 });
      }

      await db
        .update(chats)
        .set({ isPublic: 1 })
        .where(eq(chats.id, chatId))
        .execute();

      const url = new URL(req.url);
      const shareUrl = `${url.origin}/c/${chatId}`;

      return Response.json({ success: true, data: { chatId, shareUrl } });
    } catch (err) {
      if (err instanceof Error && err.message === "Unauthorized") {
        return Response.json(
          { success: false, error: "Authentication required" },
          { status: 401 },
        );
      }
      console.error("Error in making chat public: ", err);
      return Response.json(
        { success: false, error: "An error has occurred." },
        { status: 500 },
      );
    }
  };

  return { POST };
}
