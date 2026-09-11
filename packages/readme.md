
## 📦 Packages

- <a href="https://www.npmjs.com/package/chat-agent-toolkit"><img src="https://img.shields.io/npm/dm/chat-agent-toolkit.svg" alt="Monthly Downloads"></a> **chat-agent-toolkit** — A multi-provider AI agent toolkit that generates language responses, searches the web, extracts content, and manages memory across 10+ LLM providers. It integrates the Vercel AI SDK, Mastra framework, and MCP protocol to orchestrate research agent workflows.

- <a href="https://www.npmjs.com/package/domain-rank"><img src="https://img.shields.io/npm/dm/domain-rank.svg" alt="Monthly Downloads"></a> **domain-rank** — Looks up top-ranked domains from the Tranco List and CommonCrawl backlink data to retrieve their human-readable source label, influence rank, and favicon. Useful for search/URL autocomplete, bookmark launchers, and domain reputation scoring.

- <a href="https://www.npmjs.com/package/extract-pdf"><img src="https://img.shields.io/npm/dm/extract-pdf.svg" alt="Monthly Downloads"></a> **extract-pdf** — Converts a PDF from a URL or ArrayBuffer into clean HTML with structural tagging including headings, lists, footnotes, and code blocks. Slim by default — PDF.js loads at runtime from the pdfjs-serverless CDN build — with optional OCR via IBM's granite-docling-258M model: run all pages through the frontend JS parser, all through Docling, hybrid (a regex scan flags pages with infographics/tables and OCRs only those), or point at the URL of another docling-compatible processor. Ships the Hono HTTP OCR service in its `server/` folder. Works in Node.js, Cloudflare Workers, and browser environments.

- <a href="https://www.npmjs.com/package/extract-webpage"><img src="https://img.shields.io/npm/dm/extract-webpage.svg" alt="Monthly Downloads"></a> **extract-webpage** — Searches, extracts, cites, and outlines web content for a topic using an AI Research Agent. Combines PDF extraction, YouTube transcript extraction, DOM parsing, and LLM-based summarization to produce structured content from arbitrary web pages.

- <a href="https://www.npmjs.com/package/extract-youtube"><img src="https://img.shields.io/npm/dm/extract-youtube.svg" alt="Monthly Downloads"></a> **extract-youtube** — A fast, no-browser, serverless-optimized YouTube transcript extractor that fetches subtitles and captions without requiring a headless browser. Supports multiple output formats (SRT, WebVTT) and runs on edge/serverless platforms.

- <a href="https://www.npmjs.com/package/html-renderer-api"><img src="https://img.shields.io/npm/dm/html-renderer-api.svg" alt="Monthly Downloads"></a> **html-renderer-api** — A Cloudflare Worker that renders pages with Puppeteer via Browser Rendering. A Durable Object keeps the browser warm and persists cookies per session id, so pages behind a login or a Cloudflare challenge can be scraped, with Swagger UI and an OpenAPI spec on the worker itself.

- <a href="https://www.npmjs.com/package/notebooklm-api-client"><img src="https://img.shields.io/npm/dm/notebooklm-api-client.svg" alt="Monthly Downloads"></a> **notebooklm-api-client** — A Cloudflare Worker and on-demand Python container that drive Google's NotebookLM, which has no public API. One authenticated POST endpoint covers list/create/ask/summarize/delete, and a Puppeteer login flow captures the Google session for the container. The container sleeps after 5 minutes idle to conserve cost.

- <a href="https://www.npmjs.com/package/qwksearch-api-client"><img src="https://img.shields.io/npm/dm/qwksearch-api-client.svg" alt="Monthly Downloads"></a> **qwksearch-api-client** — An auto-generated TypeScript API client for the QwkSearch platform, built from an OpenAPI specification. Provides typed fetch-based bindings for interacting with the QwkSearch backend API.

- <a href="https://www.npmjs.com/package/qwksearch-mcp-server"><img src="https://img.shields.io/npm/dm/qwksearch-mcp-server.svg" alt="Monthly Downloads"></a> **qwksearch-mcp-server** — An MCP server that exposes web search, page extraction and JavaScript rendering as tools over stdio, so any MCP client — Claude Desktop, Claude Code, or your own — can search and read the web through QwkSearch.

- <a href="https://www.npmjs.com/package/react-reason-editor"><img src="https://img.shields.io/npm/dm/react-reason-editor.svg" alt="Monthly Downloads"></a> **reason-editor** — A formatted text editor built on Tiptap and Plate (React), published as `react-reason-editor`, with a toolbar, documents manager, and note outlines. Ships 59 editor extensions on individual subpath exports, 21 locales, remappable shortcuts, drag-and-drop, and collaborative editing via Yjs.

