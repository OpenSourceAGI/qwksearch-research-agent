/**
 * @fileoverview React Provider component for the chat system.
 * Orchestrates all chat functionality including state management,
 * message loading, sending, and persistence.
 * @module components/ResearchAgent/state/chat/ChatProvider
 */

'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { deleteUploadedFile } from 'qwksearch-api-client';
import { ChatTurn, UserMessage } from '../../components/ChatConversation/ChatWindow';
import { saveGuestChat, GuestChat, updateGuestChatTitle } from '../../lib/guest';
import { generateChatTitle } from '../../lib/chatTitle';
import { useSession } from '../useSession';
import { chatContext, ChatContextValue } from './ChatContext';
import { useChatState } from './useChatState';
import { checkConfig } from './chatConfig';
import { loadMessages } from './chatMessages';
import { sendMessage as sendMessageFn } from './sendMessage';

/**
 * Provider component that manages the chat system state and side effects.
 *
 * This component:
 * - Initializes chat configuration (model provider selection)
 * - Loads existing messages for a chat ID from URL params
 * - Creates new chat sessions when needed
 * - Persists guest chats to localStorage
 * - Handles initial messages from URL query params
 * - Provides the chat context to child components
 *
 * @param props - Component props
 * @param props.children - Child components that will have access to chat context
 *
 * @example
 * ```tsx
 * // In app layout
 * export default function RootLayout({ children }) {
 *   return (
 *     <ChatProvider>
 *       {children}
 *     </ChatProvider>
 *   );
 * }
 * ```
 */
