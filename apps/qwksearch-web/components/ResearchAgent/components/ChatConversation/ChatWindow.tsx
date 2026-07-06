/**
 * Top-level chat window that switches between ChatHomepage and the active thread, handles error/loading/404 states,
 * and defines all shared message type interfaces (UserMessage, AssistantMessage, SourceMessage, SearchingMessage).
 */
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Document } from 'ai-research-agent/search/document';
import Chat from './ChatConversationThread';
import ChatHomepage from './ChatHomepage';
import { useChat } from '@/components/ResearchAgent/hooks/useChat';
import { useSession } from '@/components/ResearchAgent/hooks/useSession';
import Loader from '@/components/ui/Loader';
import SettingsButtonMobile from '@/components/Settings/SettingsButtonMobile';
import ConfigError from '../ConfigError';

/**
 * Base interface for all chat message types.
 */
export interface BaseMessage {
  /** ID of the chat session this message belongs to */
  chatId: string;
  /** Unique identifier for the message */
  messageId: string;
  /** Timestamp when the message was created */
  createdAt: Date;
}

/**
 * Represents a message sent by the AI assistant.
 */
export interface AssistantMessage extends BaseMessage {
  role: 'assistant';
  /** The text content of the assistant message */
  content: string;
  /** Optional follow-up suggestions */
  suggestions?: string[];
}

/**
 * Represents a message sent by the user.
 */
export interface UserMessage extends BaseMessage {
  role: 'user';
  /** The text content of the user message */
  content: string;
}

/**
 * Represents a message containing search sources or citations.
 */
export interface SourceMessage extends BaseMessage {
  role: 'source';
  /** Array of documentation sources found during research */
  sources: Document[];
}

export interface SuggestionMessage extends BaseMessage {
  role: 'suggestion';
  suggestions: string[];
}

export interface SearchQuery {
  query: string;
  /** Display label e.g. "Web", "Academic" */
  category?: string;
  status: 'running' | 'done';
}

/** Transient progress message emitted while the agent runs searches. */
export interface SearchingMessage extends BaseMessage {
  role: 'searching';
  queries: SearchQuery[];
}

/**
 * Union type representing all possible message roles in a chat.
 */
export type Message =
  | AssistantMessage
  | UserMessage
  | SourceMessage
  | SuggestionMessage
  | SearchingMessage;

/**
 * Represents a single exchange in the chat (user + assistant).
 */
export type ChatTurn = UserMessage | AssistantMessage;

export interface File {
  fileName: string;
  fileExtension: string;
  fileId: string;
}

/**
 * Main window component for the chat interface.
 * Ordinates the overall chat flow, handling errors, loading states,
 * and switching between the homepage and the active conversation thread.
 * 
 * @returns {JSX.Element} The rendered chat window
 */
const ChatWindow = () => {
  const router = useRouter();
  const { hasError, isReady, notFound, messages } = useChat();
  const { isAuthenticated } = useSession();

  // Redirect guests to homepage if chat not found (e.g., localStorage cleared)
  useEffect(() => {
    if (isReady && notFound && !isAuthenticated) {
      router.replace('/');
    }
  }, [isReady, notFound, isAuthenticated, router]);

  if (hasError) {
    return <ConfigError />;
  }

  // Show loader while redirecting guests
  if (isReady && notFound && !isAuthenticated) {
    return (
      <div className="flex flex-row items-center justify-center min-h-screen">
        <Loader />
      </div>
    );
  }

  return isReady ? (
    notFound ? (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-sm text-black/70 dark:text-white/70">This chat could not be found.</p>
        <button
          type="button"
          onClick={() => router.push('/')}
          className="rounded-md border border-black/15 px-3 py-1.5 text-sm hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
        >
          Go Home
        </button>
      </div>
    ) : (
      <div>
        {messages.length > 0 ? (
          <>
            {/* <Navbar /> */}
            <Chat />
          </>
        ) : (
          <ChatHomepage />
        )}
      </div>
    )
  ) : (
    <div className="flex flex-row items-center justify-center min-h-screen">
      <Loader />
    </div>
  );
};

export default ChatWindow;
