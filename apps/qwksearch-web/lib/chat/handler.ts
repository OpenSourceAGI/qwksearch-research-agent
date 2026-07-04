/**
 * @fileoverview Main entry point for chat request handling.
 * Manages authentication, rate limiting, history persistence, and search execution.
 */

import crypto from "crypto";
import type { ChatTurnMessage } from "ai-research-agent/search/meta-search-types";
import { getDB } from "@/lib/database";
import { searchHandlers } from "ai-research-agent/search";
import ModelRegistry from "ai-research-agent/models/registry";
import { getUserId } from "@/lib/auth/session";
import { checkGuestRateLimit } from "@/lib/rate-limit/guestRateLimiter";
import { safeValidateBody } from "./schemas";
import type { Body } from "./schemas";
import { handleEmitterEvents } from "./stream-handler";
import { handleHistorySave } from "./history";

/**
 * Converts a raw conversation history array into AI SDK chat messages.
 *
 * The client sends history as an array of `[role, content]` tuples where
 * `role` is either `"human"` or `"assistant"`. This function maps each
 * tuple to a `{ role, content }` message object.
 *
 * @param {[string, string][] | undefined} history - Prior conversation turns as `[role, content]` tuples.
 * @returns {ChatTurnMessage[]} An array of chat messages preserving turn order.
 *
 * @example
 * ```ts
 * const messages = buildChatHistory([
 *   ["human", "What is gravity?"],
 *   ["assistant", "Gravity is a fundamental force..."],
 * ]);
 * // => [{ role: "user", content: "What is gravity?" }, { role: "assistant", content: "Gravity is a fundamental force..." }]
 * ```
 */
const buildChatHistory = (
  history: [string?, string?, ...unknown[]][] | undefined,
): ChatTurnMessage[] => {
  if (!history || !Array.isArray(history)) {
    return [];
  }
  return history.map((msg) => ({
    role: msg[0] === "human" ? ("user" as const) : ("assistant" as const),
    content: String(msg[1] ?? ""),
  }));
};

/**
 * Extracts the client IP address from request headers.
 *
 * Checks `x-forwarded-for` first (taking the leftmost entry if multiple
 * proxies are involved), then falls back to `x-real-ip`, and finally
 * returns `"unknown"` if neither header is present.
 *
 * @param {Request} req - The incoming HTTP request.
 * @returns {string} The resolved client IP address or `"unknown"`.
 */
const getClientIP = (req: Request): string => {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
};

/**
 * Main handler for the `POST /api/agent/chat` endpoint.
 *
 * Orchestrates the full chat request lifecycle:
 *
 * 1. **Authentication** — Resolves the user ID via session (guests get `null`).
 * 2. **Validation** — Parses and validates the request body using Zod schemas.
 * 3. **Rate limiting** — Enforces daily request limits for guests using
 *    environment-based (shared) API keys.
 * 4. **Model loading** — Instantiates the requested LLM via {@link ModelRegistry}.
 * 5. **History persistence** — Saves the chat session and human message to the DB
 *    (authenticated users only).
 * 6. **Search & answer** — Delegates to the appropriate {@link searchHandlers}
 *    focus mode handler, which performs web search, reranking, and LLM streaming.
 * 7. **Streaming response** — Returns a newline-delimited JSON (NDJSON) stream
 *    with `"message"`, `"sources"`, `"messageEnd"`, and `"error"` frames.
 *
 * **Response stream format** (each line is a JSON object + `\n`):
 * ```
 * {"type":"message","data":"chunk...","messageId":"abc123"}
 * {"type":"sources","data":[...],"messageId":"abc123"}
 * {"type":"messageEnd"}
 * ```
 *
 * **Error responses:**
 * | Status | Condition                                      |
 * |--------|------------------------------------------------|
 * | 400    | Invalid request body or empty message content  |
 * | 400    | Unknown focus mode                             |
 * | 401    | Authentication required (auth error thrown)     |
 * | 429    | Guest rate limit exceeded                      |
 * | 500    | Unhandled server error                         |
 *
 * @param {Request} req - The incoming HTTP request with a JSON body conforming to {@link Body}.
 * @returns {Promise<Response>} A streaming SSE response or a JSON error response.
 *
 * @example
 * ```ts
 * // In the Next.js route file:
 * import { handleChatRequest } from "@/lib/research-agent/src/chat";
 *
 * export const runtime = "nodejs";
 * export const dynamic = "force-dynamic";
 * export const POST = handleChatRequest;
 * ```
 */
