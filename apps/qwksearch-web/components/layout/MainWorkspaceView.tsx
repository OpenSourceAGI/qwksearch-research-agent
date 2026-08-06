'use client';

import { useEffect } from 'react';
import { ChatInputBox, ChatWindow } from 'research-agent-ui';
import { ReasonDocs } from 'react-reason-editor/reason-docs';
import { themeActions } from 'react-reason-editor/theme';
import { localeActions } from 'react-reason-editor/locale-bundle';
import { useMainView } from '@/components/layout/MainViewProvider';
import { useChatTabs } from '@/components/layout/useChatTabs';

import 'react-reason-editor/style.css';
import 'katex/dist/katex.min.css';
import 'easydrawer/styles.css';
import 'katex/contrib/mhchem';

export function MainWorkspaceView() {
  const { activeView, toggleToDocs, toggleToResearch, filesSidebarRequestId } = useMainView();
  const { chatTabs, activeChatId, openChat, newChat, closeChat } = useChatTabs();

  useEffect(() => {
    localeActions.setLang('en');
    themeActions.setColor('default');
  }, []);

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

  const extraTabProps = {
    extraTabs,
    activeExtraTabId: activeView === 'research' ? activeChatId ?? undefined : undefined,
    onExtraTabSelect: handleExtraTabSelect,
    onExtraTabClose: handleExtraTabClose,
    onExtraTabAdd: handleExtraTabAdd,
    onFileTabSelect: toggleToDocs,
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
