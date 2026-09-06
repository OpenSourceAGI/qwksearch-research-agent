import {
  AtSign,
  BookOpen,
  Bot,
  Boxes,
  Braces,
  Captions,
  Clock,
  Code,
  Compass,
  Database,
  FileSearch,
  FileText,
  FolderTree,
  Globe,
  GraduationCap,
  Images,
  Keyboard,
  Layers,
  Lock,
  MessageCircleQuestionMark,
  Mic,
  Monitor,
  MousePointerClick,
  Network,
  Newspaper,
  PenLine,
  Puzzle,
  Quote,
  Replace,
  Search,
  Server,
  ShieldCheck,
  Sparkles,
  Terminal,
  Upload,
  Users,
  Video,
  Zap,
} from "lucide-react";

export type Feature = {
  icon: React.ElementType;
  title: string;
  description: string;
};

export type FeatureTab = {
  value: string;
  label: string;
  icon: React.ElementType;
  headline: string;
  blurb: string;
  features: Feature[];
};

/** Headline numbers, all drawn from what the monorepo actually ships. */
export const STATS: { value: number; suffix?: string; label: string }[] = [
  { value: 100, suffix: "+", label: "Sites searched" },
  { value: 13, label: "Search categories" },
  { value: 10, suffix: "+", label: "LLM providers" },
  { value: 4, label: "Ways to run it" },
  { value: 20, suffix: "+", label: "Open packages" },
];

/** Real engine names from `packages/search-web-api/src/sources`. */
export const ENGINE_NAMES = [
  "Google",
  "Bing",
  "Brave",
  "DuckDuckGo",
  "Startpage",
  "Mojeek",
  "Qwant",
  "Yandex",
  "Baidu",
  "arXiv",
  "PubMed",
  "Semantic Scholar",
  "OpenAlex",
  "Crossref",
  "Google Scholar",
  "CORE",
  "DOAJ",
  "Wikidata",
  "Wikipedia",
  "Hacker News",
  "Google News",
  "Reddit",
  "Mastodon",
  "Medium",
  "YouTube",
  "Vimeo",
  "PeerTube",
  "Invidious",
  "Unsplash",
  "Flickr",
  "Pixabay",
  "DeviantArt",
  "GitHub",
  "GitLab",
  "PyPI",
  "crates.io",
  "Docker Hub",
  "Stack Overflow",
  "Open Library",
  "Internet Archive",
  "IMDb",
  "Goodreads",
  "OpenStreetMap",
];

export const SEARCH_CATEGORIES: { label: string; icon: React.ElementType }[] = [
  { label: "Web", icon: Globe },
  { label: "Academic", icon: GraduationCap },
  { label: "News", icon: Newspaper },
  { label: "Videos", icon: Video },
  { label: "Images", icon: Images },
  { label: "Code & IT", icon: Code },
  { label: "Social", icon: AtSign },
  { label: "Files", icon: FileText },
  { label: "Maps", icon: Compass },
  { label: "Specialized", icon: Sparkles },
];

export const PROVIDERS = [
  "OpenAI",
  "Anthropic",
  "Google Gemini",
  "Vertex AI",
  "xAI Grok",
  "Groq",
  "Amazon Bedrock",
  "OpenRouter",
  "Together AI",
  "Ollama",
];

/** The five stages a question passes through, end to end. */
export const PIPELINE: { step: string; title: string; body: string; icon: React.ElementType }[] = [
  {
    step: "01",
    title: "Ask",
    body: "Type, paste a URL, drop a file, or hold to speak. Autocomplete predicts the next word as you go.",
    icon: Search,
  },
  {
    step: "02",
    title: "Search",
    body: "The query fans out across 100+ engines in 13 categories, deduped and ranked by domain authority.",
    icon: Network,
  },
  {
    step: "03",
    title: "Extract",
    body: "Top results are fetched and parsed — PDFs, YouTube transcripts, and JS-rendered pages included.",
    icon: FileSearch,
  },
  {
    step: "04",
    title: "Answer",
    body: "Your chosen model streams a response grounded in the extracted text, with inline citations.",
    icon: Bot,
  },
  {
    step: "05",
    title: "Write",
    body: "Send quotes, sources, and the answer straight into REASON to build the finished document.",
    icon: PenLine,
  },
];

