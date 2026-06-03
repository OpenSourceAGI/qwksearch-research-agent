/**
 * Renders a single conversation turn (user message + AI response) with expand/collapse, inline editing,
 * search progress, source citations, markdown rendering, text-to-speech, and follow-up suggestions.
 */
'use client';

import React, { Ref, useState } from 'react';
import { cn } from '@/lib/utils';
import Markdown, { MarkdownToJSX } from 'markdown-to-jsx';
import MessageSources from '../SearchResults/MessageSources';
import SearchProgressIndicator from '../SearchResults/SearchProgressIndicator';
import { useTextToSpeech } from '@/components/ResearchAgent/hooks/voice/useTextToVoice';
import { useChat, Section } from '@/components/ResearchAgent/hooks/useChat';
import Citation from '../SearchResults/WebCitationBadge';

// Sub-components
import ThinkTagProcessor from './MessageBubble/ThinkTagProcessor';
import UserMessageHeader from './MessageBubble/UserMessageHeader';
import AssistantMessageActions from './MessageBubble/AssistantMessageActions';
import FollowUpSuggestions from './MessageBubble/FollowUpSuggestions';

/**
 * Component that renders a single chat section (user message + assistant response).
 * Handles message expansion, editing, copying, text-to-speech, and exports.
 * 
 * @param section - The chat section data
 * @param sectionIndex - The index of this section in the conversation
 * @param dividerRef - Optional ref for the divider element
 * @param isLast - Whether this is the last message in the thread
 * @returns {JSX.Element} The rendered message bubble
 */
const MessageBox = ({
  section,
  dividerRef,
  isLast,
}: {
  section: Section;
  sectionIndex: number;
  dividerRef?: Ref<HTMLDivElement>;
  isLast: boolean;
}) => {
  const { loading, sendMessage } = useChat();
  const [isExpanded, setIsExpanded] = useState(true);
  const [copiedUserMsg, setCopiedUserMsg] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(section.userMessage.content);

  /**
   * Copies the user's original message text to the clipboard.
   */
  const handleCopyUserMsg = () => {
    navigator.clipboard.writeText(section.userMessage.content);
    setCopiedUserMsg(true);
    setTimeout(() => setCopiedUserMsg(false), 1500);
  };

  /**
   * Submits the edited user message and restarts the conversation from that point.
   */
  const handleEditSubmit = () => {
    if (editText.trim()) {
      sendMessage(editText.trim());
      setIsEditing(false);
    }
  };

  const parsedMessage = section.parsedAssistantMessage || '';
  const speechMessage = section.speechMessage || '';
  const thinkingEnded = section.thinkingEnded;

  const { speechStatus, start, stop } = useTextToSpeech(speechMessage, {
    enableInterrupt: true,
  });

  /**
   * Opens the current conversation exchange in an external LLM platform.
   * 
   * @param platform - The target LLM platform (e.g., 'perplexity', 'chatgpt')
   */
  const handleOpenInLLM = (platform: string) => {
    if (!section.assistantMessage) return;

    const question = section.userMessage.content;
    const response = section.assistantMessage.content;
    const fullContent = `${question}\n\n${response}`;

    navigator.clipboard.writeText(fullContent);

    const urls: Record<string, string> = {
      qwksearch: "https://qwksearch.com/?q=",
      claude: "https://claude.ai/new?q=",
      perplexity: "https://www.perplexity.ai/?q=",
      gemini: "https://gemini.google.com/?q=",
      chatgpt: "https://chat.openai.com/?q=",
    };

    const url = urls[platform];
    if (url) {
      window.open(`${url}${encodeURIComponent(fullContent)}`, "_blank");
    }
  };

  const markdownOverrides: MarkdownToJSX.Options = {
    overrides: {
      think: {
        component: ThinkTagProcessor,
        props: {
          thinkingEnded: thinkingEnded,
        },
      },
      citation: {
        component: Citation,
        props: {
          sources: section.sourceMessage?.sources || [],
        },
      },
      table: {
        component: ({ children, ...props }: React.ComponentPropsWithoutRef<'table'>) => (
          <div className="not-prose -mx-2 my-4 max-w-full overflow-x-auto sm:mx-0">
            <table
              {...props}
              className="w-max min-w-full border-collapse text-sm"
            >
              {children}
            </table>
          </div>
        ),
      },
    },
  };

  return (
    <div className="space-y-6">
      <UserMessageHeader
        section={section}
        isExpanded={isExpanded}
        setIsExpanded={setIsExpanded}
        isEditing={isEditing}
        setIsEditing={setIsEditing}
        editText={editText}
        setEditText={setEditText}
        handleEditSubmit={handleEditSubmit}
        copiedUserMsg={copiedUserMsg}
        handleCopyUserMsg={handleCopyUserMsg}
      />

      <div
        className={cn(
          "flex flex-col space-y-6 overflow-hidden transition-all duration-300 ease-in-out",
          isExpanded ? "max-h-[100000px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div
          ref={dividerRef}
          className="flex flex-col space-y-6 w-full"
        >
          {section.searchingMessage && section.searchingMessage.queries.length > 0 && (
            <SearchProgressIndicator
              queries={section.searchingMessage.queries}
              loading={loading && isLast}
            />
          )}

          {section.sourceMessage &&
            section.sourceMessage.sources.length > 0 && (
              <div className="flex flex-col space-y-2">
                {/* <div className="flex flex-row items-center space-x-2">
                  <BookCopy className="text-foreground" size={20} />
                  <h3 className="text-foreground font-medium text-xl">
                    Sources
                  </h3>
                </div> */}
                <MessageSources sources={section.sourceMessage.sources} query={section.userMessage.content} />
              </div>
            )}

          {/* {section.assistantMessage && (
            <div className="flex flex-col lg:flex-row gap-3 w-full">
              <div className="w-full lg:w-1/2">
                <SearchImages
                  query={section.userMessage.content}
                  chatHistory={chatTurns.slice(0, sectionIndex * 2)}
                  messageId={section.assistantMessage.messageId}
                />
              </div>
              <div className="w-full lg:w-1/2">
                <SearchVideos
                  chatHistory={chatTurns.slice(0, sectionIndex * 2)}
                  query={section.userMessage.content}
                  messageId={section.assistantMessage.messageId}
                />
              </div>
            </div>
          )} */}

          <div className="flex min-w-0 flex-col space-y-2">
            {section.assistantMessage && (
              <>
                <Markdown
                  className={cn(
                    'prose prose-lg prose-h1:mb-3 prose-h2:mb-2 prose-h2:mt-6 prose-h2:font-[800] prose-h3:mt-4 prose-h3:mb-1.5 prose-h3:font-[600] dark:prose-invert prose-p:leading-loose prose-pre:p-0 font-[400]',
                    'min-w-0 max-w-none break-words text-foreground font-inter',
                  )}
                  options={markdownOverrides}
                >
                  {parsedMessage}
                </Markdown>

                {loading && isLast ? null : (
                  <AssistantMessageActions
                    section={section}
                    speechStatus={speechStatus}
                    start={start}
                    stop={stop}
                    handleOpenInLLM={handleOpenInLLM}
                  />
                )}

                <FollowUpSuggestions
                  section={section}
                  isLast={isLast}
                  loading={loading}
                  sendMessage={sendMessage}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageBox;
