import { getDB } from "@/lib/database";
import {
  chats,
  messages as messagesSchema,
} from "@/lib/database/schema";
import { and, eq, gt } from "drizzle-orm";
import type { Message } from "./schemas";

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
 * @param {string[]}                 files          - File attachment identifiers (reserved for future use).
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
   * Check whether the parent chat session already exists. The lookup is by
   * id alone (not id + userId): chat ids are client-generated and travel in
   * URLs, so the same id can be replayed by a different account. Filtering
   * by userId here made that case invisible and the insert below then died
   * on a `chats.id` primary-key conflict.
   */
  const chat = await db.query.chats.findFirst({
    where: eq(chats.id, message.chatId),
  });

  if (chat && chat.userId !== userId) {
    // The chat id belongs to another account. Don't insert (PK conflict)
    // and don't attach this user's messages to someone else's chat.
    console.warn(
      "[handleHistorySave] chatId belongs to another user; skipping history save:",
      message.chatId,
    );
    return;
  }

  if (!chat) {
    console.log("[handleHistorySave] Creating new chat:", message.chatId);
    // onConflictDoNothing: concurrent requests for the same new chat can
    // both pass the existence check; the second insert must not throw.
    await db
      .insert(chats)
      .values({
        id: message.chatId,
        title: message.content,
        createdAt: new Date().toISOString(),
        focusMode,
        userId,
        thinkingTimeLimit,
      })
      .onConflictDoNothing()
      .execute();
    console.log(
      "[handleHistorySave] Chat created successfully:",
      message.chatId,
    );
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
