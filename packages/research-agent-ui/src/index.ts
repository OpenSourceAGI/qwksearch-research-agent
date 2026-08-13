/**
 * @fileoverview research-agent-ui - Chat research agent UI: conversation window, article
 * reader, search config, file uploads, and chat history for QwkSearch-style
 * apps.
 *
 * @example
 * ```tsx
 * import {
 *   ChatProvider,
 *   SessionProvider,
 *   ExtractPanelProvider,
 *   ChatWindow,
 *   configureResearchAgentUI,
 * } from 'research-agent-ui';
 *
 * configureResearchAgentUI({ appName: 'MyApp', authClient: myAuthClient });
 *
 * function App() {
 *   return (
 *     <SessionProvider authClient={myAuthClient}>
 *       <ExtractPanelProvider>
 *         <ChatProvider>
 *           <ChatWindow />
 *         </ChatProvider>
 *       </ExtractPanelProvider>
 *     </SessionProvider>
 *   );
 * }
 * ```
 */
'use client';

// ============ Configuration ============
export {
  researchAgentUIConfig,
  configureResearchAgentUI,
} from './config';
export type {
  ResearchAgentUIConfig,
  ResearchAgentAuthClient,
  FooterLink,
} from './config';

// ============ Chat ============
export { default as ChatWindow } from './components/ChatConversation/ChatWindow';
export type {
  Message,
  ChatTurn,
  UserMessage,
  AssistantMessage,
  SourceMessage,
  SearchingMessage,
} from './components/ChatConversation/ChatWindow';
export {
  ChatProvider,
  useChat,
  useChatState,
} from './hooks/useChat';
export type { ChatContextValue } from './hooks/useChat';

// ============ Session / Auth ============
export { SessionProvider, useSession } from './hooks/useSession';

// ============ Article Reader ============
export {
  ExtractPanelProvider,
  useExtractPanel,
} from './components/ArticleReader/ExtractPanelContext';
export * from './components/ArticleReader';

// ============ Chat History ============
export { default as HistoryDropdown } from './components/ChatHistoryDropdown';
export { HistoryDialogs } from './components/ChatHistoryDropdown/HistoryDialogs';
export { useHistoryState } from './components/ChatHistoryDropdown/useHistoryState';

// ============ Types ============
export * from './types/chat';

// ============ Voice & TTS ============
export { useKokoroTTS } from './hooks/voice/useKokoroTTS';
export { useTextToSpeech } from './hooks/voice/useTextToVoice';
export { default as VoiceSettingsPanel } from './components/VoiceSettings/VoiceSettingsPanel';
export { default as KokoroVoiceSelector } from './components/VoiceSettings/KokoroVoiceSelector';

// ============ Utilities ============
export { cn, formatTimeDifference, formatMessageTime } from './lib/utils';
