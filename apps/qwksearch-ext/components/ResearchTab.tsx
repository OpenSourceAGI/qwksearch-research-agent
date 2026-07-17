import {
  SessionProvider,
  ExtractPanelProvider,
  ChatProvider,
  ChatWindow,
} from 'research-agent-ui';
import type { ResearchAgentAuthClient } from 'research-agent-ui';

// Minimal no-op auth client — the extension runs without a backend auth session.
const noopAuthClient: ResearchAgentAuthClient = {
  getSession: async () => ({ data: null }),
  oneTap: () => {},
  signIn: { social: () => {} },
  signOut: async () => {},
};

export default function ResearchTab() {
  return (
    <div className="h-full overflow-auto">
      <SessionProvider authClient={noopAuthClient}>
        <ExtractPanelProvider>
          <ChatProvider>
            <ChatWindow />
          </ChatProvider>
        </ExtractPanelProvider>
      </SessionProvider>
    </div>
  );
}
