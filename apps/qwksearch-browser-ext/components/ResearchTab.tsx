import { useState } from 'react';
import {
  SessionProvider,
  ExtractPanelProvider,
  ChatProvider,
  ChatWindow,
  useChat,
} from 'research-agent-ui';
import type { ResearchAgentAuthClient } from 'research-agent-ui';
import { FileText, MessageSquareText } from 'lucide-react';
import { Button } from './ui/button';
import { formatOpenTabsMessage, isContextableTab } from '@/lib/open-tabs-context';
import extractTabContent from '@/lib/extract-tab-content';

// Minimal no-op auth client — the extension runs without a backend auth session.
const noopAuthClient: ResearchAgentAuthClient = {
  getSession: async () => ({ data: null }),
  oneTap: () => {},
  signIn: { social: () => {} },
  signOut: async () => {},
};

function OpenTabsContextButton() {
  const { sendMessage, loading } = useChat();

  const handleClick = () => {
    chrome.tabs.query({ currentWindow: true }, (tabs) => {
      const message = formatOpenTabsMessage(tabs);
      if (message) sendMessage(message);
    });
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="m-2 self-start"
      disabled={loading}
      onClick={handleClick}
    >
      <MessageSquareText size={14} className="mr-1" />
      Chat about my open tabs
    </Button>
  );
}

function OpenTabsContentButton() {
  const { sendMessage, loading } = useChat();
  const [extracting, setExtracting] = useState(false);

  const handleClick = () => {
    setExtracting(true);
    chrome.tabs.query({ currentWindow: true }, async (tabs) => {
      const contextable = tabs.filter(isContextableTab);
      const withContent = await Promise.all(
        contextable.map(async (tab) => ({
          title: tab.title,
          url: tab.url,
          content: await extractTabContent(tab.id!),
        }))
      );
      setExtracting(false);
      const message = formatOpenTabsMessage(withContent);
      if (message) sendMessage(message);
    });
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="m-2 self-start"
      disabled={loading || extracting}
      onClick={handleClick}
    >
      <FileText size={14} className="mr-1" />
      Chat with my tabs' page content
    </Button>
  );
}

export default function ResearchTab() {
  return (
    <div className="h-full overflow-auto">
      <SessionProvider authClient={noopAuthClient}>
        <ExtractPanelProvider>
          <ChatProvider>
            <OpenTabsContextButton />
            <OpenTabsContentButton />
            <ChatWindow />
          </ChatProvider>
        </ExtractPanelProvider>
      </SessionProvider>
    </div>
  );
}
