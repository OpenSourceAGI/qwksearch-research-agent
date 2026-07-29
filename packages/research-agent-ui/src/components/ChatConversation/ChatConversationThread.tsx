/**
 * @fileoverview Main chat conversation thread: renders ordered message sections, a floating share/export toolbar (Markdown, PDF, DOCX, Google Docs, QwkDocs, copy link), the history dropdown, new-chat button, the sticky ChatInputBox, and the global ArticleExtractPanel.
 *
 * Adjusts layout when the side panel is open.
 */
'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import MessageBox from './ChatMessageBubble';
import QuantumWaveOrbital from 'quantum-sphere-loading-icon/react';

import { useChat } from '../../hooks/useChat';
import { useExtractPanel } from '../ArticleReader/ExtractPanelContext';
import ChatInputBox from '../MessageComposer/ChatInputBox';
import ArticleExtractPanel from '../ArticleReader/ArticleExtractPanel';
import { researchAgentUIConfig } from '../../config';
import HistoryDropdown from '../ChatHistoryDropdown';
import { useSession } from '../../hooks/useSession';

/**
 * Main chat conversation thread component.
 * Renders the sequence of message sections, the floating toolbar, and the input bar.
 * Handles automatic scrolling to the bottom on new messages and manages
 * window resize events for layout adjustments.
 *
 * @returns {JSX.Element} The rendered chat thread
 */
const Chat = () => {
  const { sections, chatTurns, loading, messageAppeared, newChat, chatId } = useChat();
  const { isOpen: isPanelOpen, panelWidth } = useExtractPanel();
  const { isAuthenticated } = useSession();

  const [isDesktop, setIsDesktop] = useState(false);
  const dividerRef = useRef<HTMLDivElement | null>(null);
  const messageEnd = useRef<HTMLDivElement | null>(null);
  const isAutoScrollingRef = useRef(false);

  // Track window width for desktop/mobile layout (1024px matches Tailwind lg: breakpoint)
  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  useEffect(() => {
    if (chatTurns.length === 1) {
      document.title = `${chatTurns[0].content.substring(0, 30)} - ${researchAgentUIConfig.appName}`;
    }

    // New user message — always scroll to bottom
    if (chatTurns[chatTurns.length - 1]?.role === 'user') {
      isAutoScrollingRef.current = true;
      messageEnd.current?.scrollIntoView({ behavior: 'auto' });
      // Reset flag after scroll completes
      setTimeout(() => {
        isAutoScrollingRef.current = false;
      }, 100);
      return;
    }

  }, [chatTurns]);

  // Calculate container width based on panel state
  const containerStyle = isDesktop && isPanelOpen
    ? { width: `calc(100% - ${panelWidth}px)` }
    : {};

  return (
    <>

      <div
        className="flex flex-col min-h-full transition-all duration-300"
        style={containerStyle}
      >
        {/* Messages area - grows to fill available space */}
        <div
          className={`flex-1 flex flex-col space-y-3 pb-48 ${isDesktop && !isPanelOpen ? 'px-0 max-w-[800px] mx-auto w-full' : 'px-4 lg:px-8'
            }`}
        >
          {sections.map((section, i) => {
            const isLast = i === sections.length - 1;

            return (
              <Fragment key={section.userMessage.messageId}>
                <MessageBox
                  section={section}
                  sectionIndex={i}
                  dividerRef={isLast ? dividerRef : undefined}
                  isLast={isLast}
                />
                {!isLast && (
                  <div className="h-px w-full bg-light-secondary dark:bg-dark-secondary" />
                )}
              </Fragment>
            );
          })}
          {loading && !messageAppeared && (
            <div className="flex items-center justify-center">

              <div style={{ height: '200px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <QuantumWaveOrbital
                  autoRandomize={true}
                  onSphereClick={() => console.log('Sphere clicked')}
                  className="my-custom-class"
                />
              </div>
            </div>
          )}
          <div ref={messageEnd} className="h-0" />
        </div>

        {/* Input box - sticky at bottom */}
        <div className="sticky bottom-[60px] md:bottom-0 z-40 bg-gradient-to-t from-background via-background to-transparent pt-4 pb-2">
          <ChatInputBox />
        </div>
      </div>

      {/* Global Article Extract Panel - single instance */}
      <ArticleExtractPanel />
    </>
  );
};

export default Chat;
