<p align="center">
<br /> 
    <a href="https://www.npmjs.com/package/research-agent-ui"><img src="https://img.shields.io/npm/dm/research-agent-ui.svg" alt="NPM Monthly Downloads"></a>
    <a href="https://www.npmjs.com/package/research-agent-ui"><img src="https://img.shields.io/npm/v/research-agent-ui.svg" alt="npm version"></a>
    <a href="https://discord.gg/SJdBqBz3tV">
        <img src="https://img.shields.io/discord/1110227955554209923.svg?label=Chat&logo=Discord&colorB=7289da&style=flat"
            alt="Join Discord" />
    </a>  
     <a href="https://github.com/vtempest/qwksearch-research-agent/discussions">
     <img alt="GitHub Stars" src="https://img.shields.io/github/stars/vtempest/qwksearch-research-agent" /></a>
<br />
    <a href="https://github.com/vtempest/qwksearch-research-agent/discussions">
    <img alt="GitHub Discussions"
        src="https://img.shields.io/github/discussions/vtempest/qwksearch-research-agent" />
    </a>
    <a href="https://github.com/vtempest/qwksearch-research-agent/pulse" alt="Activity">
        <img src="https://img.shields.io/github/commit-activity/m/vtempest/qwksearch-research-agent" />
    </a>
    <img src="https://img.shields.io/github/last-commit/vtempest/qwksearch-research-agent.svg" alt="GitHub last commit" />
<br />
    <a href="https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request">
        <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg"
            alt="PRs Welcome" />
    </a>
    <a href="https://codespaces.new/vtempest/qwksearch-research-agent">
    <img src="https://github.com/codespaces/badge.svg" width="150" height="20" />
    </a>
</p>

# research-agent-ui

<a href="https://www.npmjs.com/package/research-agent-ui"><img src="https://img.shields.io/npm/dm/research-agent-ui.svg" alt="NPM Monthly Downloads"></a>
<a href="https://www.npmjs.com/package/research-agent-ui"><img src="https://img.shields.io/npm/v/research-agent-ui.svg" alt="npm version"></a>

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

## API Routes (`research-agent-ui/api`)

All 25 Next.js route handlers are exported from the `research-agent-ui/api`
subpath as factory functions. Each factory accepts a **deps** object that
injects your app's database, auth helpers, and other services, so the same
handler logic works in any Next.js project without hard-coding any imports.

### How it works

The route logic lives in `packages/research-agent-ui/src/api/handlers/`.
Your app's `app/api/agent/*/route.ts` files become thin wrappers that call
the factory and re-export the HTTP method handlers.

### Step 1 — install / workspace link

If you are in this monorepo, `research-agent-ui` is already linked via the
`workspace:*` protocol. For an external project, install the published
package:

```bash
npm install research-agent-ui
# or
bun add research-agent-ui
```

### Step 2 — create your route files

For each API path, create a `route.ts` that calls the matching factory and
passes in your app's dependencies. Every factory is named
`create<RouteName>Handler` and is exported from `research-agent-ui/api`.

#### Example: `app/api/agent/chats/route.ts`

```ts
import { createChatsHandler } from "research-agent-ui/api";
import { getDB } from "@/lib/database";
import { chats, messages } from "@/lib/database/schema";
import { requireUserId } from "@/lib/auth/session";

const handler = createChatsHandler({
  getDB,
  requireUserId,
  schema: { chats, messages },
});
export const { GET, DELETE } = handler;
```

#### Example: `app/api/agent/article-followups/route.ts`

```ts
import { createArticleFollowupsHandler } from "research-agent-ui/api";
import { getUserId } from "@/lib/auth/session";
import { getDB } from "@/lib/database";
import { user as userSchema } from "@/lib/database/schema";
import { getEnv } from "@/lib/env";

export const POST = createArticleFollowupsHandler({
  getUserId,
  requireUserId: async () => {
    const id = await getUserId();
    if (!id) throw new Error("Unauthorized");
    return id;
  },
  getDB,
  userSchema,
  getEnv,
});
```

### All available factories and their dep shapes

| Factory | File | Required deps |
|---|---|---|
| `createArticleFollowupsHandler` | `article-followups` | `getUserId`, `requireUserId`, `getDB`, `userSchema`, `getEnv` |
| `createArticleQAHandler` | `article-qa` | `getUserId`, `requireUserId`, `getDB`, `userSchema`, `getEnv` |
| `createChatsHandler` | `chats` | `getDB`, `requireUserId`, `schema.chats`, `schema.messages` |
| `createChatByIdHandler` | `chats/[id]` | `getDB`, `requireUserId`, `schema.chats`, `schema.messages` |
| `createChatsSearchHandler` | `chats/search` | `getDB`, `requireUserId`, `schema.chats`, `schema.messages` |
| `createChatsShareHandler` | `chats/share` | `getDB`, `requireUserId`, `schema.chats`, `schema.messages` |
| `createMessagesHandler` | `messages` | `getDB`, `requireUserId`, `messagesSchema` |
| `createProvidersHandler` | `providers` | `getSession` |
| `createProviderByIdHandler` | `providers/[id]` | _(none)_ |
| `createProviderModelsHandler` | `providers/[id]/models` | _(none)_ |
| `createMCPServersHandler` | `mcpservers` | `configManager`, `getConfiguredMCPServers` |
| `createMCPServerByIdHandler` | `mcpservers/[id]` | `configManager`, `getConfiguredMCPServers` |
| `createMCPServerToggleHandler` | `mcpservers/[id]/toggle` | `configManager`, `getConfiguredMCPServers` |
| `createSearchHandler` | `search` | `searxngDomain?` (default: `https://search.qwksearch.com`) |
| `createDiscoverHandler` | `discover` | _(none)_ |
| `createAutocompleteHandler` | `autocomplete` | _(none)_ |
| `createSuggestionsHandler` | `suggestions` | _(none)_ |
| `createAgentsHandler` | `agents` | `getUserId`, `requireUserId`, `getDB`, `userSchema`, `getEnv` |
| `createRewriteHandler` | `rewrite` | `getEnv`, `generateText`, `createGroq` |
| `createVoiceHandler` | `voice` | `getUserId`, `checkTTSRateLimit`, `generateSpeech` |
| `createTranscriptHandler` | `transcript` | `getCloudflareContext` |
| `createTestModelsHandler` | `test-models` | _(none)_ |
| `createValidateOpenRouterHandler` | `validate-openrouter` | `validateOpenRouterModels` |

### Dep type definitions

All dep interfaces are exported from `research-agent-ui/api`:

```ts
import type {
  ArticleDeps,
  ChatsDeps,
  MessagesDeps,
  ProvidersDeps,
  MCPServersDeps,
  SearchDeps,
  VoiceDeps,
  TranscriptDeps,
  RewriteDeps,
  ValidateOpenRouterDeps,
  AgentsDeps,
} from "research-agent-ui/api";
```

### The chat route

`POST /api/agent/chat` is not migrated into this package because it delegates
to a full `handleChatRequest` orchestrator that is app-specific (streaming,
search integration, database writes). Keep it directly in your app:

```ts
// app/api/agent/chat/route.ts
import { handleChatRequest } from "@/lib/chat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const POST = handleChatRequest;
```

## Configuration

`configureResearchAgentUI` overrides app-specific values (branding strings,
the Google API key used by the Drive picker, and the auto-media-search
toggle) that would otherwise couple this package to a specific app. See
`ResearchAgentUIConfig` in `src/config.ts` for the full list.
