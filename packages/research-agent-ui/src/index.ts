/**
 * @fileoverview research-agent-ui - the QwkSearch app UI: conversation window,
 * article reader, search config, file uploads, chat history, and the app shell
 * (providers, dock, cookie banner) that mounts them as a complete app.
 *
 * This root entry is the **editor-free** build. For the same app *with* the
 * REASON document editor and its file sidebar, import from
 * `research-agent-ui/workspace` instead — it re-exports everything here plus
 * `QwkSearchWorkspaceApp`, and additionally requires the
 * `react-reason-editor` / `react-reason-editor-sidebar` optional peers.
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
 *
 * @example Mounting the whole app in one component instead:
 * ```tsx
 * import { QwkSearchApp } from 'research-agent-ui';
 * // …or, with the REASON editor:
 * // import { QwkSearchWorkspaceApp } from 'research-agent-ui/workspace';
 *
 * export default function Page() {
 *   return <QwkSearchApp authClient={myAuthClient} config={{ appName: 'MyApp' }} />;
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
export { default as ChatInputBox } from './components/MessageComposer/ChatInputBox';
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

// ============ Spotlight Palette ============
// The Ctrl-Space overlay that searches chats, pages, settings and actions.
// `QwkSearchProviders` mounts it already; these exports are for hosts that
// build their own shell, or want to open it from their own chrome.
export {
  SpotlightPalette,
  openSpotlight,
  SPOTLIGHT_LINKS,
  SPOTLIGHT_PREFIXES,
  matchSpotlight,
  parsePrefix,
} from './components/SpotlightPalette';
export type {
  SpotlightContext,
  SpotlightItem,
  SpotlightLink,
  SpotlightPrefix,
  SpotlightSource,
} from './components/SpotlightPalette';

// ============ Types ============
export * from './types/chat';

// ============ Voice & TTS ============
export { useKokoroTTS } from './hooks/voice/useKokoroTTS';
export { useTextToSpeech } from './hooks/voice/useTextToVoice';
export { default as VoiceSettingsPanel } from './components/VoiceSettings/VoiceSettingsPanel';
export { default as KokoroVoiceSelector } from './components/VoiceSettings/KokoroVoiceSelector';

// ============ App Shell (chat-only) ============
// The QwkSearch general app minus the REASON editor: providers, dock, cookie
// banner, view switch, chat tabs. The editor-bearing counterparts live behind
// the `research-agent-ui/workspace` entry, which never gets pulled in here.
export * from './app';

// ============ Utilities ============
export { cn, formatTimeDifference, formatMessageTime } from './lib/utils';