export const handleChatRequest = async (req: Request): Promise<Response> => {
  const t0 = Date.now();
  console.log("[POST /api/agent/chat] request received");
  try {
    // getUserId validates the session's user row against the current database
    // (stale KV sessions are revoked and reported as guest), so a non-null
    // userId here is always safe for FK-bound writes.
    const userId = await getUserId();
    console.log("[POST /api/agent/chat] userId:", userId ?? "(guest)");

    // DB is only needed to persist history for authenticated users.
    // Guests don't require any DB access, so we load it lazily to avoid
    // failing the entire request if the DB binding is unavailable.
    let db: ReturnType<typeof getDB> | undefined;
    if (userId) {
      db = getDB();
    }

    /** @type {Body} Raw request body before validation. */
    const reqBody = (await req.json()) as Body;
    console.log(
      "[POST /api/agent/chat] body shape:",
      JSON.stringify({
        focusMode: reqBody?.focusMode,
        chatModel: reqBody?.chatModel,
        category: reqBody?.category,
        optimizationMode: reqBody?.optimizationMode,
        historyLen: Array.isArray(reqBody?.history) ? reqBody.history.length : undefined,
        contentLen: reqBody?.message?.content?.length,
      }),
    );

    // --- Validate request body ---
    const parseBody = safeValidateBody(reqBody);
    if (!parseBody.success) {
      console.warn("[POST /api/agent/chat] body validation failed:", parseBody.error);
      return Response.json(
        { message: "Invalid request body", error: parseBody.error },
        { status: 400 },
      );
    }

    const body = parseBody.data;
    const { message } = body;

    if (message.content === "") {
      console.warn("[POST /api/agent/chat] empty message content");
      return Response.json(
        { message: "Please provide a message to process" },
        { status: 400 },
      );
    }

    // --- Rate limit guests using env-based API keys ---
    const registry = new ModelRegistry();
    console.log(
      "[POST /api/agent/chat] ModelRegistry active providers:",
      registry.activeProviders.map((p) => `${p.id}(${p.type})`),
    );

    if (registry.isProviderEnvBased(body.chatModel.providerId)) {
      const ip = getClientIP(req);
      const rateLimit = checkGuestRateLimit(ip);
      console.log(
        `[POST /api/agent/chat] guest rate limit for ${ip}: allowed=${rateLimit.allowed} remaining=${rateLimit.remaining}/${rateLimit.limit}`,
      );

      if (!rateLimit.allowed) {
        const resetDate = new Date(rateLimit.resetAt);
        return Response.json(
          {
            message: `Daily limit reached (${rateLimit.limit} requests). Resets at ${resetDate.toLocaleString()}. Add your own API key in settings for unlimited access.`,
          },
          {
            status: 429,
            headers: {
              "X-RateLimit-Limit": String(rateLimit.limit),
              "X-RateLimit-Remaining": String(rateLimit.remaining),
              "X-RateLimit-Reset": String(rateLimit.resetAt),
            },
          },
        );
      }
    }

    // --- Load the requested LLM ---
    let llm;
    try {
      llm = await registry.loadChatModel(
        body.chatModel.providerId,
        body.chatModel.key,
      );
      console.log("[POST /api/agent/chat] LLM loaded");
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error("[POST /api/agent/chat] loadChatModel failed:", errMsg);
      return Response.json(
        { message: `Failed to load LLM: ${errMsg}` },
        { status: 500 },
      );
    }

    // --- Resolve message ID (use client-provided or generate one) ---
    const humanMessageId =
      message.messageId ?? crypto.randomBytes(7).toString("hex");

    // --- Convert history tuples to AI SDK chat messages ---
    const history = buildChatHistory(body.history);

    // --- Look up the focus mode search handler ---
    const handler = searchHandlers[body.focusMode];

    if (!handler) {
      console.warn(
        `[POST /api/agent/chat] unknown focusMode "${body.focusMode}"; valid:`,
        Object.keys(searchHandlers),
      );
      return Response.json(
        { message: "Invalid focus mode" },
        { status: 400 },
      );
    }

    // --- Execute search and begin streaming the LLM answer ---
    console.log(
      `[POST /api/agent/chat] starting searchAndAnswer focusMode=${body.focusMode} optimizationMode=${body.optimizationMode}`,
    );
    const stream = await handler.searchAndAnswer(
      message.content,
      history,
      llm,
      body.optimizationMode,
      body.files,
      body.systemInstructions as string,
      body.category,
      body.sourceExtractionEnabled,
      body.thinkingTimeLimit,
    );

    // Surface errors from the agent's EventEmitter that would otherwise crash
    // the Node process as unhandled "error" events.
    stream.on("error", (data: string) => {
      try {
        const parsed = JSON.parse(data);
        console.error("[POST /api/agent/chat] agent emitter error:", parsed?.data ?? data);
      } catch {
        console.error("[POST /api/agent/chat] agent emitter error (raw):", data);
      }
    });

    // --- Set up the SSE response stream ---
    const responseStream = new TransformStream();
    const writer = responseStream.writable.getWriter();
    const encoder = new TextEncoder();

    handleEmitterEvents(stream, writer, encoder, message.chatId, userId, db);

    // --- Persist chat session and human message (authenticated users only) ---
    console.log(
      "[POST /api/agent/chat] awaiting handleHistorySave for chatId:",
      message.chatId,
    );
    if (userId && db) {
      try {
        await handleHistorySave(
          message,
          humanMessageId,
          body.focusMode,
          body.files,
          userId,
          db,
          body.thinkingTimeLimit,
        );
      } catch (err) {
        // History persistence is best-effort: the answer stream is already
        // set up, so a failed save must not turn the request into a 500.
        console.error(
          "[POST /api/agent/chat] handleHistorySave failed (continuing without history):",
          err,
        );
      }
    }
    console.log(
      `[POST /api/agent/chat] history saved, returning stream (setup took ${Date.now() - t0}ms)`,
    );

    return new Response(responseStream.readable, {
      headers: {
        "Content-Type": "text/event-stream",
        Connection: "keep-alive",
        "Cache-Control": "no-cache, no-transform",
      },
    });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return Response.json(
        { message: "Authentication required" },
        { status: 401 },
      );
    }

    console.error("[POST /api/agent/chat] unhandled error:", err);
    const detail = err instanceof Error ? err.message : String(err);
    return Response.json(
      { message: `An error occurred while processing chat request: ${detail}` },
      { status: 500 },
    );
  }
};
