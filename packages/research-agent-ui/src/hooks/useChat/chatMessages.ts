/**
 * @fileoverview Chat message loading functionality.
 * Handles loading chat messages from localStorage (for guest chats),
 * the API (for authenticated users), or the API for public shared chats (for unauthenticated users).
 * @module components/ResearchAgent/state/chat/chatMessages
 */

import {
  ChatTurn,
  Message,
} from "../../components/ChatConversation/ChatWindow";
import { getGuestChat } from "../../lib/guest";
import { ChatFile } from "../../types/chat";

/**
 * Loads chat messages and metadata for an existing chat session.
 *
 * This function handles three scenarios:
 * - **Guest users**: Loads messages from localStorage via `getGuestChat()`, then tries API for public shared chats if not found
 * - **Public shared chats**: Unauthenticated users can view public chats via the API without sign-in
 * - **Authenticated users**: Fetches messages from the `/api/chats/:id` endpoint
 *
 * After loading, it:
 * - Sets the document title to the first message
 * - Builds the chat history for context
 * - Loads attached files and their IDs
 * - Sets the focus mode from the saved chat
 *
 * @param chatId - The unique identifier of the chat to load
 * @param isAuthenticated - Whether the current user is authenticated
 * @param setMessages - Callback to set the loaded messages
 * @param setIsMessagesLoaded - Callback to signal loading completion
 * @param setChatHistory - Callback to set the conversation history
 * @param setFocusMode - Callback to set the chat's focus mode
 * @param setNotFound - Callback to signal if the chat doesn't exist
 * @param setFiles - Callback to set the attached files
 * @param setFileIds - Callback to set the file IDs
 *
 * @example
 * ```typescript
 * await loadMessages(
 *   chatId,
 *   isAuthenticated,
 *   setMessages,
 *   setIsMessagesLoaded,
 *   setChatHistory,
 *   setFocusMode,
 *   setNotFound,
 *   setFiles,
 *   setFileIds,
 * );
 * ```
 */
export const loadMessages = async (
  chatId: string,
  isAuthenticated: boolean,
  setMessages: (messages: Message[]) => void,
  setIsMessagesLoaded: (loaded: boolean) => void,
  setChatHistory: (history: [string, string][]) => void,
  setFocusMode: (mode: string) => void,
  setNotFound: (notFound: boolean) => void,
  setFiles: (files: ChatFile[]) => void,
  setFileIds: (fileIds: string[]) => void,
): Promise<void> => {
  // ============ Guest User Flow ============
  // For unauthenticated users, first check localStorage, then try API for public chats
  if (!isAuthenticated) {
    const guestChat = getGuestChat(chatId);

    if (guestChat) {
      // Found in localStorage
      setMessages(guestChat.messages);

      // Extract user and assistant messages for history
      const chatTurns = guestChat.messages.filter(
        (msg): msg is ChatTurn => msg.role === "user" || msg.role === "assistant",
      );

      const history = chatTurns.map((msg) => {
        return [msg.role, msg.content];
      }) as [string, string][];

      // Set document title to first message for better tab identification
      if (chatTurns.length > 0) {
        document.title = chatTurns[0].content;
      }

      setFiles(guestChat.files || []);
      setFileIds((guestChat.files || []).map((file: ChatFile) => file.fileId));
      setChatHistory(history);
      setFocusMode(guestChat.focusMode);
      setIsMessagesLoaded(true);
      return;
    }

    // Not in localStorage - try API for public shared chats
    try {
      const response = await fetch(`/api/agent/chats/${chatId}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404 || response.status === 403) {
          setNotFound(true);
          setIsMessagesLoaded(true);
          return;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const { messages, chat } = await response.json();

      if (!messages || !chat) {
        setNotFound(true);
        setIsMessagesLoaded(true);
        return;
      }

      setMessages(messages);

      // Extract user and assistant messages for history
      const chatTurns = messages.filter(
        (msg): msg is ChatTurn => msg.role === "user" || msg.role === "assistant",
      );

      const history = chatTurns.map((msg) => {
        return [msg.role, msg.content];
      }) as [string, string][];

      // Set document title to first message for better tab identification
      if (chatTurns.length > 0) {
        document.title = chatTurns[0].content;
      }

      // Transform API file format to ChatFile format
      const files = chat.files.map((file: any) => {
        return {
          fileName: file.name,
          fileExtension: file.name.split(".").pop(),
          fileId: file.fileId,
        };
      });

      setFiles(files);
      setFileIds(files.map((file: ChatFile) => file.fileId));

      setChatHistory(history);
      setFocusMode(chat.focusMode);
      setIsMessagesLoaded(true);
      return;
    } catch (error) {
      console.error('[chatMessages] Failed to load public chat:', error);
      setNotFound(true);
      setIsMessagesLoaded(true);
      return;
    }
  }

  // ============ Authenticated User Flow ============
  // Fetch from API for authenticated users
  try {
    const response = await fetch(`/api/agent/chats/${chatId}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404 || response.status === 401 || response.status === 403) {
        setNotFound(true);
        setIsMessagesLoaded(true);
        return;
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const { messages, chat } = await response.json();

    if (!messages || !chat) {
      setNotFound(true);
      setIsMessagesLoaded(true);
      return;
    }

  setMessages(messages);

  // Extract user and assistant messages for history
  const chatTurns = messages.filter(
    (msg): msg is ChatTurn => msg.role === "user" || msg.role === "assistant",
  );

  const history = chatTurns.map((msg) => {
    return [msg.role, msg.content];
  }) as [string, string][];

  console.debug(new Date(), "app:messages_loaded");

  // Set document title to first message for better tab identification
  if (chatTurns.length > 0) {
    document.title = chatTurns[0].content;
  }

  // Transform API file format to ChatFile format
  const files = chat.files.map((file: any) => {
    return {
      fileName: file.name,
      fileExtension: file.name.split(".").pop(),
      fileId: file.fileId,
    };
  });

    setFiles(files);
    setFileIds(files.map((file: ChatFile) => file.fileId));

    setChatHistory(history);
    setFocusMode(chat.focusMode);
    setIsMessagesLoaded(true);
  } catch (error) {
    console.error('[chatMessages] Failed to load chat:', error);
    setNotFound(true);
    setIsMessagesLoaded(true);
  }
};
