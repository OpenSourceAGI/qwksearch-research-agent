import { useState } from 'react';
import {
  configureResearchAgentUI,
  SessionProvider,
  ExtractPanelProvider,
  ChatProvider,
  ChatWindow,
  useChat,
} from 'research-agent-ui';
import { FileText, MessageSquareText } from 'lucide-react';
import { Button } from './ui/button';
import { formatOpenTabsMessage, isContextableTab } from '@/lib/open-tabs-context';
import extractTabContent from '@/lib/extract-tab-content';
import { extensionAuthClient } from '@/lib/qwksearch-auth';
import { API_BASE } from '@/lib/grab-url-shim';

// These are fetched directly rather than through grab(), so a relative default
// would resolve against the extension's own origin.
configureResearchAgentUI({
  appIconUrl: '/images/qwksearch-mark.png',
  trendingNewsApiUrl: `${API_BASE}/api/news/trending`,
  trendingNewsSettingsUrl: `${API_BASE}/api/news/settings`,
});

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
      className="h-8"
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
      className="h-8"
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
    <div className="flex h-full flex-col">
      <SessionProvider authClient={extensionAuthClient} enableGoogleOneTap={false}>
        <ExtractPanelProvider>
          <ChatProvider>
            {/* Outside the chat's scroll area: the chat is at least a screen tall
                and scrolls to its input, which would push these out of view. */}
            <div className="flex shrink-0 flex-wrap gap-1 pb-1">
              <OpenTabsContextButton />
              <OpenTabsContentButton />
            </div>
            <div className="min-h-0 flex-1 overflow-auto">
              <ChatWindow />
            </div>
          </ChatProvider>
        </ExtractPanelProvider>
      </SessionProvider>
    </div>
  );
}
