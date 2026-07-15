# research-agent-ui

Chat research agent UI: conversation window, article reader, search config,
file uploads, and chat history for QwkSearch-style apps. Includes the shadcn
primitives and icons the components depend on, so it can be dropped into a
Next.js app with a single dependency.

![img1](https://i.imgur.com/UxNJOKy.png)

## Usage

```tsx
import {
  ChatProvider,
  SessionProvider,
  ExtractPanelProvider,
  ChatWindow,
  configureResearchAgentUI,
} from 'research-agent-ui';

configureResearchAgentUI({
  appName: 'MyApp',
  getAutoMediaSearch: () => true,
  // ...see ResearchAgentUIConfig for the full list of overridable values
});

function App() {
  return (
    <SessionProvider authClient={myAuthClient}>
      <ExtractPanelProvider>
        <ChatProvider>
          <ChatWindow />
        </ChatProvider>
      </ExtractPanelProvider>
    </SessionProvider>
  );
}
```

The host app is expected to implement the following API routes, which the
chat and article-reader components call directly: `POST /api/agent/chat`,
`POST /api/agent/suggestions`, `GET /api/agent/providers`,
`GET /api/agent/chats/:id`, `GET /doc/article`, `GET /doc/favorites`.

## Configuration

`configureResearchAgentUI` overrides app-specific values (branding strings,
the Google API key used by the Drive picker, and the auto-media-search
toggle) that would otherwise couple this package to a specific app. See
`ResearchAgentUIConfig` in `src/config.ts` for the full list.