export const FEATURE_TABS: FeatureTab[] = [
  {
    value: "research",
    label: "Research Agent",
    icon: Search,
    headline: "A search engine that reads the results for you",
    blurb:
      "The chat surface aggregates every category of the web, previews each source before you open it, and answers with citations you can check.",
    features: [
      {
        icon: Globe,
        title: "100+ site search",
        description:
          "Web, academic, news, video, image, code, social, maps, files, and specialized engines queried in parallel from one box.",
      },
      {
        icon: BookOpen,
        title: "Article preview & APA citation",
        description:
          "Extract, clean, and summarize any article, PDF, or YouTube video — with a formatted citation — before you commit to reading it.",
      },
      {
        icon: Bot,
        title: "Bring your own model",
        description:
          "Claude, GPT, Gemini, Grok, Llama, and more. Swap providers per conversation, or point it at your own key.",
      },
      {
        icon: Upload,
        title: "Ask your own documents",
        description:
          "Upload PDFs, DOCX, Google Docs, URLs, and YouTube links, then ask questions across all of them at once.",
      },
      {
        icon: Clock,
        title: "History and memory",
        description:
          "Every conversation is saved and searchable, with per-user skills and memories — unless privacy mode is on.",
      },
      {
        icon: MessageCircleQuestionMark,
        title: "Follow-up questions",
        description:
          "Generated next questions keep a thread moving instead of leaving you at a blank prompt.",
      },
      {
        icon: Mic,
        title: "Voice in, voice out",
        description:
          "On-device voice activity detection and Kokoro speech synthesis for hands-free research sessions.",
      },
      {
        icon: Lock,
        title: "Privacy mode",
        description:
          "Turn off history entirely, or self-host the whole stack behind your own SearXNG proxy.",
      },
    ],
  },
  {
    value: "reason",
    label: "REASON Editor",
    icon: PenLine,
    headline: "Where the research becomes a document",
    blurb:
      "A full rich-text editor with a nested document tree, built for annotated summaries in outline notation — not a chat transcript.",
    features: [
      {
        icon: PenLine,
        title: "Rich text, minimal chrome",
        description:
          "A Google Docs–class editor built on Lexical with tables, code blocks, Mermaid diagrams, KaTeX, and slash commands.",
      },
      {
        icon: FolderTree,
        title: "Nested document tree",
        description:
          "Organize notes in a drag-and-drop outline with tabs and custom storage sources.",
      },
      {
        icon: Sparkles,
        title: "AI rewriting",
        description:
          "Rewrite, expand, or tighten any selection in place, using the same providers as the research agent.",
      },
      {
        icon: Quote,
        title: "Research quotes",
        description:
          "Capture key passages from a source with attribution intact and drop them into the outline.",
      },
      {
        icon: FileSearch,
        title: "Full-text search",
        description:
          "Find any document instantly by title or body across your whole tree.",
      },
      {
        icon: Replace,
        title: "Find & replace",
        description:
          "Match highlighting and bulk replace across a document, for when a term changes late.",
      },
      {
        icon: Users,
        title: "Teams & collaboration",
        description:
          "Manage members and access rights, with real-time collaborative editing over Yjs.",
      },
      {
        icon: Layers,
        title: "Import, export, share",
        description:
          "Word, PDF, and Google Docs in and out, plus Formatted, HTML, and Markdown view modes.",
      },
      {
        icon: MousePointerClick,
        title: "Context menu everywhere",
        description:
          "Right-click any node in the tree or the page for the actions that apply to it.",
      },
      {
        icon: Keyboard,
        title: "Keyboard-first",
        description:
          "Shortcuts for navigation, formatting, and document management, in 20+ interface languages.",
      },
    ],
  },
  {
    value: "extract",
    label: "Extraction Engine",
    icon: FileSearch,
    headline: "Tractor, the text extractor",
    blurb:
      "The hard part of research is getting clean text out of the web. These packages do it in Node, the browser, and on Cloudflare Workers with zero runtime dependencies.",
    features: [
      {
        icon: FileText,
        title: "PDF → structured HTML",
        description:
          "extract-pdf turns a URL or ArrayBuffer into tagged HTML: headings, lists, footnotes, and code blocks preserved.",
      },
      {
        icon: Database,
        title: "OCR for scanned documents",
        description:
          "extract-pdf-docling runs IBM's granite-docling model over layout-heavy PDFs, recovering tables, formulas, and charts.",
      },
      {
        icon: Globe,
        title: "Readable web pages",
        description:
          "extract-webpage strips navigation and ads, then outlines what is left into a citable summary.",
      },
      {
        icon: Captions,
        title: "YouTube transcripts",
        description:
          "extract-youtube pulls subtitles as text, SRT, or WebVTT with no headless browser — fast enough for the edge.",
      },
      {
        icon: Zap,
        title: "JS-rendered pages",
        description:
          "render-url-to-html falls back through Cloudflare Browser Rendering, stealth Puppeteer, and JSDOM until the DOM resolves.",
      },
      {
        icon: ShieldCheck,
        title: "Source ranking",
        description:
          "domain-rank scores every result against Tranco and CommonCrawl backlink data, with human-readable labels and favicons.",
      },
    ],
  },
  {
    value: "platform",
    label: "Apps & API",
    icon: Boxes,
    headline: "Same engine, wherever you work",
    blurb:
      "The web app is one client of a documented API. Desktop, browser, editor, and agent clients all speak to it.",
    features: [
      {
        icon: Monitor,
        title: "Desktop app",
        description:
          "A Tauri build that lets you select text anywhere on screen and press ` to search without leaving your workflow.",
      },
      {
        icon: Puzzle,
        title: "Browser extension",
        description:
          "Tab Manager AI organizes, searches, and closes tabs intelligently, backed by the same research agent.",
      },
      {
        icon: Terminal,
        title: "VS Code extension",
        description:
          "Ask cited research questions from an editor sidebar, signed in with your API key or as a guest.",
      },
      {
        icon: Server,
        title: "MCP server",
        description:
          "Expose search, extraction, and memory as Model Context Protocol tools to any MCP-aware agent.",
      },
      {
        icon: Braces,
        title: "Typed API client",
        description:
          "qwksearch-api-client is generated from the OpenAPI spec, so every endpoint arrives fully typed.",
      },
      {
        icon: Boxes,
        title: "Agent toolkit",
        description:
          "chat-agent-toolkit orchestrates providers, tools, and memory over the Vercel AI SDK, Mastra, and MCP.",
      },
    ],
  },
];

