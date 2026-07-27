## 📦 Packages

- **chat-agent-toolkit** — A multi-provider AI agent toolkit that generates language responses, searches the web, extracts content, and manages memory across 10+ LLM providers. It integrates the Vercel AI SDK, Mastra framework, and MCP protocol to orchestrate research agent workflows.

- **domain-rank** — Looks up top-ranked domains from the Tranco List and CommonCrawl backlink data to retrieve their human-readable source label, influence rank, and favicon. Useful for search/URL autocomplete, bookmark launchers, and domain reputation scoring.

- **extract-pdf** — Converts a PDF from a URL or ArrayBuffer into clean HTML with structural tagging including headings, lists, footnotes, and code blocks. Works in Node.js, Cloudflare Workers, and browser environments with zero runtime dependencies.

- **extract-pdf-docling** — Converts PDF documents to HTML using IBM's granite-docling-258M AI model via Hugging Face Transformers, preserving layout and structure through OCR. Supports recognition of code, formulas, tables, lists, charts, and figures via a Hono-based HTTP API.

- **extract-webpage** — Searches, extracts, cites, and outlines web content for a topic using an AI Research Agent. Combines PDF extraction, YouTube transcript extraction, DOM parsing, and LLM-based summarization to produce structured content from arbitrary web pages.

- **extract-youtube** — A fast, no-browser, serverless-optimized YouTube transcript extractor that fetches subtitles and captions without requiring a headless browser. Supports multiple output formats (SRT, WebVTT) and runs on edge/serverless platforms.

- **notebooklm-api-client** — Placeholder package for a future API client for Google's NotebookLM service.

- **qwksearch-api-client** — An auto-generated TypeScript API client for the QwkSearch platform, built from an OpenAPI specification. Provides typed fetch-based bindings for interacting with the QwkSearch backend API.

- **reason-editor** — A formatted text editor built on Lexical (React) with a toolbar, documents manager, and note outlines. Includes drag-and-drop, collaborative editing via Yjs, file management, and rich UI components for a full-featured writing/research interface.

- **render-url-to-html** — A collection of URL-to-HTML rendering strategies using Cloudflare Browser Rendering, Puppeteer with stealth plugins, and JSDOM. Fetches URLs and returns fully-rendered DOM as HTML, capable of bypassing bot-detection on JavaScript-rendered pages.

- **research-agent-ui** — The chat research agent UI: conversation window, article reader, search config, file uploads, and chat history, along with the shadcn primitives and icons it depends on. Drops into a Next.js app behind a small config/injection surface for auth, branding, and media-search preferences.

- **search-web-api** — Provides access to 70+ search engines across 10 categories (web, academic, news, images, etc.) plus a scrape/extract API served via a Hono HTTP server. Includes Hugging Face Transformers integration for AI-powered processing.

- **searxng-search-cloudflare** — A deployment configuration for running a private SearXNG metasearch engine proxy in Docker. Aggregates results from multiple search engines without tracking the user, providing a privacy-respecting search backend.

- **shadcn-app-dock** — A prop-driven, macOS-style category dock React component with icon magnification on hover and a built-in shadcn theme switcher. Uses Framer Motion for animations and integrates with next-themes for light/dark mode toggling.

- **language-model-training** — A from-scratch GPT-style transformer implementation built on Tinygrad that trains a next-word-prediction language model with a full Wikipedia pipeline. Ships with a FastAPI control API, Docker Compose orchestration, and a Next.js dashboard for monitoring training jobs.

- **write-language** — A multi-provider language generation toolkit using the Vercel AI SDK that generates text responses via 10+ LLM providers including OpenAI, Anthropic, Google, Groq, and more. Provides a unified interface for streaming and non-streaming text generation.
