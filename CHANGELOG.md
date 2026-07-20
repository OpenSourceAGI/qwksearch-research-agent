# Changelog

# MVP Phase (2026)

## July 2026

Major framework modernization with **Vinext** and **Vite 8** (rolldown-based). Replaced **LangChain** with **Vercel AI SDK** across the chat pipeline. Improved error handling in model loading and database operations. Fixed Worker deployments, CommonJS/ESM compatibility, and frozen lockfile issues.

**Model Update**: Changed default model for OpenRouter provider from Kimi 2.5 to **Nemotron 3 Super 120B** for all users and guests. Updated chat configuration to prioritize Nemotron models across the platform.

**Multi-Provider Model Connections**: Added a `ConnectedModelsModal` and `AddProviderDialog` so users can connect their own API keys across 10+ LLM providers. Enhanced the `ModelSelect` component with search and category filtering, added a fallback for unmatched models in the `ModelFamiliesCarousel`, and replaced provider text labels with provider logo chips. Models are now click-to-select, and the API-key link was moved out of the family carousel into a dedicated flow.

**Local Text-to-Speech**: Integrated **Kokoro.js** for on-device TTS with expanded voice settings, giving article and answer read-aloud that runs locally without a cloud speech API.

**Agent Toolkit**: Added **Mastra** telemetry and workflow capabilities to the research agent, and initialized the shared `AGENT_TOOLS` registry so tools are orchestrated through a single array.

**Follow-up Suggestions**: Added a `suggestions` column to the `messages` table (with corrected migration history and schema snapshot) to persist generated follow-up questions per message.

**Auth & Sessions**: Added **Discord** and **LinkedIn** social login, and sorted active sessions by last-updated time so the most recent conversations surface first.

**Settings Overhaul**: Introduced per-tab URLs with copyable anchor links, provider logo chips, and click-to-select model rows for deep-linkable, shareable configuration.

**Search & Extraction**: Refactored search engine and academic sources to use the native `fetch` API (dropping `grab-url`), and switched the scraper API to the `URL` constructor for parameter extraction. Removed the `youtube-po-token-generator` dependency and retired the `youtube-to-text` path in favor of the leaner transcript extractor.

**API Client Migration**: Migrated chat API calls (`useHistoryState`, `DeleteChatSessionButton`, `chatMessages`) to the published **qwksearch-api-client** (bumped to 0.9.1), consolidating backend access behind the typed client.

**Rendering**: Replaced **Prism.js** with a custom `highlightCode` function and reorganized the Markdown-to-HTML conversion logic, adding broader language support along the way.

**Reliability Fixes**: Surfaced root-cause database errors when message saves fail, fixed a chat-history save primary-key conflict, removed a defunct free model, and corrected mobile padding on the chat homepage.

**Docs & Packaging**: Standardized package **READMEs** with NPM monthly-download and version badges, removed redundant badge sections, corrected the `search-web-api` package name, and updated PDF conversion expectations in the docs.


## June 2026

UI/UX overhaul with migration from **@opennextjs/cloudflare** to **Vinext**. Implemented **macOS-style category dock** with theme switching. Consolidated authentication with **better-auth 1.6.14** and **Web Crypto API**. Added responsive layouts, **dynamic island TOC** positioning, and font controls. Fixed vite-rolldown aliasing and turbopack build failures. Enhanced deployment scripts.

## May 2026

Editor and authentication enhancements. Integrated **Google One Tap** with FedCM and incognito mode. Added **Shiki code highlighting**, **Mermaid diagrams**, word count modals, and document export. Implemented file management with lazy initialization. Expanded settings with API key controls and sign-out. Added **reason-editor** module with new plugins. Refactored database schema for cross-environment compatibility. Updated **OpenNext Cloudflare** deployment with PWA assets.

## April 2026

**Major V2 rewrite** with fundamental restructuring. Optimized project structure and removed deprecated dependencies. Reorganized scraper infrastructure with rebuilt **Next.js** configuration. Overhauled documentation and README. Refactored research agent components and migrated chat/article modules. Enhanced editor with font customization and menu improvements. Improved **Cloudflare Workers** configuration.


# Prototype Phase (2024)

## December 2024

**Beta V1 major release** with complete feature set. Comprehensive login and user management. Integrated editor with full capabilities. **Docusaurus** documentation with **OpenAPI** and **TypeDoc** support. Automatic API reference generation. First production-ready version.

## November 2024

Search infrastructure improvements. Enhanced **Docker-based** search system with better reliability. Fixed **YouTube** integration for video content. Added **DOCX** file format support. Fixed **USearch** vector accuracy issues. Enhanced content extraction capabilities.

## October 2024

Topic modeling and citations. Completed **SeekTopic** integration for topic extraction and analysis. Standardized citation formatting platform-wide. Improved README with better examples. Focused on academic and research features.

## September 2024

Core algorithm implementations. Built **VSEARCH** (Vector Similarity Embedding Approximation) as custom vector search. Added category systems for organization. Introduced **Tardigrade web crawler** for distributed crawling. Expanded documentation with categories. Enhanced main UI. Established algorithmic foundations.

## August 2024

Content extraction and NLP. Ported **Trafilatura.js** from Python (33 files) for article extraction. Enhanced **Readability2** accuracy. Added **UMAP** dimensionality reduction. Implemented **HNSW** vector search with demos. Modularized extractors (Readability, Postlight). Adopted "code as art" philosophy. Implemented **TypeDoc** documentation. Added **YouTube embed API** with transcript optimization. Enhanced extension with CORS support.

## July 2024

Search algorithms and autocomplete. Implemented **DSEEK** keyphrase extraction with **TextRank**, **WikiIDF**, and noun edge-grams. Added query autocomplete with live demo. Introduced new compression formats. Integrated **OpenEnglishWordnet** and 35k Wikipedia pages. Added **RAG** use case. Implemented **Wiki BM25** with 1M/2M datasets. Published results demo. Enhanced search quality and linguistic capabilities.