- <a href="https://www.npmjs.com/package/react-reason-editor-sidebar"><img src="https://img.shields.io/npm/dm/react-reason-editor-sidebar.svg" alt="Monthly Downloads"></a> **reason-editor-sidebar** — The REASON editor's file/folder tree, open-tabs panel, outline and split-view menu as a standalone package, published as `react-reason-editor-sidebar`. Includes the file-source layer for local, SSH, S3, R2, B2, Google Docs and Turso backends.

- **render-url-to-html** — A collection of URL-to-HTML rendering strategies using Cloudflare Browser Rendering, Puppeteer with stealth plugins, and JSDOM. Fetches URLs and returns fully-rendered DOM as HTML, capable of bypassing bot-detection on JavaScript-rendered pages.

- <a href="https://www.npmjs.com/package/research-agent-ui"><img src="https://img.shields.io/npm/dm/research-agent-ui.svg" alt="Monthly Downloads"></a> **research-agent-ui** — The chat research agent UI: conversation window, article reader, search config, file uploads, and chat history, along with the shadcn primitives and icons it depends on. Drops into a Next.js app behind a small config/injection surface for auth, branding, and media-search preferences.

- <a href="https://www.npmjs.com/package/search-web-api"><img src="https://img.shields.io/npm/dm/search-web-api.svg" alt="Monthly Downloads"></a> **search-web-api** — Provides access to 70+ search engines across 10 categories (web, academic, news, images, etc.) plus a scrape/extract API served via a Hono HTTP server. Includes Hugging Face Transformers integration for AI-powered processing.

- **searxng-search-cloudflare** — A deployment configuration for running a private SearXNG metasearch engine proxy in Docker. Aggregates results from multiple search engines without tracking the user, providing a privacy-respecting search backend.

- <a href="https://www.npmjs.com/package/shadcn-app-dock"><img src="https://img.shields.io/npm/dm/shadcn-app-dock.svg" alt="Monthly Downloads"></a> **shadcn-app-dock** — A prop-driven, macOS-style category dock React component with icon magnification on hover and a built-in shadcn theme switcher. Uses Framer Motion for animations and integrates with next-themes for light/dark mode toggling.

- <a href="https://www.npmjs.com/package/shadcn-settings"><img src="https://img.shields.io/npm/dm/shadcn-settings.svg" alt="Monthly Downloads"></a> **shadcn-settings** — A schema-driven settings form renderer built on shadcn/ui. Feed it plain-data field declarations and value/commit callbacks and it renders string, password, textarea, select and switch controls in card, inline or ghost layouts, with custom field types supplied as renderers.

- **language-model-training** — A from-scratch GPT-style transformer implementation built on Tinygrad that trains a next-word-prediction language model with a full Wikipedia pipeline. Ships with a FastAPI control API, Docker Compose orchestration, and a Next.js dashboard for monitoring training jobs.

- <a href="https://www.npmjs.com/package/trending-news-api"><img src="https://img.shields.io/npm/dm/trending-news-api.svg" alt="Monthly Downloads"></a> **trending-news-api** — A React trending-news widget backed by Wikipedia's daily pageviews joined to The News API through a bundled Cloudflare Worker proxy, with a 10-minute client cache.

- <a href="https://www.npmjs.com/package/use-weather-forecast"><img src="https://img.shields.io/npm/dm/use-weather-forecast.svg" alt="Monthly Downloads"></a> **react-weather-forecast** — A React weather forecast widget using Open-Meteo, published as `use-weather-forecast`. Resolves the viewer's location from explicit coordinates, a bundled Cloudflare geo Worker, or IP geolocation.

- <a href="https://www.npmjs.com/package/use-voice-control"><img src="https://img.shields.io/npm/dm/use-voice-control.svg" alt="Monthly Downloads"></a> **use-voice-control** — React voice control with speech transcription, vocalization and interruption (STT/TTS/VAD), plus a CLI that reads Markdown and text files aloud to audio files.

- **user-help-docs** — The user-facing help documentation served at `/docs` in the web app via Fumadocs. Content is inlined at build time so the docs run on Cloudflare Workers, where there is no filesystem to scan.

- <a href="https://www.npmjs.com/package/write-language"><img src="https://img.shields.io/npm/dm/write-language.svg" alt="Monthly Downloads"></a> **write-language** — A multi-provider language generation toolkit using the Vercel AI SDK that generates text responses via 10+ LLM providers including OpenAI, Anthropic, Google, Groq, and more. Provides a unified interface for streaming and non-streaming text generation.