export type ComparisonStatus = "yes" | "partial" | "no" | "paid";

export type ComparisonCell = {
  status: ComparisonStatus;
  note?: string;
};

export type ComparisonRow = {
  feature: string;
  /** One cell per entry in COMPARISON_COLUMNS, same order. */
  cells: ComparisonCell[];
};

export const COMPARISON_COLUMNS: {
  name: string;
  detail?: string;
  highlight?: boolean;
}[] = [
  { name: "QwkSearch", highlight: true },
  { name: "Perplexity" },
  { name: "ChatGPT" },
  { name: "Claude" },
  { name: "Google", detail: "Search / Gemini" },
  { name: "Other OSS", detail: "SearXNG, GPT Researcher…" },
];

export const COMPARISON_ROWS: ComparisonRow[] = [
  {
    feature: "Open source",
    cells: [
      { status: "yes", note: "Yes" },
      { status: "no" },
      { status: "no" },
      { status: "no" },
      { status: "no" },
      { status: "yes", note: "Varies" },
    ],
  },
  {
    feature: "Self-hostable (Cloudflare Workers, Docker)",
    cells: [
      { status: "yes", note: "Yes" },
      { status: "no" },
      { status: "no" },
      { status: "no" },
      { status: "no" },
      { status: "yes", note: "Varies" },
    ],
  },
  {
    feature: "Choice of LLM provider",
    cells: [
      { status: "yes", note: "Claude, GPT, Gemini, Grok, Llama & more" },
      { status: "no", note: "Fixed / limited" },
      { status: "no", note: "OpenAI only" },
      { status: "no", note: "Anthropic only" },
      { status: "no", note: "Gemini only" },
      { status: "partial", note: "Varies by project" },
    ],
  },
  {
    feature: "Search coverage",
    cells: [
      {
        status: "yes",
        note: "100+ sites across 13 categories (web, academic, news, video, files, images…)",
      },
      { status: "partial", note: "Web-focused" },
      { status: "partial", note: "Bing-backed, limited" },
      { status: "partial", note: "Web search (beta)" },
      { status: "yes", note: "Broad web index, no AI synthesis by default" },
      { status: "partial", note: "Meta-search only, no built-in AI" },
    ],
  },
  {
    feature: "Cited answers with APA formatting",
    cells: [
      { status: "yes", note: "Built-in citation extraction & formatting" },
      { status: "yes", note: "Yes" },
      { status: "partial", note: "Inconsistent" },
      { status: "partial", note: "Inconsistent" },
      { status: "no" },
      { status: "no" },
    ],
  },
  {
    feature: "PDF / YouTube / DOCX ingestion",
    cells: [
      { status: "yes", note: "With transcript & structure extraction" },
      { status: "partial", note: "PDF only" },
      { status: "partial", note: "Limited" },
      { status: "partial", note: "Limited" },
      { status: "no" },
      { status: "no" },
    ],
  },
  {
    feature: "Research writing / notes editor",
    cells: [
      { status: "yes", note: "Full Lexical-based editor with outline notation (REASON)" },
      { status: "no" },
      { status: "no" },
      { status: "no" },
      { status: "no" },
      { status: "no" },
    ],
  },
  {
    feature: "Browser extension",
    cells: [
      { status: "yes", note: "AI tab manager" },
      { status: "yes", note: "Yes" },
      { status: "partial", note: "Limited" },
      { status: "no" },
      { status: "yes", note: "Yes" },
      { status: "partial", note: "Varies" },
    ],
  },
  {
    feature: "Desktop app",
    cells: [
      { status: "yes", note: "Tauri-based" },
      { status: "yes", note: "Yes" },
      { status: "yes", note: "Yes" },
      { status: "yes", note: "Yes" },
      { status: "no" },
      { status: "partial", note: "Varies" },
    ],
  },
  {
    feature: "Editor / IDE integration",
    cells: [
      { status: "yes", note: "VS Code extension" },
      { status: "no" },
      { status: "partial", note: "Copilot (separate product)" },
      { status: "partial", note: "Claude Code (separate product)" },
      { status: "no" },
      { status: "partial", note: "Varies" },
    ],
  },
  {
    feature: "Privacy mode (no saved history)",
    cells: [
      { status: "yes", note: "Yes" },
      { status: "partial", note: "Limited" },
      { status: "partial", note: "Limited" },
      { status: "partial", note: "Limited" },
      { status: "partial", note: "Limited" },
      { status: "yes", note: "Often, if self-hosted" },
    ],
  },
  {
    feature: "Pricing",
    cells: [
      { status: "yes", note: "Free & open-source, pay-per-use API" },
      { status: "paid", note: "Subscription" },
      { status: "paid", note: "Subscription" },
      { status: "paid", note: "Subscription" },
      { status: "paid", note: "Freemium" },
      { status: "yes", note: "Usually free, self-hosted" },
    ],
  },
];

