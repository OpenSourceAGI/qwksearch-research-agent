# MVP Phase (2026)

## November 2026 — 25 commits so far

- **API**
  - Added OpenAI-compatible speech-to-text routes, `GET /api/v1/models` and `POST /api/v1/audio/transcriptions`, so Kilo (or any OpenAI-style client) can use `qwksearch.com/api/v1` as its transcription base URL. They take a QwkSearch API key as a Bearer token only, never a browser session, and log neither audio nor transcript. The transcription logic moved into a shared `transcribeAudio()` in `research-agent-ui`, so `/api/agent/transcript` keeps its contract.
  - Rate-limited every `/api` route per client IP in `worker/index.ts`, so new routes are covered without opting in. Counters are fixed windows in D1 shared by every isolate; over the limit is a JSON 429 with `Retry-After`, and allowed responses carry `RateLimit-*` headers. It fails open on any D1 error.
  - A new `/admin/rate-limit` page sets the on/off switch, default limit and window, per-route overrides and exempt paths (`/api/auth`, `/api/admin` and `/api/collaboration` by default), stored in D1 (migration 0014). It also lists the busiest clients and can reset counters.
  - Updated and reorganized the OpenAPI spec in `qwksearch-api-client`: documented the 50 operations it was missing, regrouped 15 tags into 20 under six tag groups, and replaced the single "JWT" scheme with what the routes really check (API key, session cookie, Google Drive cookie). The regenerated client went from 85 to 135 functions with none removed, and a new drift test fails when a route and the spec disagree. The rate limit and its 429 are documented there too.
- **Qwk in Lobe**
  - The original LobeHub chat now runs from the QwkSearch homepage: a homepage send goes straight into LobeHub's own agent chat instead of the old `/demo` guest chat, which was removed. `openrouter/auto` is now marked as function-calling, so the first message carries every tool (web browsing, memory, skills, documents, plans, sub-agents) instead of zero.
  - Every browser gets its own guest user through an HttpOnly `lobe_uid` cookie recorded in D1 (`lobe_users`, migration 0004), so chats, agents and provider keys no longer belong to one user shared by everyone.
  - The homepage chat always shows the send button, and any typed text reaches OpenRouter.
- **Renames**
  - Renamed the `user-help-docs` package to `qwksearch-help-docs` everywhere it was still referenced: package name, workspace dependency, imports, tsconfig paths, Tailwind sources, vitest projects, coverage and codecov.
  - Dropped the `ask-` prefix from all 30 agent skills and added a skill install line to every package README.
- **Dependencies**
  - Removed `prismjs` from every package. `extract-webpage` and `write-language` now highlight code with highlight.js core and an explicit list of 15 languages, so their built dists load in plain Node ESM. `write-language` exports `hljs` in place of `Prism`, and `highlightCode` keeps its signature.
  - Kept `react-player` external in `reason-editor`, which fixed a "Duplicated export 'default'" failure in the web build.
- **npm publishing**
  - The publish workflow read every npm E403 as a broken credential and stopped, so nothing after `search-autocomplete` (whose name npm refuses) had published since. A name refusal now fails only that package.
  - `research-agent-ui` now bundles `search-autocomplete` instead of depending on it, so a fresh install works.
  - A package is held back only when npm lacks the exact version of a sibling it pins, not whenever a sibling failed to publish in the same run.
- **Other**
  - Removed leftover merge-conflict markers in the Learn planner and agent runtime.

## October 2026 — 157 commits

