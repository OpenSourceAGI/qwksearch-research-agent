/**
 * @fileoverview Message sending and streaming response handling.
 * Handles the complete flow of sending a chat message, receiving streamed
 * responses, and updating the UI state accordingly.
 * @module components/ResearchAgent/state/chat/sendMessage
 */

import { toast } from "sonner";
import grab from "grab-url";
import {
  Message,
  SearchingMessage,
} from "../../components/ChatConversation/ChatWindow";
import { getSuggestions } from "../../lib/suggestions";
import { researchAgentUIConfig } from "../../config";
import { ChatModelProvider } from "../../types/chat";

const ARTICLE_PREFETCH_COUNT = 3;

/**
 * Generates a 14-char hex message ID using the Web Crypto API, matching the
 * format of server-generated IDs (`crypto.randomBytes(7).toString("hex")`).
 * Node's `crypto` module is unavailable in the browser bundle.
 */
const generateMessageId = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(7)), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");

const SOURCE_EXTRACTION_KEY = "sourceExtractionEnabled";
const THINKING_TIME_KEY = "thinkingTimeLimit";

/**
 * Parameters for sending a chat message.
 */
export interface SendMessageParams {
  /** The message content to send */
  message: string;
  /** Optional custom message ID (used when rewriting) */
  messageId?: string;
  /** Whether this is a rewrite of a previous response */
  rewrite?: boolean;
}

/**
 * Dependencies required by the sendMessage function.
 * These are passed from the ChatProvider to allow the function
 * to access and modify chat state.
 */
export interface SendMessageDeps {
  /** Current chat session ID */
  chatId: string;
  /** Whether a message is currently being sent */
  loading: boolean;
  /** Current messages in the chat */
  messages: Message[];
  /** IDs of files attached to the chat */
  fileIds: string[];
  /** Current search/focus mode */
  focusMode: string;
  /** Current category for search filtering */
  category: string;
  /** Response optimization mode */
  optimizationMode: string;
  /** Conversation history for context */
  chatHistory: [string, string][];
  /** AI model provider configuration */
  chatModelProvider: ChatModelProvider;
  /** Whether the user is authenticated */
  isAuthenticated: boolean;
  /** Ref to current messages (avoids stale closures) */
  messagesRef: React.MutableRefObject<Message[]>;
  /** Ref to the AbortController for cancelling the stream */
  abortControllerRef: React.MutableRefObject<AbortController | null>;
  /** Setter for loading state */
  setLoading: (loading: boolean) => void;
  /** Setter for message appeared state */
  setMessageAppeared: (appeared: boolean) => void;
  /** Setter for messages array */
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  /** Setter for chat history */
  setChatHistory: React.Dispatch<React.SetStateAction<[string, string][]>>;
  /** Setter for the selected chat model provider (optional — used to reset on model errors) */
  setChatModelProvider?: (provider: ChatModelProvider) => void;
}

/**
 * Sends a message to the chat API and handles the streaming response.
 *
 * This function:
 * 1. Adds the user message to the chat immediately
 * 2. Sends the request to `/api/chat`
 * 3. Processes the streaming response (sources, message chunks, completion)
 * 4. Updates the URL to include the chat ID
 * 5. Triggers auto media search if enabled
 * 6. Fetches follow-up suggestions after the response completes
 *
 * The streaming response is expected in newline-delimited JSON format with
 * message types: 'sources', 'message', 'messageEnd', 'error'.
 *
 * @param params - The message parameters
 * @param deps - State and setter dependencies from ChatProvider
 *
 * @example
 * ```typescript
 * await sendMessage(
 *   { message: 'What is TypeScript?', rewrite: false },
 *   {
 *     chatId: 'abc123',
 *     loading: false,
 *     messages: [],
 *     // ... other dependencies
 *   }
 * );
 * ```
 */
