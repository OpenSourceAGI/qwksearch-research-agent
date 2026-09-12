# research-agent-ui API Reference

## Entry points

| Subpath | Contents |
| --- | --- |
| `research-agent-ui` | Chat, reader, history, voice, app shell. No editor. |
| `research-agent-ui/workspace` | The root entry **plus** `QwkSearchWorkspaceApp`, `ResearchWorkspaceView`, `getPageTips`, `htmlToPlainText`, `getTopicSearches`. Requires the `react-reason-editor*` optional peers. |
| `research-agent-ui/config` | `ResearchAgentUIConfig` and friends alone |
| `research-agent-ui/api` | Server-side route-handler factories (Node only) |
| `research-agent-ui/file-sources` | File-source helpers |
| `research-agent-ui/settings`, `research-agent-ui/settings/*` | The settings panes |

## App shell (`src/app/`)

| Export | Notes |
| --- | --- |
| `QwkSearchApp`, `QwkSearchAppProps` | `QwkSearchProviders` + `ChatWindow`; props are `QwkSearchProvidersProps` minus `children`/`docsEnabled` |
| `QwkSearchProviders`, `QwkSearchProvidersProps` | The provider stack |
| `CategoryDock`, `CookieConsent` | Chrome |
| `MainViewProvider`, `useMainView`, `MainViewMode` | Research ↔ docs view switch |
| `useChatTabs`, `ChatTab` | Chat-tab bookkeeping |
| `useChunkErrorReload` | Recovers from stale-chunk load failures |

### `QwkSearchProvidersProps`

| Prop | Default | Meaning |
| --- | --- | --- |
| `authClient` | — | **Required.** The host's auth client; see `ResearchAgentAuthClient` for the subset used |
| `config` | — | `Partial<ResearchAgentUIConfig>` applied before the tree renders |
| `googleOneTap` | `'auto'` | `'auto'` asks the backend whether Google is configured before prompting |
| `docsEnabled` | set by the entry point | Whether the REASON surface is in this build |
| `ChromeProvider` | — | Extra provider mounted inside the dock/view providers |
| `showDock` / `showCookieConsent` / `showToaster` | `true` | Chrome toggles |
| `showSpotlight` | `true` | Mount the Ctrl-Space spotlight palette |

## Spotlight palette (`src/components/SpotlightPalette/`)

| Export | Purpose |
| --- | --- |
| `SpotlightPalette` | The Ctrl-Space overlay; mounted for you by `QwkSearchProviders` |
| `openSpotlight()` | Opens it from anywhere (no-op when it is not mounted) |
| `SPOTLIGHT_PREFIXES`, `SpotlightPrefix`, `SpotlightSource` | The prefix system: `c` chats · `t` pages · `s` settings · `a` actions · `w` ask |
| `parsePrefix`, `matchSpotlight` | The prefix parser and the two-tier ranker |
| `SPOTLIGHT_LINKS`, `SpotlightLink` | The hand-kept list of app pages |
| `SpotlightItem`, `SpotlightContext` | A row, and the callbacks a row's `run()` may use |

## Configuration

`configureResearchAgentUI(partial)`, `researchAgentUIConfig`, types
`ResearchAgentUIConfig`, `ResearchAgentAuthClient`, `FooterLink`.

| Field | Default | Meaning |
| --- | --- | --- |
| `appName` | `"QwkSearch"` | Document titles and branding |
| `defaultSummarizePrompt` | `"Summarize in bullet points and bold topics"` | Article summary prompt |
| `maxArticleLength` | `1500` | Characters of article body sent to the LLM |
| `downloadChromeUrl`, `downloadWindowsStoreId` | store links | Homepage download buttons |
| `footerLinks` | `[]` | Homepage footer |
| `googleApiKey`, `googleAppId` | `''` | Drive picker; **both** are required or picked files 403 on download |
| `appIconUrl` | — | The dock's "Research" icon, served by the host as a static asset |
| `getAutoMediaSearch()` | — | Whether to auto-run image/video search after a response |
| `onOpenSettings(section?)` | — | Return `true` when handled in place; else the caller navigates to `/settings` |
| `onOpenChat(chatId)` | — | Return `true` when handled in place; else the caller navigates to `/c/<chatId>` |

## Chat

`ChatWindow` (default export of `components/ChatConversation/ChatWindow`),
`ChatInputBox`, `ChatProvider`, `useChat`, `useChatState`, `ChatContextValue`.

Message types: `Message`, `ChatTurn`, `UserMessage`, `AssistantMessage`,
`SourceMessage`, `SearchingMessage`. From `types/chat`: `Section`, `ChatFile`,
`ChatModelProvider`, `ChatContextType`.

Internals: `src/hooks/useChat/` — `ChatContext.tsx`, `ChatProvider.tsx`,
`sendMessage.ts`, `chatMessages.ts`, `buildSections.ts`, `chatConfig.ts`,
`useChatState.ts`.

## Session, reader, history, voice

| Export | Purpose |
| --- | --- |
| `SessionProvider`, `useSession` | Auth session |
| `ExtractPanelProvider`, `useExtractPanel` | Article reader panel state |
| `ArticlePanelHeader`, `ArticleActionButtons`, `ARTICLE_TOOLBAR_SHORTCUTS`, `formatToolbarShortcut`, `ArticleToolbarAction`, `ArticlePromptInput`, `ArticleFollowupQuestions`, `ArticleAIResponse`, `ArticleContent`, `LexicalArticleViewer`, `UnifiedMarkdown` | Reader components |
| `HistoryDropdown`, `HistoryDialogs`, `useHistoryState` | Chat history |
| `useKokoroTTS`, `useTextToSpeech`, `VoiceSettingsPanel`, `KokoroVoiceSelector` | Voice and TTS |
| `cn`, `formatTimeDifference`, `formatMessageTime` | Utilities |

## Server handlers (`research-agent-ui/api`)

One factory per endpoint, each taking a narrow `deps` object:
`article-followups`, `article-qa`, `page-tips`, `topic-searches`, `chats`, `chat-title`,
`messages`, `providers`, `mcpservers`, `search`, `autocomplete`, `suggestions`,
`agents`, `rewrite`, `voice`, `transcript`, `test-models`, `validate-openrouter`.

Dependency interfaces (`src/api/types.ts`): `AuthDeps` (`getUserId`, `requireUserId`),
`SessionDeps` (`getSession`), `EnvDeps` (`getEnv`), `ArticleDeps`, `ChatsDeps`,
`MessagesDeps`, `ProvidersDeps`, `MCPServersDeps`, … Each names only what that handler
needs, so the same code runs in any Next.js app.

## Scripts

`bun run build` (vite + `tsc -p tsconfig.build.json`) · `type-check` ·
`storybook` / `build-storybook` · `test` / `test:coverage` ·
`dev:cloudflare` / `deploy:cloudflare` (the standalone Worker in `src/cloudflare/`).