export function ChatProvider({ children }: { children: React.ReactNode }) {
  // ============ Route & Auth Context ============
  const params = useParams<{ chatId?: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialMessage = searchParams.get('q');
  const { isAuthenticated, isLoading: isSessionLoading } = useSession();

  // ============ State Management ============
  const { state, setters, messagesRef, chatTurns, sections } = useChatState(
    params.chatId,
  );
  const abortControllerRef = useRef<AbortController | null>(null);
  const [incognito, setIncognito] = useState(false);

  // LLM-generated conversation titles, keyed by chatId, so the guest-persist
  // effect keeps them instead of falling back to the first message. A separate
  // set guards against requesting a title more than once per chat per session.
  const generatedTitlesRef = useRef<Record<string, string>>({});
  const titleRequestedRef = useRef<Set<string>>(new Set());

  // ============ Effects ============

  /**
   * Initialize model configuration on mount.
   * Fetches available providers and selects appropriate model.
   */
  useEffect(() => {
    checkConfig(
      setters.setChatModelProvider,
      setters.setIsConfigReady,
      setters.setHasError,
    );
  }, []);

  /**
   * Handle navigation to different chat sessions.
   * Resets state when the URL chatId parameter changes.
   */
  useEffect(() => {
    if (params.chatId && params.chatId !== state.chatId) {
      setters.setChatId(params.chatId);
      setters.setMessages([]);
      setters.setChatHistory([]);
      setters.setFiles([]);
      setters.setFileIds([]);
      setters.setIsMessagesLoaded(false);
      setters.setNotFound(false);
      setters.setNewChatCreated(false);
    }
  }, [params.chatId, state.chatId]);

  /**
   * Load messages for existing chat or create new chat session.
   * - If chatId exists: loads messages from API (authenticated) or localStorage (guest)
   * - If no chatId: generates a new chat ID immediately (no auth needed)
   */
  useEffect(() => {
    if (
      state.chatId &&
      !state.newChatCreated &&
      !state.isMessagesLoaded &&
      state.messages.length === 0
    ) {
      // Wait for session to resolve before loading an existing chat so we
      // know whether to fetch from the API or localStorage.
      if (isSessionLoading) return;
      loadMessages(
        state.chatId,
        isAuthenticated,
        setters.setMessages,
        setters.setIsMessagesLoaded,
        setters.setChatHistory,
        setters.setFocusMode,
        setters.setNotFound,
        setters.setFiles,
        setters.setFileIds,
      );
    } else if (!state.chatId) {
      // No chat ID — start a fresh session immediately without waiting for auth.
      setters.setNewChatCreated(true);
      setters.setIsMessagesLoaded(true);
      setters.setChatId(crypto.randomUUID());
    }
  }, [
    state.chatId,
    state.isMessagesLoaded,
    state.newChatCreated,
    state.messages.length,
    isAuthenticated,
    isSessionLoading,
  ]);

  /**
   * Persist guest chats to localStorage.
   * Saves chat data whenever messages change for unauthenticated users.
   */
  useEffect(() => {
    if (!incognito && !isAuthenticated && state.chatId && state.messages.length > 0) {
      const turns = state.messages.filter(
        (msg): msg is ChatTurn =>
          msg.role === 'user' || msg.role === 'assistant',
      );

      if (turns.length > 0) {
        const title =
          generatedTitlesRef.current[state.chatId] ?? turns[0].content.slice(0, 50);
        const guestChat: GuestChat = {
          id: state.chatId,
          title,
          createdAt: new Date().toISOString(),
          focusMode: state.focusMode,
          files: state.files,
          messages: state.messages,
        };
        saveGuestChat(guestChat);
      }
    }
  }, [
    state.messages,
    state.chatId,
    isAuthenticated,
    state.focusMode,
    state.files,
  ]);

  /**
   * Generate an LLM title for conversations with multiple user turns.
   *
   * Once a chat started in this session reaches two or more user messages and
   * the latest response has finished streaming, request a concise title
   * summarising the whole conversation. The title is persisted server-side for
   * authenticated users; for guests it is stored in localStorage and cached in
   * `generatedTitlesRef` so the persist effect above keeps it. Runs at most
   * once per chat per session.
   */
  useEffect(() => {
    if (incognito || !state.chatId || !state.isMessagesLoaded) return;
    // Only for chats originating in this session, not ones loaded from history.
    if (!state.newChatCreated) return;
    // Wait until the current response has finished streaming.
    if (state.loading) return;

    const userTurns = chatTurns.filter((turn) => turn.role === 'user').length;
    if (userTurns < 2) return;

    const chatId = state.chatId;
    if (titleRequestedRef.current.has(chatId)) return;
    titleRequestedRef.current.add(chatId);

    void (async () => {
      const title = await generateChatTitle(chatId, state.messages);
      if (!title) {
        // Allow a retry on the next completed turn if generation failed.
        titleRequestedRef.current.delete(chatId);
        return;
      }
      generatedTitlesRef.current[chatId] = title;
      if (!isAuthenticated) {
        updateGuestChatTitle(chatId, title);
      }
    })();
  }, [
    chatTurns,
    state.messages,
    state.chatId,
    state.loading,
    state.isMessagesLoaded,
    state.newChatCreated,
    incognito,
    isAuthenticated,
  ]);

  /**
   * Keep messagesRef synchronized with current messages.
   * Allows async callbacks to access current messages without stale closures.
   */
  useEffect(() => {
    messagesRef.current = state.messages;
  }, [state.messages]);

  /**
   * Update the ready state when both config and messages are loaded.
   * Components can use isReady to show loading states.
   */
  useEffect(() => {
    if (state.isMessagesLoaded && state.isConfigReady) {
      setters.setIsReady(true);
      console.debug(new Date(), 'app:ready');
    } else {
      setters.setIsReady(false);
    }
  }, [state.isMessagesLoaded, state.isConfigReady]);

  /**
   * Send initial message from URL query parameter.
   * Allows deep linking with pre-filled messages: /?q=Hello
   */
  useEffect(() => {
    if (state.isReady && initialMessage && state.isConfigReady) {
      handleSendMessage(initialMessage);
    }
  }, [state.isConfigReady, state.isReady, initialMessage]);

  // ============ Callbacks ============

  /**
   * Sends a message to the chat.
   * Wraps sendMessageFn with current state dependencies.
   */
  const handleSendMessage = useCallback(
    async (message: string, messageId?: string, rewrite = false) => {
      if (!state.chatId) return;

      await sendMessageFn(
        { message, messageId, rewrite },
        {
          chatId: state.chatId,
          loading: state.loading,
          messages: state.messages,
          fileIds: state.fileIds,
          files: state.files,
          focusMode: state.focusMode,
          category: state.category,
          optimizationMode: state.optimizationMode,
          chatHistory: state.chatHistory,
          chatModelProvider: state.chatModelProvider,
          isAuthenticated,
          messagesRef,
          abortControllerRef,
          setLoading: setters.setLoading,
          setMessageAppeared: setters.setMessageAppeared,
          setMessages: setters.setMessages,
          setChatHistory: setters.setChatHistory,
          setChatModelProvider: setters.setChatModelProvider,
        },
      );
    },
    [
      state.chatId,
      state.loading,
      state.messages,
      state.fileIds,
      state.files,
      state.focusMode,
      state.category,
      state.optimizationMode,
      state.chatHistory,
      state.chatModelProvider,
      isAuthenticated,
      messagesRef,
    ],
  );

  /**
   * Rewrites a previous AI response.
   * Removes messages after the target and regenerates with the same user message.
   */
  const handleRewrite = useCallback(
    (messageId: string) => {
      const index = state.messages.findIndex(
        (msg) => msg.messageId === messageId,
      );
      const chatTurnsIndex = chatTurns.findIndex(
        (msg) => msg.messageId === messageId,
      );

      if (index === -1) return;

      // Get the user message before this assistant message
      const message = chatTurns[chatTurnsIndex - 1];

      // Truncate messages to before the user message
      setters.setMessages((prev) => [
        ...prev.slice(
          0,
          state.messages.length > 2 ? state.messages.indexOf(message) : 0,
        ),
      ]);
      // Truncate history to match
      setters.setChatHistory((prev) => [
        ...prev.slice(0, chatTurns.length > 2 ? chatTurnsIndex - 1 : 0),
      ]);

      // Resend the same message
      handleSendMessage(message.content, message.messageId, true);
    },
    [state.messages, chatTurns, handleSendMessage],
  );

  /**
   * Deletes an uploaded file everywhere it appears.
   *
   * Optimistically removes the file from the chat-level attachment lists and
   * from any user message that referenced it, then deletes the underlying
   * upload from the server. On server failure the local removal is kept (the
   * file is already gone from the user's view) and an error toast is shown.
   */
  const handleDeleteAttachedFile = useCallback(
    async (fileId: string) => {
      // Remove from the chat-level attachment lists (composer + context).
      setters.setFiles(state.files.filter((f) => f.fileId !== fileId));
      setters.setFileIds(state.fileIds.filter((id) => id !== fileId));

      // Remove from any message that carried this file inline.
      setters.setMessages((prev) =>
        prev.map((msg) => {
          if (msg.role !== 'user') return msg;
          const userMsg = msg as UserMessage;
          if (!userMsg.files?.some((f) => f.fileId === fileId)) return msg;
          return {
            ...userMsg,
            files: userMsg.files.filter((f) => f.fileId !== fileId),
          };
        }),
      );

      try {
        const { error } = await deleteUploadedFile({ query: { fileId } });
        if (error) {
          throw new Error((error as { message?: string }).message ?? 'Delete failed');
        }
      } catch (err) {
        console.error('[ChatProvider] Failed to delete uploaded file:', err);
        toast.error('Removed from the chat, but the file could not be deleted from storage.');
      }
    },
    [state.files, state.fileIds],
  );

  /**
   * Stops the currently streaming response by aborting the fetch.
   */
  const handleStopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  /**
   * Clears the current chat and starts a fresh session.
   * Resets all state and generates a new chat ID without navigating.
   */
  const handleNewChat = useCallback(() => {
    handleStopStreaming();
    setters.setMessages([]);
    setters.setChatHistory([]);
    setters.setFiles([]);
    setters.setFileIds([]);
    setters.setChatId(undefined);
    setters.setNewChatCreated(false);
    setters.setIsMessagesLoaded(false);
    setters.setNotFound(false);
    router.push('/');
  }, [handleStopStreaming, router]);

  /**
   * Starts a brand-new chat session with a caller-supplied ID, without
   * navigating away from the current route (`newChat` pushes to `/`).
   * Skips the message-loading fetch entirely since the ID is known to be
   * unused, avoiding a spurious "not found" round-trip.
   */
  const handleStartNewChat = useCallback((id: string) => {
    handleStopStreaming();
    setters.setMessages([]);
    setters.setChatHistory([]);
    setters.setFiles([]);
    setters.setFileIds([]);
    setters.setNotFound(false);
    setters.setNewChatCreated(true);
    setters.setIsMessagesLoaded(true);
    setters.setChatId(id);
  }, [handleStopStreaming]);

  /**
   * Switches the active chat to an existing chat ID and loads its messages,
   * without navigating away from the current route.
   */
  const handleSwitchToChat = useCallback((id: string) => {
    if (id === state.chatId) return;
    handleStopStreaming();
    setters.setMessages([]);
    setters.setChatHistory([]);
    setters.setFiles([]);
    setters.setFileIds([]);
    setters.setIsMessagesLoaded(false);
    setters.setNotFound(false);
    setters.setNewChatCreated(false);
    setters.setChatId(id);
  }, [handleStopStreaming, state.chatId]);

  // ============ Context Value ============

  /** The complete context value provided to consumers */
  const contextValue: ChatContextValue = {
    // State
    messages: state.messages,
    chatTurns,
    sections,
    chatHistory: state.chatHistory,
    files: state.files,
    fileIds: state.fileIds,
    focusMode: state.focusMode,
    category: state.category,
    chatId: state.chatId,
    hasError: state.hasError,
    isMessagesLoaded: state.isMessagesLoaded,
    isReady: state.isReady,
    loading: state.loading,
    messageAppeared: state.messageAppeared,
    notFound: state.notFound,
    optimizationMode: state.optimizationMode,
    chatModelProvider: state.chatModelProvider,
    incognito,
    // Actions
    setFileIds: setters.setFileIds,
    setFiles: setters.setFiles,
    deleteAttachedFile: handleDeleteAttachedFile,
    setFocusMode: setters.setFocusMode,
    setCategory: setters.setCategory,
    setOptimizationMode: setters.setOptimizationMode,
    rewrite: handleRewrite,
    sendMessage: handleSendMessage,
    setChatModelProvider: setters.setChatModelProvider,
    stopStreaming: handleStopStreaming,
    newChat: handleNewChat,
    startNewChat: handleStartNewChat,
    switchToChat: handleSwitchToChat,
    setIncognito,
  };

  return (
    <chatContext.Provider value={contextValue}>{children}</chatContext.Provider>
  );
}
