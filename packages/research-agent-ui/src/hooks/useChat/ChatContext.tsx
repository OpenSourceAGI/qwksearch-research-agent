/**
 * @fileoverview React Context for the chat system.
 * Provides the ChatContext and useChat hook for accessing chat state
 * and actions throughout the application.
 * @module components/ResearchAgent/state/chat/ChatContext
 */

'use client';

import { createContext, useContext } from 'react';
import { ChatTurn, Message } from '../../components/ChatConversation/ChatWindow';
import { ChatFile, ChatModelProvider, Section } from '../../types/chat';

/**
 * The value provided by the ChatContext.
 * Contains all state and actions available to chat consumers.
 */
export interface ChatContextValue {
  // ============ State ============

  /** All messages in the current chat (user, assistant, source, suggestion) */
  messages: Message[];
  /** Filtered list of only user and assistant messages */
  chatTurns: ChatTurn[];
  /** Processed sections for UI rendering with citations and formatting */
  sections: Section[];
  /** Conversation history as [role, content] pairs for AI context */
  chatHistory: [string, string][];
  /** Files attached to the chat */
  files: ChatFile[];
  /** IDs of attached files for API requests */
  fileIds: string[];
  /** Current search/focus mode (e.g., 'webSearch', 'academic') */
  focusMode: string;
  /** Current category for filtering search results */
  category: string;
  /** Unique identifier for the current chat session */
  chatId: string | undefined;
  /** Response optimization mode (e.g., 'speed', 'quality') */
  optimizationMode: string;
  /** Whether messages have been loaded from storage/API */
  isMessagesLoaded: boolean;
  /** Whether a message is currently being sent/processed */
  loading: boolean;
  /** Whether the requested chat was not found */
  notFound: boolean;
  /** Whether the AI response has started appearing */
  messageAppeared: boolean;
  /** Whether the chat system is fully initialized and ready */
  isReady: boolean;
  /** Whether an error occurred during initialization */
  hasError: boolean;
  /** Current AI model provider configuration */
  chatModelProvider: ChatModelProvider;

  // ============ Actions ============

  /**
   * Sets the response optimization mode.
   * @param mode - The optimization mode ('speed' or 'quality')
   */
  setOptimizationMode: (mode: string) => void;

  /**
   * Sets the search/focus mode.
   * @param mode - The focus mode (e.g., 'webSearch', 'academic')
   */
  setFocusMode: (mode: string) => void;

  /**
   * Sets the search category.
   * @param category - The category for filtering results
   */
  setCategory: (category: string) => void;

  /**
   * Sets the files attached to the chat.
   * @param files - Array of ChatFile objects
   */
  setFiles: (files: ChatFile[]) => void;

  /**
   * Sets the file IDs for attached files.
   * @param fileIds - Array of file ID strings
   */
  setFileIds: (fileIds: string[]) => void;

  /**
   * Permanently deletes an uploaded file: removes it from the server, from the
   * chat-level attachment lists, and from any message it was attached to.
   * @param fileId - The ID of the uploaded file to delete
   */
  deleteAttachedFile: (fileId: string) => Promise<void>;

  /**
   * Sends a message to the chat.
   * @param message - The message content to send
   * @param messageId - Optional custom message ID
   * @param rewrite - Whether this is a rewrite of a previous message
   */
  sendMessage: (
    message: string,
    messageId?: string,
    rewrite?: boolean,
  ) => Promise<void>;

  /**
   * Rewrites a previous AI response.
   * Removes messages after the specified one and regenerates the response.
   * @param messageId - The ID of the assistant message to rewrite
   */
  rewrite: (messageId: string) => void;

  /**
   * Updates the AI model provider configuration.
   * @param provider - The new provider configuration
   */
  setChatModelProvider: (provider: ChatModelProvider) => void;

  /**
   * Stops the currently streaming response.
   * Aborts the fetch request and finalizes with whatever content was received.
   */
  stopStreaming: () => void;

  /**
   * Clears the current chat and starts a new session.
   * Resets all messages, history, and generates a new chat ID.
   */
  newChat: () => void;

  /**
   * Whether incognito mode is active.
   * When true, messages are not saved to history or cloud.
   */
  incognito: boolean;

  /**
   * Toggles incognito mode on or off.
   */
  setIncognito: (value: boolean) => void;
}

/**
 * React Context for the chat system.
 *
 * Provides access to chat state and actions throughout the component tree.
 * Should be used with the ChatProvider component at the app root.
 *
 * @example
 * ```tsx
 * // In a component
 * const { messages, sendMessage, loading } = useChat();
 * ```
 */
export const chatContext = createContext<ChatContextValue>({
  // Default state values
  chatHistory: [],
  chatId: '',
  fileIds: [],
  files: [],
  focusMode: '',
  category: '',
  hasError: false,
  isMessagesLoaded: false,
  isReady: false,
  loading: false,
  messageAppeared: false,
  messages: [],
  chatTurns: [],
  sections: [],
  notFound: false,
  optimizationMode: '',
  chatModelProvider: { key: '', providerId: '' },
  // Default no-op actions
  rewrite: () => { },
  sendMessage: async () => { },
  setFileIds: () => { },
  setFiles: () => { },
  deleteAttachedFile: async () => { },
  setFocusMode: () => { },
  setCategory: () => { },
  setOptimizationMode: () => { },
  setChatModelProvider: () => { },
  stopStreaming: () => { },
  newChat: () => { },
  incognito: false,
  setIncognito: () => { },
});

/**
 * Hook for accessing the chat context.
 *
 * Provides access to all chat state and actions.
 * Must be used within a ChatProvider component.
 *
 * @returns The current ChatContextValue
 *
 * @example
 * ```tsx
 * function ChatInput() {
 *   const { sendMessage, loading } = useChat();
 *
 *   const handleSubmit = (message: string) => {
 *     if (!loading) {
 *       sendMessage(message);
 *     }
 *   };
 *
 *   return <input disabled={loading} onSubmit={handleSubmit} />;
 * }
 * ```
 */
export function useChat(): ChatContextValue {
  return useContext(chatContext);
}
