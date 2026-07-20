import crypto from "crypto";
import type { Document } from "extract-webpage/search/document";
import { EventEmitter } from "stream";
import { describeError } from "research-agent-ui/api";
import { getDB } from "@/lib/database";
import { messages as messagesSchema } from "@/lib/database/schema";

/**
 * Shape of a parsed event emitted by the search agent's EventEmitter.
 *
 * The search agent emits three event types via the `"data"` channel:
 * - `"response"` — a chunk of the AI-generated answer text.
 * - `"sources"` — an array of {@link Document} objects used as citations.
 *
 * The `"end"` and `"error"` events are separate EventEmitter channels.
 *
 * @property {"response" | "sources"} type - Discriminator for the event kind.
 * @property {string | Document[]}    data - The payload; text chunk or source list.
 */
interface StreamEvent {
  type: "response" | "sources" | "searching";
  data: string | Document[] | { query: string; category?: string; status: string };
}

/**
 * Shape of an SSE message written to the client's response stream.
 *
 * Each line in the response stream is a JSON-encoded {@link SSEMessage}
 * followed by a newline character (`\n`).
 *
 * | `type`        | `data`                | `messageId`   |
 * |---------------|-----------------------|---------------|
 * | `"message"`   | AI text chunk (string)| present       |
 * | `"sources"`   | Source documents array | present       |
 * | `"suggestions"`| Suggestions array     | present       |
 * | `"messageEnd"`| _absent_              | _absent_      |
 * | `"error"`     | Error description     | _absent_      |
 */
interface SSEMessage {
  type: "message" | "sources" | "searching" | "suggestions" | "messageEnd" | "error";
  data?: string | Document[] | string[] | { query: string; category?: string; status: string };
  messageId?: string;
}

/**
 * Bridges the search agent's {@link EventEmitter} to a Web Streams API
 * {@link WritableStreamDefaultWriter}, converting events into newline-
 * delimited JSON (NDJSON) suitable for Server-Sent Events consumption.
 *
 * **Event flow:**
 *
 * 1. `"data"` events with `type: "response"` are forwarded as `"message"`
 *    SSE frames and accumulated into a full response string.
 * 2. `"data"` events with `type: "sources"` are forwarded as `"sources"`
 *    SSE frames and persisted to the database as a `"source"` role message.
 * 3. The `"end"` event sends a `"messageEnd"` SSE frame, closes the writer,
 *    and persists the accumulated AI response as an `"assistant"` role message.
 * 4. The `"error"` event sends an `"error"` SSE frame and closes the writer.
 *
 * **Database persistence** only occurs for authenticated users (non-null `userId`).
 *
 * @param {EventEmitter}                stream  - The search agent's event emitter.
 * @param {WritableStreamDefaultWriter} writer  - The writable side of the response TransformStream.
 * @param {TextEncoder}                 encoder - Encoder for converting strings to UTF-8 bytes.
 * @param {string}                      chatId  - The chat session identifier for DB persistence.
 * @param {string | null}               userId  - The authenticated user's ID, or `null` for guests.
 * @param {ReturnType<typeof getDB>}    db      - The Drizzle ORM database instance.
 *
 * @example
 * ```ts
 * const responseStream = new TransformStream();
 * const writer = responseStream.writable.getWriter();
 * const encoder = new TextEncoder();
 *
 * handleEmitterEvents(searchStream, writer, encoder, chatId, userId, db);
 *
 * return new Response(responseStream.readable, {
 *   headers: { "Content-Type": "text/event-stream" },
 * });
 * ```
 */
export const handleEmitterEvents = async (
  stream: EventEmitter,
  writer: WritableStreamDefaultWriter,
  encoder: TextEncoder,
  chatId: string,
  userId: string | null,
  db: ReturnType<typeof getDB> | undefined,
): Promise<void> => {
  /** Accumulates the full AI response text across multiple "response" chunks. */
  let receivedMessage = "";

  /** Unique identifier for the AI's response message, used in SSE frames and DB. */
  const aiMessageId = crypto.randomBytes(7).toString("hex");

  /**
   * Writes a JSON-encoded {@link SSEMessage} followed by a newline to the stream.
   *
   * @param {SSEMessage} message - The SSE message payload to serialize and send.
   */
  const writeSSE = (message: SSEMessage): Promise<void> => {
    return writer.write(encoder.encode("data: " + JSON.stringify(message) + "\n\n"));
  };

  stream.on("data", (data: string) => {
    /** @type {StreamEvent} */
    const parsedData: StreamEvent = JSON.parse(data);

    if (parsedData.type === "searching") {
      writeSSE({
        type: "searching",
        data: parsedData.data,
        messageId: aiMessageId,
      });
    } else if (parsedData.type === "response") {
      writeSSE({
        type: "message",
        data: parsedData.data,
        messageId: aiMessageId,
      });

      receivedMessage += parsedData.data;
    } else if (parsedData.type === "sources") {
      writeSSE({
        type: "sources",
        data: parsedData.data,
        messageId: aiMessageId,
      });

      // Only save source messages to database for authenticated users with DB access
      if (userId && db) {
        const sourceMessageId = crypto.randomBytes(7).toString("hex");

        db.insert(messagesSchema)
          .values({
            chatId,
            userId,
            messageId: sourceMessageId,
            role: "source",
            content: "",
            sources: parsedData.data as Document[],
            createdAt: new Date().toISOString(),
          })
          .execute()
          .catch((err) => {
            console.error(
              "[handleEmitterEvents] failed to save source message:",
              describeError(err),
            );
          });
      }
    }
  });

  stream.on("end", async () => {
    await writeSSE({ type: "messageEnd" });
    await writer.close();

    // Only save the assistant message to database for authenticated users with DB access
    if (userId && db) {
      db.insert(messagesSchema)
        .values({
          content: receivedMessage,
          chatId,
          userId,
          messageId: aiMessageId,
          role: "assistant",
          createdAt: new Date().toISOString(),
        })
        .execute()
        .catch((err) => {
          console.error(
            "[handleEmitterEvents] failed to save assistant message:",
            describeError(err),
          );
        });
    }
  });

  stream.on("error", async (data: string) => {
    let errorText: string;
    try {
      errorText = JSON.parse(data)?.data ?? data;
    } catch {
      errorText = data;
    }
    console.error("[handleEmitterEvents] forwarding error to client:", errorText);
    try {
      await writeSSE({ type: "error", data: errorText });
    } catch (err) {
      console.error("[handleEmitterEvents] failed to write error SSE:", err);
    }
    try {
      await writer.close();
    } catch {
      // Writer may already be closed if a prior frame errored.
    }
  });
};
