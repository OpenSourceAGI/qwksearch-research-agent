import { getDB } from "@/lib/database";
import {
  chats,
  messages as messagesSchema,
  uploads,
} from "@/lib/database/schema";
import { and, eq, gt, inArray } from "drizzle-orm";
import type { Message } from "./schemas";

/**
 * Resolves attached upload fileIds to `{ name, fileId, size }` metadata from
 * the `uploads` table so chat history can display file names and sizes.
 */
const resolveFileMetadata = async (
  db: ReturnType<typeof getDB>,
  fileIds: string[],
  userId: string,
): Promise<{ name: string; fileId: string; size: number }[]> => {
  if (!fileIds || fileIds.length === 0) return [];
  try {
    const rows = await db.query.uploads.findMany({
      where: and(eq(uploads.userId, userId), inArray(uploads.fileId, fileIds)),
    });
    return rows.map((row) => ({
      name: row.fileName,
      fileId: row.fileId,
      size: row.size,
    }));
  } catch (err) {
    console.error("[handleHistorySave] file metadata lookup failed:", err);
    return fileIds.map((fileId) => ({ name: fileId, fileId, size: 0 }));
  }
};

/**
 * Persists a human message and its parent chat session to the database.
 *
 * This function handles two distinct scenarios:
 *
 * **New message** — If no message with `humanMessageId` exists yet, the
 * human message is inserted into the `messages` table. If the parent chat
 * session doesn't exist either, it is created first.
 *
 * **Re-sent message** — If a message with `humanMessageId` already exists
 * (e.g. the user edited and re-sent a prior message), all subsequent
 * messages in the same chat are deleted so the conversation can branch
 * from that point.
 *
 * **Guest users** — When `userId` is `null` (unauthenticated guest),
 * this function returns immediately without touching the database.
 *
 * @param {Message}                  message        - The user's message containing `chatId`, `content`, and `messageId`.
 * @param {string}                   humanMessageId - The unique identifier for this human message (may differ from `message.messageId`).
 * @param {string}                   focusMode      - The search focus mode key, stored on new chat sessions.
 * @param {string[]}                 files          - Attached upload fileIds, persisted onto the chat with name/size metadata.
 * @param {string | null}            userId         - The authenticated user's ID, or `null` for guests.
 * @param {ReturnType<typeof getDB>} db             - The Drizzle ORM database instance.
 *
 * @returns {Promise<void>} Resolves when all database operations complete.
 *
 * @example
 * ```ts
 * await handleHistorySave(
 *   { chatId: "abc123", content: "What is quantum computing?", messageId: "msg1" },
 *   "msg1",
 *   "webSearch",
 *   [],
 *   "user_42",
 *   db,
 * );
 * ```
 */
export const handleHistorySave = async (
  message: Message,
  humanMessageId: string,
  focusMode: string,
  files: string[],
  userId: string | null,
  db: ReturnType<typeof getDB> | undefined,
  thinkingTimeLimit = 0,
): Promise<void> => {
  // Skip database persistence for guests or when DB is unavailable
  if (!userId || !db) return;

  console.log(
    "[handleHistorySave] Starting chat save for chatId:",
    message.chatId,
    "userId:",
    userId,
  );

  /**
   * Check whether the parent chat session already exists for this user.
   * If not, create it using the first message's content as the title.
   */
  const chat = await db.query.chats.findFirst({
    where: and(eq(chats.id, message.chatId), eq(chats.userId, userId)),
  });

  if (!chat) {
    console.log("[handleHistorySave] Creating new chat:", message.chatId);
    const fileMetadata = await resolveFileMetadata(db, files, userId);
    await db
      .insert(chats)
      .values({
        id: message.chatId,
        title: message.content,
        createdAt: new Date().toISOString(),
        focusMode,
        userId,
        files: fileMetadata,
        thinkingTimeLimit,
      })
      .execute();
    console.log(
      "[handleHistorySave] Chat created successfully:",
      message.chatId,
    );
  } else if (files && files.length > 0) {
    // Merge newly attached files into the existing chat's file list so chat
    // history reflects attachments added mid-conversation
    const existing = chat.files ?? [];
    const newIds = files.filter(
      (fileId) => !existing.some((file) => file.fileId === fileId),
    );
    if (newIds.length > 0) {
      const fileMetadata = await resolveFileMetadata(db, newIds, userId);
      if (fileMetadata.length > 0) {
        await db
          .update(chats)
          .set({ files: [...existing, ...fileMetadata] })
          .where(and(eq(chats.id, message.chatId), eq(chats.userId, userId)))
          .execute();
      }
    }
  }

  /**
   * Check if this exact human message already exists in the database.
   *
   * - If it does NOT exist → insert the new human message.
   * - If it DOES exist → the user re-sent from this point, so delete
   *   all messages that came after it (branching the conversation).
   */
  const messageExists = await db.query.messages.findFirst({
    where: eq(messagesSchema.messageId, humanMessageId),
  });

  if (!messageExists) {
    await db
      .insert(messagesSchema)
      .values({
        content: message.content,
        chatId: message.chatId,
        userId,
        messageId: humanMessageId,
        role: "user",
        createdAt: new Date().toISOString(),
      })
      .execute();
  } else {
    // Delete all messages after the re-sent message to allow branching
    await db
      .delete(messagesSchema)
      .where(
        and(
          gt(messagesSchema.id, messageExists.id),
          eq(messagesSchema.chatId, message.chatId),
        ),
      )
      .execute();
  }
};
