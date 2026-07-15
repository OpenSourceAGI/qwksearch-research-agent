/** Message protocol shared with the extension host (src/panel.ts). */

export type OutboundMessage =
  | { type: "ready" }
  | { type: "login" }
  | { type: "logout" }
  | { type: "openExternal"; url: string }
  | { type: "cancelRequest"; requestId: string }
  | { type: "apiRequest"; requestId: string; method: string; path: string; body?: unknown };

export type InboundMessage =
  | { type: "authState"; authenticated: boolean }
  | { type: "config"; focusMode: string }
  | { type: "prefill"; text: string }
  | { type: "apiChunk"; requestId: string; chunk: string }
  | { type: "apiDone"; requestId: string; status: number }
  | { type: "apiError"; requestId: string; error: string };

/** Streamed NDJSON event shape from `POST /api/agent/chat`. */
export interface ChatStreamEvent {
  type: "sources" | "searching" | "message" | "messageEnd" | "error";
  messageId?: string;
  data?: unknown;
}
