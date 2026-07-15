/**
 * @fileoverview Chat system module exports.
 *
 * This module provides a complete chat system implementation with:
 * - **State management**: Centralized state via `useChatState` hook
 * - **Context provider**: `ChatProvider` for React context
 * - **Message handling**: Send, receive, and stream chat messages
 * - **Persistence**: Guest chat storage in localStorage
 * - **Configuration**: AI model provider selection and setup
 *
 * ## Architecture
 *
 * ```
 * ChatProvider (orchestration)
 *   └── useChatState (state management)
 *         ├── checkConfig (model configuration)
 *         ├── loadMessages (message loading)
 *         ├── sendMessage (message sending)
 *         └── buildSections (UI processing)
 * ```
 *
 * ## Quick Start
 *
 * ```tsx
 * // 1. Wrap your app with ChatProvider
 * import { ChatProvider } from 'research-agent-ui';
 *
 * function App({ children }) {
 *   return <ChatProvider>{children}</ChatProvider>;
 * }
 *
 * // 2. Use the chat hook in components
 * import { useChat } from 'research-agent-ui';
 *
 * function ChatComponent() {
 *   const { messages, sendMessage, loading } = useChat();
 *
 *   return (
 *     <div>
 *       {messages.map(msg => <Message key={msg.messageId} {...msg} />)}
 *       <Input onSubmit={sendMessage} disabled={loading} />
 *     </div>
 *   );
 * }
 * ```
 *
 * @module components/ResearchAgent/state/chat
 */

// ============ Types ============
export * from "../../types/chat";

// ============ Utilities ============
export { checkConfig } from "./chatConfig";
export { loadMessages } from "./chatMessages";
export { buildSections } from "./buildSections";
export { sendMessage } from "./sendMessage";

// ============ State Hook ============
export { useChatState } from "./useChatState";
export type {
  ChatState,
  ChatStateSetters,
  UseChatStateReturn,
} from "./useChatState";

// ============ Context and Provider ============
export { chatContext, useChat } from "./ChatContext";
export type { ChatContextValue } from "./ChatContext";
export { ChatProvider } from "./ChatProvider";
