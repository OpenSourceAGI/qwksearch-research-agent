'use client';

import { useEffect } from 'react';
import { ChatWindow } from 'research-agent-ui';
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
  const { activeView, setActiveView } = useMainView();
  const { chatTabs, activeChatId, openChat, newChat, closeChat } = useChatTabs();

  useEffect(() => {
    localeActions.setLang('en');
    themeActions.setColor('default');
  }, []);

  const extraTabs = chatTabs.map((tab) => ({ id: tab.id, title: tab.title, kind: 'chat' as const }));

  return (
    <ReasonDocs
      mainContent={activeView === 'docs' ? undefined : <ChatWindow />}
      extraTabs={extraTabs}
      activeExtraTabId={activeView === 'research' ? activeChatId : null}
      onExtraTabSelect={(id) => {
        openChat(id);
        setActiveView('research');
      }}
      onExtraTabClose={(id) => {
        const { closedWasActive, nextActiveId } = closeChat(id);
        if (closedWasActive && !nextActiveId) {
          setActiveView('docs');
        }
      }}
      onExtraTabAdd={() => {
        newChat();
        setActiveView('research');
      }}
      onFileTabSelect={() => setActiveView('docs')}
    />
  );
}
