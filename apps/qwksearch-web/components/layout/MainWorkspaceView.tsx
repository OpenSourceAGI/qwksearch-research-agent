'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChatInputBox, ChatWindow, configureResearchAgentUI, useChat } from 'research-agent-ui';
import { ReasonDocs } from 'react-reason-editor/reason-docs';
import { themeActions } from 'react-reason-editor/theme';
import { localeActions } from 'react-reason-editor/locale-bundle';
import { useMainView } from '@/components/layout/MainViewProvider';
import { useChatTabs } from '@/components/layout/useChatTabs';
import { getPageTips, htmlToPlainText } from '@/lib/reason-docs/page-tips';
import { getTopicSearches } from '@/lib/reason-docs/topic-searches';

import 'katex/dist/katex.min.css';
import 'easydrawer/styles.css';
import 'katex/contrib/mhchem';

export function MainWorkspaceView() {
  const { activeView, toggleToDocs, toggleToResearch, filesSidebarRequestId } = useMainView();
  const { chatTabs, activeChatId, openChat, newChat, closeChat } = useChatTabs();
  const { sendMessage } = useChat();
  const searchParams = useSearchParams();
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [initialDocId, setInitialDocId] = useState<string | null>(null);
  const [hasRestoredFromUrl, setHasRestoredFromUrl] = useState(false);
  const [pendingTopicQuery, setPendingTopicQuery] = useState<string | null>(null);

  useEffect(() => {
    localeActions.setLang('en');
    themeActions.setColor('default');
  }, []);

  // Restore whichever tab (a chat or a REASON document) was active from the
  // URL's `chat`/`docs` params on first load — the workspace itself never
  // navigates away from `/`, so this is the only way a shared/bookmarked
  // link reopens the right tab. Runs once; afterwards the effect below owns
  // keeping the URL in sync with the live tab state.
  const restoredFromUrlRef = useRef(false);
  useEffect(() => {
    if (restoredFromUrlRef.current) return;
    restoredFromUrlRef.current = true;
    const docsParam = searchParams.get('docs');
    const chatParam = searchParams.get('chat');
    if (docsParam) {
      setInitialDocId(docsParam);
      toggleToDocs();
    } else if (chatParam) {
      openChat(chatParam);
      toggleToResearch();
    }
    setHasRestoredFromUrl(true);
    // Runs once on mount only — later param changes come from our own sync below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mirror the active chat/doc tab into `?chat=&docs=` without a Next.js
  // route transition: chats and REASON docs are tabs within this one
  // workspace route, not separate pages, so the URL only needs to record
  // which tab is active for sharing/reload — not drive navigation. Waits for
  // the restore effect above so it doesn't clobber the incoming URL with
  // blanks before the restored tab's state has landed.
  useEffect(() => {
    if (typeof window === 'undefined' || !hasRestoredFromUrl) return;
    const url = new URL(window.location.href);
    url.searchParams.set('chat', activeView === 'research' ? activeChatId ?? '' : '');
    url.searchParams.set('docs', activeView === 'docs' ? activeDocId ?? '' : '');
    const nextRelative = `${url.pathname}?${url.searchParams.toString()}${url.hash}`;
    const currentRelative = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (nextRelative !== currentRelative) {
      window.history.replaceState(null, '', nextRelative);
    }
  }, [activeView, activeChatId, activeDocId, hasRestoredFromUrl]);

  const extraTabs = chatTabs.map((tab) => ({ id: tab.id, title: tab.title, kind: 'chat' as const }));

  const handleExtraTabSelect = (id: string) => {
    openChat(id);
    toggleToResearch();
  };

  const handleExtraTabClose = (id: string) => {
    const { closedWasActive, nextActiveId } = closeChat(id);
    if (closedWasActive && !nextActiveId) toggleToDocs();
  };

  const handleExtraTabAdd = () => {
    newChat();
    toggleToResearch();
  };

  // Let chat-history links (research-agent-ui's history dropdown, recent
  // chips, etc.) open a chat as a workspace tab in place instead of
  // navigating to the `/c/<chatId>` route.
  const handleOpenChat = useCallback((id: string) => {
    openChat(id);
    toggleToResearch();
    return true;
  }, [openChat, toggleToResearch]);

  useEffect(() => {
    configureResearchAgentUI({ onOpenChat: handleOpenChat });
    return () => configureResearchAgentUI({ onOpenChat: undefined });
  }, [handleOpenChat]);

  const handleGenerateTips = async (title: string, contentHtml: string) => {
    return getPageTips(title, htmlToPlainText(contentHtml));
  };

  const handleGenerateTopics = async (title: string, contentHtml: string) => {
    return getTopicSearches(title, htmlToPlainText(contentHtml));
  };

  // Opens a new chat tab for the clicked topic, then sends it as that
  // chat's first message once the tab becomes active. `sendMessage` reads
  // the currently active chat ID from context, so it can't run in the same
  // synchronous handler as `newChat()` without racing against the still-stale
  // previous chat ID — this effect waits for `activeChatId` to actually
  // reflect the new chat before sending.
  const handleSearchTopic = useCallback((topic: string) => {
    newChat();
    toggleToResearch();
    setPendingTopicQuery(topic);
  }, [newChat, toggleToResearch]);

  useEffect(() => {
    if (!pendingTopicQuery || !activeChatId) return;
    sendMessage(pendingTopicQuery);
    setPendingTopicQuery(null);
  }, [pendingTopicQuery, activeChatId, sendMessage]);

  const extraTabProps = {
    extraTabs,
    activeExtraTabId: activeView === 'research' ? activeChatId ?? undefined : undefined,
    onExtraTabSelect: handleExtraTabSelect,
    onExtraTabClose: handleExtraTabClose,
    onExtraTabAdd: handleExtraTabAdd,
    onFileTabSelect: toggleToDocs,
    initialDocId,
    onActiveDocumentChange: setActiveDocId,
    onGenerateTips: handleGenerateTips,
    onGenerateTopics: handleGenerateTopics,
    onSearchTopic: handleSearchTopic,
  };

  return activeView === 'docs' ? (
    <ReasonDocs
      belowMainContent={<ChatInputBox />}
      openFilesSidebarSignal={filesSidebarRequestId}
      {...extraTabProps}
    />
  ) : (
    <ReasonDocs
      mainContent={<ChatWindow />}
      openFilesSidebarSignal={filesSidebarRequestId}
      {...extraTabProps}
    />
  );
}
