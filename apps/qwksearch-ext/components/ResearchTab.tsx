import {
  SessionProvider,
  ExtractPanelProvider,
  ChatProvider,
  ChatWindow,
  useChat,
} from 'research-agent-ui';
import type { ResearchAgentAuthClient } from 'research-agent-ui';
import { MessageSquareText } from 'lucide-react';
import { Button } from './ui/button';
import { formatOpenTabsMessage } from '@/lib/open-tabs-context';

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

export default function ResearchTab() {
  return (
    <div className="h-full overflow-auto">
      <SessionProvider authClient={noopAuthClient}>
        <ExtractPanelProvider>
          <ChatProvider>
            <OpenTabsContextButton />
            <ChatWindow />
          </ChatProvider>
        </ExtractPanelProvider>
      </SessionProvider>
    </div>
  );
}
