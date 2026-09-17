import crypto from "crypto";
import type { Document, DrainableEmitter } from "chat-agent-toolkit";
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
 * **Memory:** every frame is written through a single serialized chain that
 * awaits `writer.ready` first, and the chain is handed back to the producer as
 * {@link DrainableEmitter.waitForDrain}. Without both halves the encoded
 * frames pile up in the isolate for as long as the client is behind — the
 * `exceededMemory` failure mode this endpoint used to hit on long answers.
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
  stream: DrainableEmitter,
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

  /** Set once the response stream is closed, or once a write proved it is gone. */
  let streamClosed = false;

  /**
   * Tail of the serialized write chain. Every frame appends to it, so frames
   * leave in emit order and only one `writer.write()` is ever in flight.
   */
  let writeChain: Promise<void> = Promise.resolve();

  /**
   * Queues a JSON-encoded {@link SSEMessage} for the response stream.
   *
   * The returned promise resolves when *this* frame has been written, which is
   * what makes it usable as backpressure: awaiting it means the consumer has
   * caught up rather than that the frame was merely handed to the queue.
   *
   * A write rejects when the client has gone away. That is not an error worth
   * a 500 — it just means nobody is reading — so it closes the bridge down
   * instead of leaving the pipeline emitting into a dead stream.
   *
   * @param {SSEMessage} message - The SSE message payload to serialize and send.
   */
  const writeSSE = (message: SSEMessage): Promise<void> => {
    if (streamClosed) return writeChain;
    const frame = encoder.encode("data: " + JSON.stringify(message) + "\n\n");

    writeChain = writeChain
      .then(async () => {
        if (streamClosed) return;
        // `writer.ready` resolves once the stream's queue is back under its
        // high-water mark; awaiting it before writing is what keeps a slow
        // client's backlog out of the isolate's heap.
        await writer.ready;
        await writer.write(frame);
      })
      .catch((err) => {
        streamClosed = true;
        cleanup();
        console.error(
          "[handleEmitterEvents] response stream closed while writing:",
          describeError(err),
        );
      });

    return writeChain;
  };

  /**
   * Detaches every listener this bridge attached to the emitter.
   *
   * The search agent emits over a fresh {@link EventEmitter} per request, and
   * the `"data"` listener closes over the accumulated `receivedMessage` buffer
   * plus the writer, encoder, and DB handle. Detaching on the first terminal
   * event ("end" or "error") releases those references immediately instead of
   * keeping them reachable through the emitter, and prevents listeners from
   * piling up on the emitter — the "Possible EventEmitter memory leak" class of
   * bug that surfaces once an emitter outlives a single attach/detach cycle.
   */
  const cleanup = (): void => {
    stream.removeListener("data", onData);
    stream.removeListener("end", onEnd);
    stream.removeListener("error", onError);
  };

  const onData = (data: string): void => {
    /** @type {StreamEvent} */
    const parsedData: StreamEvent = JSON.parse(data);

    if (parsedData.type === "searching") {
      writeSSE({
        type: "searching",
        data: parsedData.data,
        messageId: aiMessageId,
      });
    } else if (parsedData.type === "response") {
      const text = parsedData.data as string;
      receivedMessage += text;

      // One frame per model chunk, not per word. The client appends whatever
      // arrives, so word-splitting bought no smoother typing — it multiplied
      // every chunk into dozens of queued frames here and dozens of React
      // state updates there.
      if (text) {
        writeSSE({
          type: "message",
          data: text,
          messageId: aiMessageId,
        });
      }
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
  };

  const onEnd = async (): Promise<void> => {
    cleanup();
    await writeSSE({ type: "messageEnd" });
    if (!streamClosed) {
      streamClosed = true;
      try {
        await writer.close();
      } catch (err) {
        console.error("[handleEmitterEvents] failed to close writer:", describeError(err));
      }
    }

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
  };

  const onError = async (data: string): Promise<void> => {
    cleanup();
    let errorText: string;
    try {
      errorText = JSON.parse(data)?.data ?? data;
    } catch {
      errorText = data;
    }
    console.error("[handleEmitterEvents] forwarding error to client:", errorText);
    await writeSSE({ type: "error", data: errorText });
    if (!streamClosed) {
      streamClosed = true;
      try {
        await writer.close();
      } catch {
        // Writer may already be closed if a prior frame errored.
      }
    }
  };

  // Backpressure handshake: the pipeline awaits this between chunks, so it
  // stops pulling from the model while the client is behind.
  stream.waitForDrain = () => writeChain;

  stream.on("data", onData);
  // "end" and "error" are terminal: register with `once` so they auto-detach
  // after firing, and cleanup() removes the remaining "data" listener.
  stream.once("end", onEnd);
  stream.once("error", onError);
};