- **LobeChat engine in QwkSearch**
  - Made the LobeChat chat engine the default for every `/api/agent/chat` focus mode, ported into `qwksearch-web` as `lib/lobe-engine` (context-engine pipeline and the agent runtime's call-model / run-tools loop).
  - Chat now runs LobeChat's own web-browsing and calculator tools, prompts and MCP client, imported from the `qwk-in-lobe` source through aliases instead of copies.
  - System prompts are sent as AI SDK 7 instructions.
- **Qwk in Lobe**
  - Runs as core LobeHub with OpenRouter as the default provider and the QwkSearch feature flag off by default.
  - Removed sign-in and Better Auth entirely: every request runs as one local user, while API keys still authenticate as their owner. Along the way it gained guest sessions, a guest OpenRouter key entry that powers the main chat, and a demo account.
  - Default models route through OpenRouter, with an end-to-end chat test through OpenRouter.
  - Deploys to the live `lobe` Worker; Workers Builds no longer reuses a partial bun install cache, and `zod-openapi` was added so `next build` resolves.
- **Sign in with QwkSearch**
  - Sites that embed the research agent (debate-ai.com first) can sign users in through a small OAuth authorization-code + PKCE flow at `/connect`, instead of running only as a guest (#511, #516). AI Broker (autoinvestment.broker) joined the allowlist.
- **Learn**
  - New `education-playlists` package: self-paced study playlists seeded with 28 MIT OpenCourseWare courses in 11 preset playlists, with an AI planner that asks follow-up questions (#505).
  - Playlists are stored server-side for signed-in users, with invites.
  - Clicking a playlist item opens it in the article reader with suggested questions, and clicking a course opens a chat that extracts and summarizes it.
- **Workspace & editor**
  - Google Drive folders sync into the workspace file tree, with Google Docs in the editor and PDFs, Sheets and Slides in a PDF.js viewer.
  - Added a Google Docs-style menu bar to the REASON editor with Harper spelling and grammar, and shadcn-style menubar dropdowns.
  - A fresh Plate editor mounts per document, and the sidebar ships richer sample documents on first load.
  - `research-agent-ui` exports a hostable workspace sidebar and its settings pages for embedders.
- **New packages**
  - `extract-cite`: citation extraction moved out of `extract-webpage`, plus `extractCiteLLM`, which completes missing APA fields with one LLM call. Its default entry dropped from ~900 kB to ~60 kB by loading the names database only on demand.
  - `ads-in-chat-answers`: sponsored product carousels under answers, sponsored follow-ups, a relevance-first keyword auction and an advertiser panel.
- **Extraction**
  - `extract-youtube` gained a `download` entry over `cloud-ytdl` with MP3 audio and a hostable HTTP API (#515), and the pop-out player now sends a referrer so YouTube stops blocking it (#509).
  - `extract-pdf` gained an admin panel with password login and global keys, a cancel button in the cite demo, and an instant warmup for the Docling Space.
  - Each of `extract-youtube` and `extract-pdf` got its own docs and demo Worker, and the `extract-pdf` site ships on Vercel.
  - Fixed TOC detection, timezone-stable dates and DOCX CSS, with new tests for date extraction, DOCX conversion and the main-content extractors.
- **Apps**
  - Merged the LeoTabs tab organizer into the QwkSearch browser extension.
  - QwkSearch Desktop gained signed auto-updates with an "Update and restart" prompt.
- **Homepage & performance**
  - Lazy-loaded the chat thread and deferred the weather and news widgets until the browser is idle (#503); the Plate editor loads only when a document is opened, and homepage backgrounds come from a local cache.
  - The enterprise request form is back on the homepage and now really submits, stored in a D1 table (migration 0013).
  - Merged the product banner and demo video into one click-to-play player, and fit the footer links on one line.
  - The page reloads once when a lazy workspace chunk 404s after a deploy.
- **Reliability & ops**
  - `/api/agent/voice` now uses Deepgram Aura through Workers AI on Cloudflare, where Kokoro could not load and every request returned 500.
  - Trending news serves the archive before KV copies and recovers cleanly after failures.
  - Turned on Workers observability (logs and traces) for every Worker.
  - Restored the monorepo root `package.json` (#510, #513), dropped a root `.vercelignore` that stripped source from every Vercel build (#514), and regenerated `bun.lock` so frozen installs pass.

## September 2026 — 72 commits

- **LobeHub core engine** — the biggest bet this cycle: a Cloudflare Workers port of the lobe-chat monorepo as the future core engine for chat and settings, with QwkSearch's homepage, article extraction, and REASON docs layered on top. It landed in stages:
  - A full `packages-lobe` foundation — Hono worker, Better Auth, tRPC, D1/KV/R2/Hyperdrive bindings, plus QwkSearch's article side-panel and docs surfaces ported over — and a comprehensive test suite for it (#310).
  - All 96 upstream packages vendored verbatim into `packages-third-party`, alongside a core-engine architecture plan (#313).
  - The vendored tree removed again (#315) in favor of a phased migration plan for the chat-engine and settings cutover (#318).
  - The first phase of that plan: LobeHub's web-browsing tool can now search through QwkSearch's own engine fan-out via a new `qwksearch` search provider.
  - Two living companion docs for the plan — a per-item migration to-do list and a file-by-file reference of every QwkSearch↔LobeHub integration.
- **REASON editor sidebar**
  - Extracted into its own `react-reason-editor-sidebar` package (#305).
  - Build-order fixes so the sidebar compiles before the packages that depend on it (#306, #308, #309).
  - Restored the Tailwind `@source` scan and dock-offset padding lost in the move, and un-wiped Open Tabs from the default panel layout (#319).
  - Refined sidebar panels to stack with Open Tabs above Files, infer split view from panel count instead of a checkbox, and fixed expand/collapse-all cycling (#321).
  - Fixed sidebar-footer visibility and a duplicate font-size entry (#320).
  - Added a configurable keyboard-shortcut system to the REASON toolbar, with a central shortcut registry, live-updating tooltip shortcut chips, conflict detection, and a new Settings section for remapping bindings (#323).
- **Search & extraction**
  - Merged `extract-pdf-docling` back into `extract-pdf` with selectable processor modes (frontend/hybrid/docling) and a dependency-free OCR page-scan heuristic (#316).
  - Added a standalone React popout transcript modal to `extract-youtube`, ported from debate-ai.com (#307).
  - The article sidebar now detects Markdown-only scrape responses (e.g. from the JINA reader fallback) and renders them properly instead of showing raw `![]()` syntax, stripping navigation/cookie boilerplate along the way (#314).
- **Reliability & ops**
  - Chat failures now surface as a persistent error bubble in the conversation instead of a silent toast, backed by a new `/admin/chat-test` diagnostics page; admin access is now strictly gated to `ADMIN_EMAILS` with no first-user fallback (#322).
  - D1 reads now route through the Sessions API with per-request version bookmarking, so enabling read replication can't serve stale or out-of-order data (#324).
  - Added scoped CORS to the public, guest-usable agent routes so debate-ai.com can call them directly without an iframe (#312).
- **Other**
  - Training jobs now provision GPUs on Vast.ai's marketplace from the web dashboard instead of running in-container (#303).
  - Added a product-comparison table against Perplexity/ChatGPT/Claude/Google/Grok to the `/features` marketing page (#317), and updated its hero tagline (#311).

## August 2026 — 168 commits

- **Editor**
  - Made **Plate** the default REASON editor engine, adding the dictation and sidebar plugins it was still missing relative to the Tiptap engine (#295).
  - Layout fixes: the editable area now fills its pane without a stray border, zoom scales layout instead of applying a post-layout transform, and the Page Settings popup renders as its own portalled panel instead of clipping under a dropdown (#288).
  - Reconstructed the `packages/reason-editor/demo/` app — documented throughout the package's README but missing from the repo — from its pre-rename history (#280).
- **Search results**
  - Video results gained inline playback via a player dialog when a safe `iframe_src` is available, instead of always opening a new tab (#282).
  - A shared, tested `mapSearchResultToDocument` helper replaced duplicated pagination-mapping logic that had been silently dropping `img_src` from paginated Images results (#283).
- **Homepage widgets**
  - Gated the weather widget's rain badges to only show above 2% precipitation probability, with a more compact upcoming-days row, and gave the trending-news widget an expandable vertical view (#297).
  - Added per-topic article thumbnails to trending-news cards, plus new homepage settings to toggle and customize both the weather and trending-news widgets (#300).
- **Marketing**
  - Added a `/features` page with a hero, animated counters, an engine-name marquee, a capability bento grid, and a pipeline/client-tabs walkthrough (#289).
- **Packaging & CI**
  - Dropped `prepare`/`postinstall` lifecycle scripts from several packages (extract-pdf, extract-youtube, reason-editor, use-voice-control, qwksearch-ext) that were causing false-positive `bun install --frozen-lockfile` failures, and bumped the pinned bun version to 1.4.0 to fix the same underlying issue (#296, #298).
  - Switched package README badges from weekly to monthly npm-download counts, and added an uptime status badge to the root README (#293, #294).
- **Planning**
  - Drafted an initial LobeHub package-integration plan triaging lobe-chat's ~90 workspace packages into adopt/port/skip (#286).
  - Triaged 7 stale open PRs as already superseded by master (#287).

## July 2026 — 473 commits

- **Framework modernization**
  - Migrated to **Vinext** and **Vite 8** (rolldown-based).
  - Replaced **LangChain** with the **Vercel AI SDK** across the chat pipeline.
  - Improved error handling in model loading and database operations.
  - Fixed Worker deployments, CommonJS/ESM compatibility, and frozen lockfile issues.
- **Model update**
  - Changed the default model for the OpenRouter provider from Kimi 2.5 to **Nemotron 3 Super 120B** for all users and guests.
  - Updated chat configuration to prioritize Nemotron models across the platform.
- **Multi-provider model connections**
  - Added a `ConnectedModelsModal` and `AddProviderDialog` so users can connect their own API keys across 10+ LLM providers.
  - Enhanced the `ModelSelect` component with search and category filtering.
  - Added a fallback for unmatched models in the `ModelFamiliesCarousel`, and replaced provider text labels with provider logo chips.
  - Made models click-to-select, and moved the API-key link out of the family carousel into a dedicated flow.
- **Local text-to-speech**
  - Integrated **Kokoro.js** for on-device TTS with expanded voice settings, giving article and answer read-aloud that runs locally without a cloud speech API.
- **Agent toolkit**
  - Added **Mastra** telemetry and workflow capabilities to the research agent.
  - Initialized the shared `AGENT_TOOLS` registry so tools are orchestrated through a single array.
- **Follow-up suggestions**
  - Added a `suggestions` column to the `messages` table (with corrected migration history and schema snapshot) to persist generated follow-up questions per message.
- **Auth & sessions**
  - Added **Discord** and **LinkedIn** social login.
  - Sorted active sessions by last-updated time so the most recent conversations surface first.
- **Settings overhaul**
  - Introduced per-tab URLs with copyable anchor links, provider logo chips, and click-to-select model rows for deep-linkable, shareable configuration.
- **Search & extraction**
  - Refactored search engine and academic sources to use the native `fetch` API (dropping `grab-url`), and switched the scraper API to the `URL` constructor for parameter extraction.
  - Removed the `youtube-po-token-generator` dependency and retired the `youtube-to-text` path in favor of the leaner transcript extractor.
- **API client migration**
  - Migrated chat API calls (`useHistoryState`, `DeleteChatSessionButton`, `chatMessages`) to the published **qwksearch-api-client** (bumped to 0.9.1), consolidating backend access behind the typed client.
- **Rendering**
  - Replaced **Prism.js** with a custom `highlightCode` function and reorganized the Markdown-to-HTML conversion logic, adding broader language support along the way.
- **Reliability fixes**
  - Surfaced root-cause database errors when message saves fail.
  - Fixed a chat-history save primary-key conflict.
  - Removed a defunct free model.
  - Corrected mobile padding on the chat homepage.
- **Docs & packaging**
  - Standardized package **READMEs** with NPM monthly-download and version badges, and removed redundant badge sections.
  - Corrected the `search-web-api` package name.
  - Updated PDF conversion expectations in the docs.

## June 2026 — 88 commits

- UI/UX overhaul with migration from **@opennextjs/cloudflare** to **Vinext**.
- Implemented a **macOS-style category dock** with theme switching.
- Consolidated authentication with **better-auth 1.6.14** and the **Web Crypto API**.
- Added responsive layouts, **dynamic island TOC** positioning, and font controls.
- Fixed vite-rolldown aliasing and turbopack build failures.
- Enhanced deployment scripts.

## May 2026 — 113 commits

- Integrated **Google One Tap** with FedCM and incognito mode.
- Added **Shiki code highlighting**, **Mermaid diagrams**, word count modals, and document export.
- Implemented file management with lazy initialization.
- Expanded settings with API key controls and sign-out.
- Added the **reason-editor** module with new plugins.
- Refactored the database schema for cross-environment compatibility.
- Updated **OpenNext Cloudflare** deployment with PWA assets.

## April 2026 — 3 commits

- **Major V2 rewrite** with fundamental restructuring: optimized project structure and removed deprecated dependencies.
- Reorganized scraper infrastructure with a rebuilt **Next.js** configuration.
- Overhauled documentation and the README.
- Refactored research agent components and migrated the chat/article modules.
- Enhanced the editor with font customization and menu improvements.
- Improved **Cloudflare Workers** configuration.


# Prototype Phase (2024) [Demo](https://web.archive.org/web/20241216043527/http://qwksearch.com/)

## December 2024 — 6 commits

- **Beta V1 major release** with the complete feature set — the first production-ready version.
- Comprehensive login and user management.
- Integrated editor with full capabilities.
- **Docusaurus** documentation with **OpenAPI** and **TypeDoc** support.
- Automatic API reference generation.

## November 2024 — 1 commit

- Enhanced the **Docker-based** search system with better reliability.
- Fixed **YouTube** integration for video content.
- Added **DOCX** file format support.
- Fixed **USearch** vector accuracy issues.
- Enhanced content extraction capabilities.

## October 2024 — 2 commits

- Completed **SeekTopic** integration for topic extraction and analysis.
- Standardized citation formatting platform-wide.
- Improved the README with better examples.
- Focused on academic and research features.

## September 2024 — 13 commits

- Built **VSEARCH** (Vector Similarity Embedding Approximation) as custom vector search.
- Added category systems for organization.
- Introduced the **Tardigrade web crawler** for distributed crawling.
- Expanded documentation with categories.
- Enhanced the main UI.
- Established the algorithmic foundations.

## August 2024 — 26 commits

- Ported **Trafilatura.js** from Python (33 files) for article extraction.
- Enhanced **Readability2** accuracy.
- Added **UMAP** dimensionality reduction.
- Implemented **HNSW** vector search with demos.
- Modularized extractors (Readability, Postlight).
- Adopted the "code as art" philosophy.
- Implemented **TypeDoc** documentation.
- Added the **YouTube embed API** with transcript optimization.
- Enhanced the extension with CORS support.

## July 2024 — 27 commits

- Implemented **DSEEK** keyphrase extraction with **TextRank**, **WikiIDF**, and noun edge-grams.
- Added query autocomplete with a live demo.
- Introduced new compression formats.
- Integrated **OpenEnglishWordnet** and 35k Wikipedia pages.
- Added a **RAG** use case.
- Implemented **Wiki BM25** with 1M/2M datasets, and published a results demo.
- Enhanced search quality and linguistic capabilities.
