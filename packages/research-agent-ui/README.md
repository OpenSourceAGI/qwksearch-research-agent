<!-- template-git-repo:badges:start -->
<p align="center">
    <a href="https://qwksearch.com/api/docs"><img src="https://img.shields.io/badge/Docs-blue?logo=ReadTheDocs&logoColor=white" alt="Documentation" /></a>
    <a href="https://stackblitz.com/github/OpenSourceAGI/qwksearch-research-agent/tree/master/packages/research-agent-ui"><img height="20px" src="https://developer.stackblitz.com/img/open_in_stackblitz.svg" alt="Open in StackBlitz" /></a>
    <br />
    <a href="https://www.npmjs.com/package/research-agent-ui"><img src="https://img.shields.io/npm/dm/research-agent-ui.svg" alt="NPM Monthly Downloads" /></a>
    <a href="https://www.npmjs.com/package/research-agent-ui"><img src="https://img.shields.io/npm/v/research-agent-ui.svg" alt="npm version" /></a>
    <a href="https://www.npmjs.com/package/research-agent-ui"><img src="https://img.shields.io/npm/dt/research-agent-ui.svg" alt="NPM Total Downloads" /></a>
    <a href="https://www.npmjs.com/package/research-agent-ui"><img src="https://img.shields.io/npm/types/research-agent-ui" alt="TypeScript types" /></a>
    <a href="https://packagephobia.com/result?p=research-agent-ui"><img src="https://packagephobia.com/badge?p=research-agent-ui" alt="Install size" /></a>
    <br />
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/stargazers"><img src="https://img.shields.io/github/stars/OpenSourceAGI/qwksearch-research-agent" alt="GitHub Stars" /></a>
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/issues"><img src="https://img.shields.io/github/issues/OpenSourceAGI/qwksearch-research-agent?logo=github" alt="GitHub Issues" /></a>
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/pulls"><img src="https://img.shields.io/github/issues-pr/OpenSourceAGI/qwksearch-research-agent?logo=github&label=PRs" alt="Open Pull Requests" /></a>
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/pulls?q=is%3Apr+is%3Aclosed"><img src="https://img.shields.io/github/issues-pr-closed/OpenSourceAGI/qwksearch-research-agent?logo=github&label=PRs%20merged&color=8957e5" alt="Merged Pull Requests" /></a>
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/discussions"><img src="https://img.shields.io/github/discussions/OpenSourceAGI/qwksearch-research-agent" alt="GitHub Discussions" /></a>
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/commits/master/"><img src="https://img.shields.io/github/last-commit/OpenSourceAGI/qwksearch-research-agent.svg" alt="GitHub last commit" /></a>
    <br />
    <img src="https://img.shields.io/badge/Bun-14151A?logo=bun&logoColor=white" alt="Bun" /> <img src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white" alt="TypeScript" /> <img src="https://img.shields.io/badge/Next.js-black?logo=nextdotjs&logoColor=white" alt="Next.js" /> <img src="https://img.shields.io/badge/React-20232A?logo=react&logoColor=white" alt="React" /> <img src="https://img.shields.io/badge/Cloudflare%20Workers-F38020?logo=cloudflareworkers&logoColor=white" alt="Cloudflare Workers" /> <img src="https://img.shields.io/badge/Tailwind%20CSS-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind CSS" /> <img src="https://img.shields.io/badge/shadcn%2Fui-000000?logo=shadcnui&logoColor=white" alt="shadcn/ui" /> <img src="https://img.shields.io/badge/Drizzle%20ORM-C5F74F?logo=drizzle&logoColor=white" alt="Drizzle ORM" /> <img src="https://img.shields.io/badge/Vercel%20AI%20SDK-black?logo=vercel&logoColor=white" alt="Vercel AI SDK" /> <img src="https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white" alt="Vite" /> <img src="https://img.shields.io/badge/Vitest-6E9F18?logo=vitest&logoColor=white" alt="Vitest" />
</p>
<!-- template-git-repo:badges:end -->

# research-agent-ui


The QwkSearch app UI: conversation window, article reader, search config,
file uploads, chat history — plus the app shell (providers, app dock, cookie
banner, the research/docs view switch) that assembles them into a whole app.
Includes the shadcn primitives and icons the components depend on, so it can be
dropped into a Next.js app with a single dependency.

![img1](https://i.imgur.com/UxNJOKy.png)

## Two entry points: with and without the editor

The package ships the same app twice, and the only difference is whether the
REASON document editor and its file sidebar come along:

| Import from | You get | Extra dependencies |
| --- | --- | --- |
| `research-agent-ui` | Chat, search, article reader, app shell | none |
| `research-agent-ui/workspace` | All of the above **plus** the REASON editor, document tree, and file sidebar | `react-reason-editor`, `react-reason-editor-sidebar` |

`research-agent-ui/workspace` re-exports everything the root entry does, so a
host that wants documents imports from that one path rather than mixing the
two. Going the other way, the root entry's import graph never reaches
`react-reason-editor` — the editor's (large) dependency tree stays out of a
chat-only consumer's bundle entirely. `test/entryBoundaries.test.ts` enforces
that in both directions.

The two editor packages are declared as **optional** peer dependencies:
installing `research-agent-ui` on its own is enough for the chat-only build,
and package managers will not warn about the missing peers.

## Usage

### The whole app in one component

```tsx
// Chat only — no editor, no sidebar.
import { QwkSearchApp } from 'research-agent-ui';

export default function Page() {
  return (
    <QwkSearchApp
      authClient={myAuthClient}
      config={{ appName: 'MyApp', footerLinks: myLinks }}
    />
  );
}
```

```tsx
// The same app, with documents.
import { QwkSearchWorkspaceApp } from 'research-agent-ui/workspace';

export default function Page() {
  return (
    <QwkSearchWorkspaceApp
      authClient={myAuthClient}
      config={{ appName: 'MyApp', footerLinks: myLinks }}
    />
  );
}
```

`QwkSearchProviders` is the same shell without a page inside it, for hosts that
render their own routes within the app chrome. It accepts a `ChromeProvider` to
mount app-owned context (a settings modal, say) inside the stack, and
`showDock` / `showCookieConsent` / `showToaster` to opt out of individual
pieces.

### Composing the pieces yourself

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

## Storybook

Individual UI pieces can be browsed in isolation with [Storybook](https://storybook.js.org/).
Stories render against **mock data only** (see `src/stories/mocks.ts`) — no API,
auth session, or chat backend is required, so you can develop and review the
chat components (message header with timestamp/copy/edit actions, search
progress, follow-up suggestions, file & pasted-content cards) on their own.

```bash
# from packages/research-agent-ui
bun run storybook        # dev server on http://localhost:6006
bun run build-storybook  # static build → storybook-static/
```

A light/dark toggle in the toolbar switches between the two token palettes
(mirrored from the host app's `globals.css` in `.storybook/preview.css`). Add
new stories next to their component as `*.stories.tsx`.

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
