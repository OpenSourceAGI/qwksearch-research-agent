/**
 * Main chat conversation thread: renders ordered message sections, a floating share/export toolbar
 * (Markdown, PDF, DOCX, Google Docs, QwkDocs, copy link), the history dropdown, new-chat button,
 * the sticky ChatInputBox, and the global ArticleExtractPanel. Adjusts layout when the side panel is open.
 */
'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import { Share2, Link, FileText, FileType, FileDown, FileSpreadsheet, SquarePen, BookMarked } from 'lucide-react';
import { toast } from 'sonner';
import MessageBox from './ChatMessageBubble';
import QuantumWaveOrbital from 'quantum-sphere-loading-icon/react';

import { useChat } from '../../hooks/useChat';
import { useExtractPanel } from '../ArticleReader/ExtractPanelContext';
import ChatInputBox from '../MessageComposer/ChatInputBox';
import ArticleExtractPanel from '../ArticleReader/ArticleExtractPanel';
import grab from 'grab-url';
import { APP_NAME } from "@/lib/config/site";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { exportAsMarkdown, exportAsDocx, exportAsPdf, exportToGoogleDocs } from '@/lib/documents/export';
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
      document.title = `${chatTurns[0].content.substring(0, 30)} - ${APP_NAME}`;
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
      {/* Floating toolbar - always visible, outside the panel-shifted container */}
      <div
        className="fixed top-0 z-50 flex items-center gap-1 px-4 py-3 transition-all duration-300"
        style={{ right: isDesktop && isPanelOpen ? `${panelWidth}px` : '0' }}
      >
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <button className="p-2 text-muted-foreground rounded-xl hover:bg-secondary transition duration-200 hover:text-foreground">
                  <Share2 size={18} />
                </button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom">Share</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel className="text-xs text-muted-foreground">Share & Export</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={async () => {
                if (!chatId) {
                  toast.error('No chat to share');
                  return;
                }

                // Check if user is authenticated
                if (!isAuthenticated) {
                  toast.error('Please sign in to share chats');
                  return;
                }

                try {
                  // Make the chat public and get the shareable URL
                  const response = await grab('agent/chats/share', {
                    method: 'POST',
                    body: { chatId },
                  });

                  if (response.success && response.data?.shareUrl) {
                    await navigator.clipboard.writeText(response.data.shareUrl);
                    toast.success('Chat is now public - link copied to clipboard');
                  } else {
                    throw new Error(response.error || 'Failed to share chat');
                  }
                } catch (err) {
                  console.error('Error sharing chat:', err);
                  const errorMsg = err instanceof Error ? err.message : 'Failed to share chat';
                  toast.error(errorMsg);
                }
              }}
            >
              <Link size={16} />
              Copy link
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={async () => {
                const title = sections[0]?.userMessage?.content || 'Chat';
                const content = sections.map(s =>
                  `## ${s.userMessage.content}\n\n${s.assistantMessage?.content || ''}`
                ).join('\n\n---\n\n');
                try {
                  await grab('doc/documents', {
                    method: 'POST',
                    body: {
                      title,
                      name: title,
                      content,
                      metadata: { source: 'chat', chatId: window.location.pathname },
                    },
                  });
                  toast.success('Saved to QwkDocs');
                } catch {
                  toast.error('Failed to save to QwkDocs');
                }
              }}
            >
              <BookMarked size={16} />
              Save to QwkDocs
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                const title = sections[0]?.userMessage?.content || 'Chat';
                const html = sections.map(s =>
                  `<h2>${s.userMessage.content}</h2>${s.assistantMessage?.content || ''}`
                ).join('\n');
                exportAsMarkdown(title, html);
              }}
            >
              <FileText size={16} />
              Export as Markdown
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                const title = sections[0]?.userMessage?.content || 'Chat';
                const html = sections.map(s =>
                  `<h2>${s.userMessage.content}</h2>${s.assistantMessage?.content || ''}`
                ).join('\n');
                exportAsPdf(title, html);
              }}
            >
              <FileType size={16} />
              Export as PDF
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                const title = sections[0]?.userMessage?.content || 'Chat';
                const html = sections.map(s =>
                  `<h2>${s.userMessage.content}</h2>${s.assistantMessage?.content || ''}`
                ).join('\n');
                exportAsDocx(title, html);
              }}
            >
              <FileDown size={16} />
              Export as DOCX
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                const title = sections[0]?.userMessage?.content || 'Chat';
                const html = sections.map(s =>
                  `<h2>${s.userMessage.content}</h2>${s.assistantMessage?.content || ''}`
                ).join('\n');
                exportToGoogleDocs(title, html);
              }}
            >
              <FileSpreadsheet size={16} />
              Export to Google Docs
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <HistoryDropdown />

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={newChat}
              className="p-2 text-muted-foreground rounded-xl hover:bg-secondary transition duration-200 hover:text-foreground"
            >
              <SquarePen size={18} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">New chat</TooltipContent>
        </Tooltip>
      </div>

      <div
        className="flex flex-col min-h-full transition-all duration-300"
        style={containerStyle}
      >
        {/* Messages area - grows to fill available space */}
        <div
          className={`flex-1 flex flex-col space-y-6 pb-48 ${isDesktop && !isPanelOpen ? 'px-0 max-w-[800px] mx-auto w-full' : 'px-4 lg:px-8'
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
