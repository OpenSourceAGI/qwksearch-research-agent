import { apiRequest } from "./useApi";
import type { ChatModelSelection, SourceItem } from "./types";

export interface SendChatMessageParams {
  chatId: string;
  content: string;
  history: [string, string][];
  focusMode: string;
  category: string;
  chatModel: ChatModelSelection;
}

export interface SendChatMessageCallbacks {
  onSearching: (messageId: string, query: string, status: "running" | "done") => void;
  onSources: (messageId: string, sources: SourceItem[]) => void;
  onAssistantChunk: (messageId: string, delta: string, isFirst: boolean) => void;
  onDone: () => void;
  onError: (message: string) => void;
}

const genId = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(7)), (b) => b.toString(16).padStart(2, "0")).join("");

/**
 * Sends a message to `/api/agent/chat` (via the extension host proxy) and
 * incrementally parses the newline-delimited JSON stream, matching the wire
 * format research-agent-ui's `sendMessage` expects.
 */
export function sendChatMessage(
  params: SendChatMessageParams,
  callbacks: SendChatMessageCallbacks,
): { requestId: string; userMessageId: string } {
  const userMessageId = genId();
  let assistantMessageId = "";
  let partial = "";

  const handleEvent = (data: any): void => {
    if (data.type === "error") {
      callbacks.onError(typeof data.data === "string" ? data.data : "Something went wrong.");
      return;
    }
    if (data.type === "searching") {
      callbacks.onSearching(data.messageId, data.data?.query, data.data?.status);
      return;
    }
    if (data.type === "sources") {
      callbacks.onSources(data.messageId, data.data ?? []);
      return;
    }
    if (data.type === "message") {
      const isFirst = assistantMessageId !== data.messageId;
      assistantMessageId = data.messageId;
      callbacks.onAssistantChunk(data.messageId, data.data, isFirst);
      return;
    }
    // messageEnd: nothing further to render.
  };

  const { requestId, done } = apiRequest(
    "POST",
    "/api/agent/chat",
    {
      content: params.content,
      message: { messageId: userMessageId, chatId: params.chatId, content: params.content },
      chatId: params.chatId,
      files: [],
      focusMode: params.focusMode,
      category: params.category,
      optimizationMode: "balanced",
      history: params.history,
      chatModel: params.chatModel,
      sourceExtractionEnabled: false,
      thinkingTimeLimit: 0,
    },
    (chunk) => {
      partial += chunk;
      const lines = partial.split("\n");
      partial = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          handleEvent(JSON.parse(line));
        } catch {
          // malformed line, skip
        }
      }
    },
  );

  done.then(() => callbacks.onDone()).catch((err) => callbacks.onError(err.message ?? String(err)));

  return { requestId, userMessageId };
}
