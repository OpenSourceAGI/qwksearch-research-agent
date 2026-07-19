/**
 * @fileoverview React hook for managing all chat-related state.
 * Centralizes useState, useRef, and useMemo hooks for the chat system,
 * providing a clean separation between state management and side effects.
 * @module components/ResearchAgent/state/chat/useChatState
 */

"use client";

import { useState, useRef, useMemo } from "react";
import {
  ChatTurn,
  Message,
} from "../../components/ChatConversation/ChatWindow";
import { ChatFile, ChatModelProvider, Section } from "../../types/chat";
import { buildSections } from "./buildSections";

/**
 * The complete state object for the chat system.
 * Contains all values managed by useState hooks.
 */
export interface ChatState {
  /** Unique identifier for the current chat session */
  chatId: string | undefined;
  /** Whether this is a newly created chat (not loaded from storage) */
  newChatCreated: boolean;
  /** Whether a message is currently being sent/processed */
  loading: boolean;
  /** Whether the AI response has started appearing (for loading indicators) */
  messageAppeared: boolean;
  /** History of conversation as [role, content] pairs for context */
  chatHistory: [string, string][];
  /** All messages in the current chat */
  messages: Message[];
  /** Files attached to the chat */
  files: ChatFile[];
  /** IDs of attached files for API requests */
  fileIds: string[];
  /** Current search/focus mode (e.g., 'webSearch', 'academic') */
  focusMode: string;
  /** Current category for search filtering */
  category: string;
  /** Response optimization mode (e.g., 'speed', 'quality') */
  optimizationMode: string;
  /** Whether messages have been loaded from storage/API */
  isMessagesLoaded: boolean;
  /** Whether the requested chat was not found */
  notFound: boolean;
  /** Current AI model provider configuration */
  chatModelProvider: ChatModelProvider;
  /** Whether the model configuration has been loaded */
  isConfigReady: boolean;
  /** Whether an error occurred during initialization */
  hasError: boolean;
  /** Whether the chat system is fully ready for use */
  isReady: boolean;
}

/**
 * Collection of setter functions for updating chat state.
 * Includes both simple setters and React dispatch functions for complex updates.
 */
export interface ChatStateSetters {
  /** Sets the chat ID */
  setChatId: (id: string | undefined) => void;
  /** Sets whether a new chat was created */
  setNewChatCreated: (created: boolean) => void;
  /** Sets the loading state */
  setLoading: (loading: boolean) => void;
  /** Sets whether the message has appeared */
  setMessageAppeared: (appeared: boolean) => void;
  /** Sets the chat history (supports functional updates) */
  setChatHistory: React.Dispatch<React.SetStateAction<[string, string][]>>;
  /** Sets the messages array (supports functional updates) */
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  /** Sets the attached files */
  setFiles: (files: ChatFile[]) => void;
  /** Sets the file IDs */
  setFileIds: (ids: string[]) => void;
  /** Sets the focus mode */
  setFocusMode: (mode: string) => void;
  /** Sets the category */
  setCategory: (category: string) => void;
  /** Sets the optimization mode */
  setOptimizationMode: (mode: string) => void;
  /** Sets whether messages are loaded */
  setIsMessagesLoaded: (loaded: boolean) => void;
  /** Sets the not found state */
  setNotFound: (notFound: boolean) => void;
  /** Sets the chat model provider */
  setChatModelProvider: (provider: ChatModelProvider) => void;
  /** Sets whether config is ready */
  setIsConfigReady: (ready: boolean) => void;
  /** Sets the error state */
  setHasError: (hasError: boolean) => void;
  /** Sets the ready state */
  setIsReady: (ready: boolean) => void;
}

/**
 * Return type of the useChatState hook.
 */
export interface UseChatStateReturn {
  /** All state values */
  state: ChatState;
  /** All setter functions */
  setters: ChatStateSetters;
  /** Ref to current messages (for use in async callbacks) */
  messagesRef: React.MutableRefObject<Message[]>;
  /** Filtered list of user and assistant messages only */
  chatTurns: ChatTurn[];
  /** Processed sections for UI rendering */
  sections: Section[];
}

/**
 * Custom hook that manages all state for the chat system.
 *
 * This hook centralizes all useState, useRef, and useMemo hooks used by the chat,
 * providing a clean separation between state management and side effects.
 * The ChatProvider uses this hook and adds useEffect hooks for side effects.
 *
 * @param initialChatId - Optional chat ID to initialize with (from URL params)
 * @returns Object containing state, setters, ref, and derived values
 *
 * @example
 * ```typescript
 * function ChatProvider({ children }) {
 *   const { state, setters, messagesRef, chatTurns, sections } = useChatState(
 *     params.chatId
 *   );
 *
 *   // Add effects using state and setters...
 *
 *   return <ChatContext.Provider value={...}>{children}</ChatContext.Provider>;
 * }
 * ```
 */
export function useChatState(initialChatId?: string): UseChatStateReturn {
  // ============ Core State ============
  const [chatId, setChatId] = useState<string | undefined>(initialChatId);
  const [newChatCreated, setNewChatCreated] = useState(false);

  // ============ Loading States ============
  const [loading, setLoading] = useState(false);
  const [messageAppeared, setMessageAppeared] = useState(false);
  const [isMessagesLoaded, setIsMessagesLoaded] = useState(false);
  const [isConfigReady, setIsConfigReady] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [notFound, setNotFound] = useState(false);

  // ============ Message State ============
  const [chatHistory, setChatHistory] = useState<[string, string][]>([]);
  const [messages, setMessages] = useState<Message[]>([]);

  // ============ File State ============
  const [files, setFiles] = useState<ChatFile[]>([]);
  const [fileIds, setFileIds] = useState<string[]>([]);

  // ============ Configuration State ============
  const [focusMode, setFocusMode] = useState("webSearch");
  const [category, setCategory] = useState("general");
  const [optimizationMode, setOptimizationMode] = useState("speed");
  const [chatModelProvider, setChatModelProvider] = useState<ChatModelProvider>(
    {
      key: "",
      providerId: "",
    },
  );

  // ============ Refs ============
  /** Ref for accessing current messages in async callbacks without stale closures */
  const messagesRef = useRef<Message[]>([]);

  // ============ Derived Values ============
  /**
   * Filtered list containing only user and assistant messages.
   * Used for building chat history context.
   */
  const chatTurns = useMemo((): ChatTurn[] => {
    return messages.filter(
      (msg): msg is ChatTurn => msg.role === "user" || msg.role === "assistant",
    );
  }, [messages]);

  /**
   * Processed sections for UI rendering.
   * Groups messages and applies citation processing.
   */
  const sections = useMemo<Section[]>(() => {
    return buildSections(messages);
  }, [messages]);

  return {
    state: {
      chatId,
      newChatCreated,
      loading,
      messageAppeared,
      chatHistory,
      messages,
      files,
      fileIds,
      focusMode,
      category,
      optimizationMode,
      isMessagesLoaded,
      notFound,
      chatModelProvider,
      isConfigReady,
      hasError,
      isReady,
    },
    setters: {
      setChatId,
      setNewChatCreated,
      setLoading,
      setMessageAppeared,
      setChatHistory,
      setMessages,
      setFiles,
      setFileIds,
      setFocusMode,
      setCategory,
      setOptimizationMode,
      setIsMessagesLoaded,
      setNotFound,
      setChatModelProvider,
      setIsConfigReady,
      setHasError,
      setIsReady,
    },
    messagesRef,
    chatTurns,
    sections,
  };
}