export const PLATFORMS: {
  icon: React.ElementType;
  name: string;
  tagline: string;
  detail: string;
  href?: string;
}[] = [
  {
    icon: Globe,
    name: "Web",
    tagline: "Next.js on Cloudflare Workers",
    detail: "The full research agent and REASON editor in the browser, no install.",
    href: "/",
  },
  {
    icon: Monitor,
    name: "Desktop",
    tagline: "Tauri",
    detail: "Select text anywhere, press ` , get an answer over whatever you were doing.",
  },
  {
    icon: Puzzle,
    name: "Browser",
    tagline: "Tab Manager AI",
    detail: "An extension that turns a wall of open tabs into an organized reading queue.",
  },
  {
    icon: Terminal,
    name: "Editor",
    tagline: "VS Code",
    detail: "Cited answers in a sidebar, next to the code that raised the question.",
  },
];

export const PACKAGES: { name: string; blurb: string }[] = [
  { name: "search-web-api", blurb: "70+ engines across 13 categories behind one Hono API." },
  { name: "extract-webpage", blurb: "Search, extract, cite, and outline any page." },
  { name: "extract-pdf", blurb: "PDF to structural HTML, zero runtime deps." },
  { name: "extract-youtube", blurb: "Serverless transcript extraction, no browser." },
  { name: "render-url-to-html", blurb: "Stealth rendering strategies for stubborn pages." },
  { name: "chat-agent-toolkit", blurb: "Multi-provider agent loop with tools and memory." },
  { name: "write-language", blurb: "One interface over 10+ LLM providers." },
  { name: "domain-rank", blurb: "Tranco + CommonCrawl authority for any domain." },
  { name: "reason-editor", blurb: "The Lexical editor, documents manager, and outlines." },
  { name: "research-agent-ui", blurb: "The whole chat UI, droppable into any Next.js app." },
  { name: "shadcn-app-dock", blurb: "macOS-style dock with a shadcn theme switcher." },
  { name: "qwksearch-api-client", blurb: "Typed bindings generated from the OpenAPI spec." },
];
