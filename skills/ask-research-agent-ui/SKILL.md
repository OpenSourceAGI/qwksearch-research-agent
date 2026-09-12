---
name: ask-research-agent-ui
description: Guide to research-agent-ui (packages/research-agent-ui), the QwkSearch chat/search UI as a drop-in package — the two entry points (chat-only root vs `/workspace` with the REASON editor), QwkSearchApp and the QwkSearchProviders stack, configureResearchAgentUI, the ChatProvider / SessionProvider / ExtractPanelProvider contexts, the article reader, voice and TTS hooks, the Ctrl-Space spotlight palette, and the `/api` dependency-injected route-handler factories. Use when changing anything in the chat window, message composer, search config, article reader, file upload, chat history or the spotlight palette, when wiring the package into a host app's auth and API routes, or when the editor's dependency tree leaks into a chat-only bundle.
---

# Working With research-agent-ui

`packages/research-agent-ui`, published as **research-agent-ui**. This is where the
product's UI actually lives — `apps/qwksearch-web` mostly mounts it. If the request is
"change how search results look" or "add a button to the chat toolbar", it belongs here.
Full export map: [API.md](API.md).

## The two entries — pick deliberately

| Import | Contains | Extra peers |
| --- | --- | --- |
| `research-agent-ui` | Chat, article reader, history, voice, app shell — **no editor** | `next`, `react`, `react-dom` |
| `research-agent-ui/workspace` | All of the above **plus** `QwkSearchWorkspaceApp` and `ResearchWorkspaceView` | also `react-reason-editor`, `react-reason-editor-sidebar` |

`/workspace` re-exports the whole root entry, so a host that wants documents imports
that one path only. The split exists so a chat-only host never pulls the Tiptap/Plate
tree; adding an editor import to the root entry silently undoes that for everyone.

There are two more subpaths: `research-agent-ui/config` (config types alone) and
`research-agent-ui/api` (server-side handler factories).

## Setup

Mount the whole app:

```tsx
import { QwkSearchApp } from "research-agent-ui";
<QwkSearchApp authClient={myAuthClient} config={{ appName: "MyApp" }} />
```

Or compose the pieces:

```tsx
configureResearchAgentUI({ appName: "MyApp", authClient });
<SessionProvider authClient={authClient}>
  <ExtractPanelProvider><ChatProvider><ChatWindow /></ChatProvider></ExtractPanelProvider>
</SessionProvider>
```

`QwkSearchApp` is just `QwkSearchProviders` + `ChatWindow`, so its props are
`QwkSearchProvidersProps` minus `children` and `docsEnabled` — `authClient` (required),
`config`, `googleOneTap` (`'auto'` by default: it asks the backend whether Google is
configured before prompting), `ChromeProvider`, `showDock`, `showCookieConsent`,
`showToaster`. `docsEnabled` is set by the entry point, not by the host.

## Where things live

| Change | Directory |
| --- | --- |
| Conversation rendering, message list | `src/components/ChatConversation/` |
| Input box, attachments, toolbar | `src/components/MessageComposer/` |
| Search category/engine pickers | `src/components/SearchConfig/` |
| Result cards | `src/components/SearchResults/` |
| Reader panel, extraction UI | `src/components/ArticleReader/` |
| Copy/share/export actions | `src/components/MessageActions/` |
| Upload flow, Drive picker | `src/components/FileUpload/` |
| History dropdown and dialogs | `src/components/ChatHistoryDropdown/` |
| The Ctrl-Space spotlight palette | `src/components/SpotlightPalette/` |
| Voice settings, Kokoro voices | `src/components/VoiceSettings/`, `src/hooks/voice/` |
| Send/stream logic, chat state | `src/hooks/useChat/` (`sendMessage.ts`, `chatMessages.ts`, `buildSections.ts`) |
| Shell: dock, providers, view switch, tabs | `src/app/` |
| Editor-bearing surfaces | `src/workspace/` |
| Server route handlers | `src/api/handlers/` |

## Recipes

**Configure branding and callbacks.** `configureResearchAgentUI(partial)` mutates the
module-level `researchAgentUIConfig`, or pass `config` to the providers (preferred — it
keeps configuration with the mount). Notable fields: `appName`, `appIconUrl`,
`footerLinks`, `defaultSummarizePrompt`, `maxArticleLength`, `getAutoMediaSearch()`,
`onOpenSettings(section?)` and `onOpenChat(chatId)` — the last two return `true` when the
host handled the request in place, and `false`/`undefined` to fall back to navigating to
`/settings` or `/c/<chatId>`.

