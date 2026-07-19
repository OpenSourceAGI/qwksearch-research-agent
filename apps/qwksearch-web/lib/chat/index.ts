/**
 * @module chat
 *
 * Chat request handling for the research agent.
 *
 * This module splits the `POST /api/agent/chat` endpoint logic into
 * focused, well-documented submodules:
 *
 * - **schemas** — Zod validation schemas, inferred types, and safe parsing.
 * - **stream-handler** — Bridges the search agent's EventEmitter to SSE streams.
 * - **history** — Persists chat sessions and messages to the database.
 * - **handler** — Orchestrates auth, validation, rate limiting, search, and streaming.
 *
 * @example
 * ```ts
 * // Usage in a Next.js API route:
 * import { handleChatRequest } from "@/lib/research-agent/src/chat";
 *
 * export const POST = handleChatRequest;
 * ```
 */

export {
  messageSchema,
  chatModelSchema,
  bodySchema,
  safeValidateBody,
  type Message,
  type Body,
  type ValidationError,
} from "./schemas";

export { handleEmitterEvents } from "./stream-handler";

export { ensureUploadFileLoaderRegistered } from "./upload-file-loader";

export { handleHistorySave } from "./history";

export { handleChatRequest } from "./handler";
