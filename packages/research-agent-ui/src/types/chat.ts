/**
 * @fileoverview Type definitions for the chat system.
 * Contains interfaces and types used across all chat-related modules.
 * @module components/ResearchAgent/state/chat/types
 */

import {
  AssistantMessage,
  ChatTurn,
  Message,
  SearchingMessage,
  SourceMessage,
  UserMessage,
} from "../components/ChatConversation/ChatWindow";

/**
 * Represents a section of the chat UI, grouping related messages together.
 * Each section contains a user message and its corresponding AI response,
 * sources, and follow-up suggestions.
 */
export type Section = {
  /** The user's input message */
  userMessage: UserMessage;
  /** The AI assistant's response, if available */
  assistantMessage: AssistantMessage | undefined;
  /** The processed message content with citations and formatting applied */
  parsedAssistantMessage: string | undefined;
  /** The message content optimized for text-to-speech */
  speechMessage: string | undefined;
  /** Sources/references used to generate the response */
  sourceMessage: SourceMessage | undefined;
  /** Live search progress (queries + statuses) while the agent is running */
  searchingMessage: SearchingMessage | undefined;
  /** Whether the AI has finished its reasoning/thinking phase */
  thinkingEnded: boolean;
  /** Follow-up question suggestions for the user */
  suggestions?: string[];
};

/**
 * Represents an uploaded file attached to a chat.
 */
export interface ChatFile {
  /** The original name of the file */
  fileName: string;
  /** The file extension (e.g., 'pdf', 'txt') */
  fileExtension: string;
  /** Unique identifier for the uploaded file */
  fileId: string;
}

/**
 * Configuration for the chat model provider.
 * Determines which AI model and provider to use for generating responses.
 */
export interface ChatModelProvider {
  /** The specific model key (e.g., 'llama-3.1-70b') */
  key: string;
  /** The provider identifier (e.g., 'groq', 'openai') */
  providerId: string;
}

/**
 * The complete context type for the chat system.
 * Contains all state values and action functions available to chat consumers.
 */
export type ChatContextType = {
  // ============ State ============

  /** All messages in the current chat */
  messages: Message[];
  /** Filtered list containing only user and assistant messages */
  chatTurns: ChatTurn[];
  /** Parsed sections for UI rendering */
  sections: Section[];
  /** History of conversation turns as [role, content] pairs */
  chatHistory: [string, string][];
  /** Files attached to the chat */
  files: ChatFile[];
  /** IDs of attached files */
  fileIds: string[];
  /** Current search/focus mode (e.g., 'webSearch', 'academic') */
  focusMode: string;
  /** Current category for the search */
  category: string;
  /** Unique identifier for the current chat session */
  chatId: string | undefined;
  /** Optimization mode (e.g., 'speed', 'quality') */
  optimizationMode: string;
  /** Whether messages have been loaded from storage/API */
  isMessagesLoaded: boolean;
  /** Whether a message is currently being sent/streamed */
  loading: boolean;
  /** Whether the requested chat was not found */
  notFound: boolean;
  /** Whether the AI response has started appearing */
  messageAppeared: boolean;
  /** Whether the chat system is fully initialized and ready */
  isReady: boolean;
  /** Whether an error occurred during initialization */
  hasError: boolean;
  /** Current chat model provider configuration */
  chatModelProvider: ChatModelProvider;

  // ============ Actions ============

  /**
   * Sets the optimization mode for responses.
   * @param mode - The optimization mode to use
   */
  setOptimizationMode: (mode: string) => void;

  /**
   * Sets the search/focus mode.
   * @param mode - The focus mode to use
   */
  setFocusMode: (mode: string) => void;

  /**
   * Sets the search category.
   * @param category - The category to use
   */
  setCategory: (category: string) => void;

  /**
   * Sets the attached files.
   * @param files - Array of chat files
   */
  setFiles: (files: ChatFile[]) => void;

  /**
   * Sets the file IDs for attached files.
   * @param fileIds - Array of file IDs
   */
  setFileIds: (fileIds: string[]) => void;

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
   * @param messageId - The ID of the message to rewrite
   */
  rewrite: (messageId: string) => void;

  /**
   * Updates the chat model provider configuration.
   * @param provider - The new provider configuration
   */
  setChatModelProvider: (provider: ChatModelProvider) => void;
};