**Server routes.** `research-agent-ui/api` exports a handler factory per endpoint
(`chats`, `messages`, `search`, `agents`, `voice`, `providers`, `mcpservers`, `rewrite`,
`transcript`, …). Each takes a narrow `deps` object — `getDB`, `requireUserId`,
`getUserId`, `getSession`, `getEnv`, schema references — so the same logic runs in any
Next.js app. Add an endpoint by adding a handler plus its `*Deps` interface in
`src/api/types.ts` and exporting it from `src/api/index.ts`.

`rewrite` answers in two shapes. By default it returns `{ rewrittenText }` JSON,
which is what the chat UI's rewrite-message button reads. When the request body
sets `stream: true` *and* the host passed a `streamText` in `deps`, it returns a
`text/plain` token stream instead — that is what the REASON editor's writing
assistant asks for, so its review panel fills in as the model writes. Both are
load-bearing and neither is inferable from the types, so keep the fallbacks:
`stream: true` against a host with no `streamText` has to answer with JSON
rather than failing the request.

**The spotlight palette.** `QwkSearchProviders` mounts `SpotlightPalette` (turn it off
with `showSpotlight={false}`). Ctrl-Space — Cmd-Space belongs to macOS — opens one bar
over the whole app; `openSpotlight()` does the same from chrome that has no keyboard
(the dock's Settings menu calls it). It is modelled on CardMirror's quick-card palette
in debate-ai, prefix system and all: `c ` chats · `t ` pages · `s ` settings sections ·
`a ` actions · `w ` ask, no prefix searches everything with "ask it" pinned on top. Tab
cycles the scope, ↑↓ move, Enter runs, Esc closes.

Three files, split so the interesting parts are testable without mounting the app:
`spotlightMatch.ts` (the prefix parser and the two-tier ranker — name matches first,
then secondary text with a snippet; substring, never fuzzy), `spotlightItems.ts` (one
builder per source, each taking a `SpotlightContext` of callbacks so nothing reaches for
a hook or an endpoint) and `SpotlightPalette.tsx` (the overlay, which supplies that
context from the chat / session / view contexts it is mounted inside). Add a source by
writing a builder and giving it a prefix in `SPOTLIGHT_PREFIXES`; add a page by adding
it to `spotlightLinks.ts`, which is hand-kept because the package has no router to
derive it from.

**Google Drive picker.** Set both `googleApiKey` and `googleAppId`. The connector holds
the per-file `drive.file` scope, and Google only releases a picked file when the picker
knows the app id — with it empty, files come back but downloading them 403s.

## Troubleshooting

| Symptom | Cause → fix |
| --- | --- |
| Chat-only bundle suddenly includes Tiptap/Plate | Something imported an editor surface from the root entry. Editor imports belong in `src/workspace/` and `workspace.ts` only. |
| `QwkSearchWorkspaceApp` is not exported | You imported the root entry. Use `research-agent-ui/workspace`. |
| Missing-peer errors for `react-reason-editor` | Those are optional peers of the `/workspace` entry — install them, or use the chat-only entry. |
| Google One Tap never appears | `googleOneTap` defaults to `'auto'` and stays off unless the backend reports Google as a configured provider. Pass `true` to force it. |
| Ctrl-Space does nothing | The host mounts its own shell instead of `QwkSearchProviders`, or passes `showSpotlight={false}`. Mount `<SpotlightPalette />` inside the session/chat/view providers — it reads all three. |
| A palette row navigates when the host wanted to handle it in place | `onOpenChat` / `onOpenSettings` must return `true`; the palette falls back to `/c/<id>` and `/settings/<section>` exactly like the history dropdown. |
| Settings open as a route when a modal was wanted | `onOpenSettings` must return `true`; anything else falls through to route navigation. |
| Drive picker returns a file that then 403s | `googleAppId` (the Google Cloud project number) is empty. |
| Edits don't appear in `apps/qwksearch-web` | It consumes the built `dist/`. `bun run build` here, or run the repo's `.github/scripts/build-workspace-packages.mjs`. |
| A component looks right in Storybook but breaks in the app | Providers. Most components assume `SessionProvider` / `ChatProvider` / `ExtractPanelProvider` above them (`bun run storybook` to iterate). |
| Type-check fails on editor types after a fresh clone | `react-reason-editor` has not been built, so its `exports → types` point at a missing `dist/`. Build siblings first. |