export async function sendMessage(
  params: SendMessageParams,
  deps: SendMessageDeps,
): Promise<void> {
  const { message, messageId: providedMessageId, rewrite = false } = params;
  const {
    chatId,
    loading,
    messages,
    fileIds,
    focusMode,
    category,
    optimizationMode,
    chatHistory,
    chatModelProvider,
    isAuthenticated,
    messagesRef,
    abortControllerRef,
    setLoading,
    setMessageAppeared,
    setMessages,
    setChatHistory,
    setChatModelProvider,
  } = deps;
  const sourceExtractionEnabled =
    typeof window !== "undefined" &&
    localStorage.getItem(SOURCE_EXTRACTION_KEY) === "true";

  const thinkingTimeLimit =
    typeof window !== "undefined"
      ? Number(localStorage.getItem(THINKING_TIME_KEY) ?? "0") || 0
      : 0;

  // Prevent duplicate sends or empty messages
  if (loading || !message) return;

  // Create a new AbortController for this request
  const abortController = new AbortController();
  abortControllerRef.current = abortController;

  setLoading(true);
  setMessageAppeared(false);

  // Update URL to include chat ID (for sharing/bookmarking)
  if (messages.length <= 1) {
    window.history.replaceState(null, "", `/c/${chatId}`);
  }

  // Accumulator for streaming response
  let receivedMessage = "";
  let added = false;
  let suggestionsFetched = false;
  let capturedSources: any[] = [];

  // Buffering state for deferred response reveal
  const requestStartTime = Date.now();
  const shouldBuffer = thinkingTimeLimit > 0;
  let bufferedContent = "";
  let bufferedMessageId = "";

  // Generate or use provided message ID
  const messageId = providedMessageId ?? generateMessageId();

  // Add user message to chat immediately
  setMessages((prevMessages) => [
    ...prevMessages,
    {
      content: message,
      messageId: messageId,
      chatId: chatId,
      role: "user",
      createdAt: new Date(),
    },
  ]);

  /**
   * Handles individual streaming events from the chat API.
   * @param data - Parsed JSON event from the stream
   */
  const messageHandler = async (data: any) => {
    // Handle error events
    if (data.type === "error") {
      let errorMsg: string = data.data;
      // If the model has been deprecated/removed, clear the stale selection so
      // the next request picks a fresh model from the provider's current list.
      if (
        typeof errorMsg === "string" &&
        (errorMsg.includes("no longer available") ||
          errorMsg.includes("deprecated") ||
          errorMsg.includes("410"))
      ) {
        localStorage.removeItem("chatModelKey");
        localStorage.removeItem("chatModelProviderId");
        // Reset in-memory model state so the selector shows "Select" and
        // the user is prompted to pick a valid model before the next send.
        setChatModelProvider?.({ key: "", providerId: "" });
      }
      toast.error(errorMsg);
      setLoading(false);
      return;
    }

    // Handle live search progress events
    if (data.type === "searching") {
      const searchData = data.data as { query: string; category?: string; status: "running" | "done" };
      setMessages((prevMessages) => {
        const existingIdx = prevMessages.findIndex(
          (m) => m.messageId === data.messageId && m.role === "searching",
        );
        if (existingIdx === -1) {
          return [
            ...prevMessages,
            {
              role: "searching",
              messageId: data.messageId,
              chatId: chatId,
              createdAt: new Date(),
              queries: [{ query: searchData.query, category: searchData.category, status: searchData.status }],
            } as SearchingMessage,
          ];
        }
        return prevMessages.map((m, i) => {
          if (i !== existingIdx) return m;
          const sm = m as SearchingMessage;
          const qIdx = sm.queries.findIndex((q) => q.query === searchData.query);
          if (qIdx === -1) {
            return { ...sm, queries: [...sm.queries, { query: searchData.query, category: searchData.category, status: searchData.status }] };
          }
          const updatedQueries = sm.queries.map((q, qi) =>
            qi === qIdx ? { ...q, status: searchData.status } : q,
          );
          return { ...sm, queries: updatedQueries };
        });
      });
    }

    // Handle sources (search results, documents)
    if (data.type === "sources") {
      capturedSources = data.data || [];
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          messageId: data.messageId,
          chatId: chatId,
          role: "source",
          sources: capturedSources,
          createdAt: new Date(),
        },
      ]);
      if (capturedSources.length > 0) {
        setMessageAppeared(true);
        // Prefetch top article content in the background while waiting for the response
        capturedSources.slice(0, ARTICLE_PREFETCH_COUNT).forEach((source) => {
          const url = source?.metadata?.url;
          if (url && url !== "File") {
            grab(`doc/article?url=${encodeURIComponent(url)}`).catch(() => {});
          }
        });
      }
    }

    // Handle message chunks (streaming AI response)
    if (data.type === "message") {
      receivedMessage += data.data;
      if (shouldBuffer) {
        // Accumulate content; it will be flushed after the thinking wait
        bufferedContent += data.data;
        if (!bufferedMessageId) bufferedMessageId = data.messageId;
        added = true;
      } else {
        if (!added) {
          // First chunk - create the assistant message
          setMessages((prevMessages) => [
            ...prevMessages,
            {
              content: data.data,
              messageId: data.messageId,
              chatId: chatId,
              role: "assistant",
              createdAt: new Date(),
            },
          ]);
          added = true;
          setMessageAppeared(true);
        } else {
          // Subsequent chunks - append to existing message
          setMessages((prev) =>
            prev.map((msg) => {
              if (msg.messageId === data.messageId && msg.role === "assistant") {
                return { ...msg, content: msg.content + data.data };
              }
              return msg;
            }),
          );
        }
      }
    }

    // Handle stream completion
    if (data.type === "messageEnd") {
      const finalize = async () => {
        // Flush buffered response if we were holding it
        if (shouldBuffer && bufferedContent) {
          setMessages((prevMessages) => [
            ...prevMessages,
            {
              content: bufferedContent,
              messageId: bufferedMessageId,
              chatId: chatId,
              role: "assistant",
              createdAt: new Date(),
            },
          ]);
          setMessageAppeared(true);
        }

        // Update chat history with the complete exchange
        setChatHistory((prevHistory) => [
          ...prevHistory,
          ["human", message],
          ["assistant", receivedMessage],
        ]);

        setLoading(false);

        // Auto-trigger media search if enabled
        const lastMsg = messagesRef.current[messagesRef.current.length - 1];
        const autoMediaSearch = researchAgentUIConfig.getAutoMediaSearch();

        if (autoMediaSearch) {
          document.getElementById(`search-images-${lastMsg.messageId}`)?.click();
          document.getElementById(`search-videos-${lastMsg.messageId}`)?.click();
        }

        // Fetch follow-up suggestions after every AI response
        if (!suggestionsFetched) {
          suggestionsFetched = true;
          const suggestions = await getSuggestions(messagesRef.current);
          const suggestionMessageId = generateMessageId();

          setMessages((prev) => [
            ...prev,
            {
              role: "suggestion",
              suggestions: suggestions,
              chatId: chatId,
              createdAt: new Date(),
              messageId: suggestionMessageId,
            },
          ]);

          // Save suggestions to database for authenticated users
          if (isAuthenticated && suggestions.length > 0) {
            try {
              await fetch(`/api/agent/messages`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  chatId,
                  messageId: suggestionMessageId,
                  role: "suggestion",
                  suggestions,
                }),
              });
            } catch (error) {
              console.error("Failed to save suggestions:", error);
            }
          }
        }
      };

      if (shouldBuffer) {
        const elapsed = Date.now() - requestStartTime;
        const remaining = thinkingTimeLimit * 1000 - elapsed;
        if (remaining > 0) {
          await new Promise((resolve) => setTimeout(resolve, remaining));
        }
      }

      await finalize();
    }
  };

  // For rewrites, trim history to before the rewritten message
  const messageIndex = messages.findIndex((m) => m.messageId === messageId);

  try {
    // Send the chat request
    const res = await fetch("/api/agent/chat", {
      method: "POST",
      signal: abortController.signal,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: message,
        message: {
          messageId: messageId,
          chatId: chatId,
          content: message,
        },
        chatId: chatId,
        files: fileIds,
        focusMode: focusMode,
        category: category,
        optimizationMode: optimizationMode,
        history: rewrite
          ? chatHistory.slice(0, messageIndex === -1 ? undefined : messageIndex)
          : chatHistory,
        chatModel: {
          key: chatModelProvider.key,
          providerId: chatModelProvider.providerId,
        },
        sourceExtractionEnabled,
        thinkingTimeLimit,
        systemInstructions: localStorage.getItem("systemInstructions"),
      }),
    });

    // Handle non-OK responses — parse the message body when possible
    if (!res.ok) {
      let errMessage = "Failed to send message. Please try again.";
      try {
        const errBody = await res.clone().json();
        if (errBody?.message) errMessage = errBody.message;
      } catch {
        // body not JSON — use default
      }

      if (res.status === 401 && isAuthenticated) {
        toast.error("Your session has expired. Please sign in again.");
        setLoading(false);
        window.location.href = "/";
        return;
      }

      toast.error(errMessage);
      setLoading(false);
      return;
    }

    if (!res.body) throw new Error("No response body");

    // Process the streaming response
    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let partialChunk = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      partialChunk += decoder.decode(value, { stream: true });

      try {
        // Parse newline-delimited JSON
        const lines = partialChunk.split("\n");
        // Keep the last segment as it may be an incomplete JSON chunk
        partialChunk = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const json = JSON.parse(line);
            messageHandler(json);
          } catch {
            // Malformed line - skip it
          }
        }
      } catch {
        // Incomplete JSON - wait for next chunk
      }
    }
  } catch (err: any) {
    // Handle abort (user clicked stop)
    if (err.name === "AbortError") {
      // Flush any buffered content immediately on abort
      if (shouldBuffer && bufferedContent) {
        setMessages((prevMessages) => [
          ...prevMessages,
          {
            content: bufferedContent,
            messageId: bufferedMessageId,
            chatId: chatId,
            role: "assistant",
            createdAt: new Date(),
          },
        ]);
        setMessageAppeared(true);
      }
      // Finalize chat history with whatever was received so far
      if (receivedMessage) {
        setChatHistory((prevHistory) => [
          ...prevHistory,
          ["human", message],
          ["assistant", receivedMessage],
        ]);
      }
      setLoading(false);
      abortControllerRef.current = null;
      return;
    }
    throw err;
  }

  abortControllerRef.current = null;
}
