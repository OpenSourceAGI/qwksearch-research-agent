
## 📦 Packages

- **chat-agent-toolkit** — A multi-provider AI agent toolkit that generates language responses, searches the web, extracts content, and manages memory across 10+ LLM providers. It integrates the Vercel AI SDK, Mastra framework, and MCP protocol to orchestrate research agent workflows.
  <a href="https://www.npmjs.com/package/chat-agent-toolkit"><img src="https://img.shields.io/npm/dm/chat-agent-toolkit.svg" alt="Monthly Downloads"></a>

- **domain-rank** — Looks up top-ranked domains from the Tranco List and CommonCrawl backlink data to retrieve their human-readable source label, influence rank, and favicon. Useful for search/URL autocomplete, bookmark launchers, and domain reputation scoring.
  <a href="https://www.npmjs.com/package/domain-rank"><img src="https://img.shields.io/npm/dm/domain-rank.svg" alt="Monthly Downloads"></a>

- **extract-pdf** — Converts a PDF from a URL or ArrayBuffer into clean HTML with structural tagging including headings, lists, footnotes, and code blocks. Slim by default — PDF.js loads at runtime from the pdfjs-serverless CDN build — with optional OCR via IBM's granite-docling-258M model: run all pages through the frontend JS parser, all through Docling, hybrid (a regex scan flags pages with infographics/tables and OCRs only those), or point at the URL of another docling-compatible processor. Ships the Hono HTTP OCR service in its `server/` folder. Works in Node.js, Cloudflare Workers, and browser environments.
  <a href="https://www.npmjs.com/package/extract-pdf"><img src="https://img.shields.io/npm/dm/extract-pdf.svg" alt="Monthly Downloads"></a>

- **extract-webpage** — Searches, extracts, cites, and outlines web content for a topic using an AI Research Agent. Combines PDF extraction, YouTube transcript extraction, DOM parsing, and LLM-based summarization to produce structured content from arbitrary web pages.
  <a href="https://www.npmjs.com/package/extract-webpage"><img src="https://img.shields.io/npm/dm/extract-webpage.svg" alt="Monthly Downloads"></a>

- **extract-youtube** — A fast, no-browser, serverless-optimized YouTube transcript extractor that fetches subtitles and captions without requiring a headless browser. Supports multiple output formats (SRT, WebVTT) and runs on edge/serverless platforms.
  <a href="https://www.npmjs.com/package/extract-youtube"><img src="https://img.shields.io/npm/dm/extract-youtube.svg" alt="Monthly Downloads"></a>

- **notebooklm-api-client** — Placeholder package for a future API client for Google's NotebookLM service.
  <a href="https://www.npmjs.com/package/notebooklm-api-client"><img src="https://img.shields.io/npm/dm/notebooklm-api-client.svg" alt="Monthly Downloads"></a>

- **qwksearch-api-client** — An auto-generated TypeScript API client for the QwkSearch platform, built from an OpenAPI specification. Provides typed fetch-based bindings for interacting with the QwkSearch backend API.
  <a href="https://www.npmjs.com/package/qwksearch-api-client"><img src="https://img.shields.io/npm/dm/qwksearch-api-client.svg" alt="Monthly Downloads"></a>

- **reason-editor** — A formatted text editor built on Lexical (React) with a toolbar, documents manager, and note outlines. Includes drag-and-drop, collaborative editing via Yjs, file management, and rich UI components for a full-featured writing/research interface.
  <a href="https://www.npmjs.com/package/reason-editor"><img src="https://img.shields.io/npm/dm/reason-editor.svg" alt="Monthly Downloads"></a>

- **render-url-to-html** — A collection of URL-to-HTML rendering strategies using Cloudflare Browser Rendering, Puppeteer with stealth plugins, and JSDOM. Fetches URLs and returns fully-rendered DOM as HTML, capable of bypassing bot-detection on JavaScript-rendered pages.

- **research-agent-ui** — The chat research agent UI: conversation window, article reader, search config, file uploads, and chat history, along with the shadcn primitives and icons it depends on. Drops into a Next.js app behind a small config/injection surface for auth, branding, and media-search preferences.
  <a href="https://www.npmjs.com/package/research-agent-ui"><img src="https://img.shields.io/npm/dm/research-agent-ui.svg" alt="Monthly Downloads"></a>

- **search-web-api** — Provides access to 70+ search engines across 10 categories (web, academic, news, images, etc.) plus a scrape/extract API served via a Hono HTTP server. Includes Hugging Face Transformers integration for AI-powered processing.
  <a href="https://www.npmjs.com/package/search-web-api"><img src="https://img.shields.io/npm/dm/search-web-api.svg" alt="Monthly Downloads"></a>

- **searxng-search-cloudflare** — A deployment configuration for running a private SearXNG metasearch engine proxy in Docker. Aggregates results from multiple search engines without tracking the user, providing a privacy-respecting search backend.

- **shadcn-app-dock** — A prop-driven, macOS-style category dock React component with icon magnification on hover and a built-in shadcn theme switcher. Uses Framer Motion for animations and integrates with next-themes for light/dark mode toggling.
  <a href="https://www.npmjs.com/package/shadcn-app-dock"><img src="https://img.shields.io/npm/dm/shadcn-app-dock.svg" alt="Monthly Downloads"></a>

- **language-model-training** — A from-scratch GPT-style transformer implementation built on Tinygrad that trains a next-word-prediction language model with a full Wikipedia pipeline. Ships with a FastAPI control API, Docker Compose orchestration, and a Next.js dashboard for monitoring training jobs.

- **write-language** — A multi-provider language generation toolkit using the Vercel AI SDK that generates text responses via 10+ LLM providers including OpenAI, Anthropic, Google, Groq, and more. Provides a unified interface for streaming and non-streaming text generation.
  <a href="https://www.npmjs.com/package/write-language"><img src="https://img.shields.io/npm/dm/write-language.svg" alt="Monthly Downloads"></a>
