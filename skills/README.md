# Skills

One [Agent Skill](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/overview)
per package in this monorepo, in the same shape as
[dev-tools-starter-agent](https://github.com/OpenSourceAGI/dev-tools-starter-agent/tree/master/skills):
a `SKILL.md` with setup, the calls worth knowing, recipes, and a troubleshooting table —
plus an `API.md` for the packages with a large enough surface to warrant one.

Each skill is written from the package's source, not just its README, so the
troubleshooting rows cover the real gotchas (options that are returned rather than
thrown, exports that live on a subpath and resolve to raw TypeScript, engine names that
differ between two layers, scripts pointing at files that were renamed).

Start with [ask-qwksearch-monorepo](./ask-qwksearch-monorepo/SKILL.md) when you don't yet
know which layer owns the behaviour — it maps every package and app, and covers the four
product shells and the collaboration server, which have no package skill of their own.

## Install

All of them:

```bash
npx skills@latest add https://github.com/OpenSourceAGI/qwksearch-research-agent
```

Just one:

```bash
npx skills@latest add https://github.com/OpenSourceAGI/qwksearch-research-agent --skill ask-search-web-api
```

## Reference

### Orientation

| Skill | Covers |
| --- | --- |
| [ask-qwksearch-monorepo](./ask-qwksearch-monorepo/SKILL.md) | Which layer owns what, bun/turbo commands, the workspace build-order trap, and the web / desktop / extension / VS Code / collaboration apps |

### AI and generation

| Skill | Package | Covers |
| --- | --- | --- |
| [ask-write-language](./ask-write-language/SKILL.md) | `write-language` | `writeLanguageResponse`, prompt templates, the model registry, packed provider keys |
| [ask-chat-agent-toolkit](./ask-chat-agent-toolkit/SKILL.md) | `chat-agent-toolkit` | Search handlers, Mastra agents/workflows/RAG/evals, MCP sessions, long-term memory |
| [ask-language-model-training](./ask-language-model-training/SKILL.md) | `language-model-training` | GPT-on-Tinygrad, the Wikipedia pipeline, the FastAPI control API, Vast.ai GPUs |

### Search, extraction and rendering

| Skill | Package | Covers |
| --- | --- | --- |
| [ask-search-web-api](./ask-search-web-api/SKILL.md) | `search-web-api` | The `Search` class, 71 engine adapters, dedupe and scoring, autocomplete |
| [ask-searxng-search](./ask-searxng-search/SKILL.md) | `searxng-search-cloudflare` | A private SearXNG instance: settings, JSON output, engine flags |
| [ask-extract-webpage](./ask-extract-webpage/SKILL.md) | `extract-webpage` | URL → cited article, scraping, Readability/Mercury, SEEKTOPIC, tokenizers |
| [ask-extract-pdf](./ask-extract-pdf/SKILL.md) | `extract-pdf` | PDF → structured HTML, the `method`/`processor` switches, Docling OCR |
| [ask-extract-youtube](./ask-extract-youtube/SKILL.md) | `extract-youtube` | Transcripts without a browser, proxies for IP bans, formatters, the CLI |
| [ask-domain-rank](./ask-domain-rank/SKILL.md) | `domain-rank` | Offline domain rank, source titles, favicons, URL parsing |
| [ask-render-url-to-html](./ask-render-url-to-html/SKILL.md) | `render-url-to-html` | Self-hosted Puppeteer-stealth and JSDOM renderers |
| [ask-html-renderer-api](./ask-html-renderer-api/SKILL.md) | `html-renderer-api` | The Cloudflare rendering Worker: sessions, cookies, challenge bypass |

### Finance

| Skill | Package | Covers |
| --- | --- | --- |
| [ask-investing](./ask-investing/SKILL.md) | `investing` | Alpaca, stock data, Polymarket sync, LangGraph debate agents, and the merged PredictOS prediction-market core |

### Clients and servers

| Skill | Package | Covers |
| --- | --- | --- |
| [ask-qwksearch-api-client](./ask-qwksearch-api-client/SKILL.md) | `qwksearch-api-client` | The 85 generated SDK functions, baseUrl resolution, regeneration |
| [ask-qwksearch-mcp-server](./ask-qwksearch-mcp-server/SKILL.md) | `qwksearch-mcp-server` | `web_search`, `extract_page`, `render_page_with_javascript` over stdio |
| [ask-notebooklm-client](./ask-notebooklm-client/SKILL.md) | `notebooklm-api-client` | Worker + Container bridge to NotebookLM, and its Puppeteer login |

### UI

| Skill | Package | Covers |
| --- | --- | --- |
| [ask-research-agent-ui](./ask-research-agent-ui/SKILL.md) | `research-agent-ui` | The chat/search UI, the two entry points, providers, API handler factories |
| [ask-reason-editor](./ask-reason-editor/SKILL.md) | `react-reason-editor` | The document editor: Plate vs Tiptap, `ReasonDocs`, 59 extensions, locales |
| [ask-reason-editor-sidebar](./ask-reason-editor-sidebar/SKILL.md) | `react-reason-editor-sidebar` | File tree, open tabs, outline, split view, file-source backends |
| [ask-shadcn-app-dock](./ask-shadcn-app-dock/SKILL.md) | `shadcn-app-dock` | The dock, its dropdown render prop, the shadcn theme switcher |
| [ask-shadcn-settings](./ask-shadcn-settings/SKILL.md) | `shadcn-settings` | Schema-driven settings forms and custom field renderers |
| [ask-use-voice-control](./ask-use-voice-control/SKILL.md) | `use-voice-control` | TTS/STT/read-aloud, the five subpath entries, the CLI |
| [ask-weather-forecast](./ask-weather-forecast/SKILL.md) | `use-weather-forecast` | Open-Meteo widget, location resolution, the geo Worker |
| [ask-trending-news](./ask-trending-news/SKILL.md) | `trending-news-api` | Trending widget and the Wikipedia-pageviews Worker |
| [ask-user-help-docs](./ask-user-help-docs/SKILL.md) | `user-help-docs` | The Fumadocs `/docs` site, its Workers-safe content pipeline |
| [ask-legal-terms-privacy-policy](./ask-legal-terms-privacy-policy/SKILL.md) | `legal-terms-privacy-policy` | The shared terms and privacy page, its full/summary switch and raw-TS exports |

## Adding a skill for a new package

Create `skills/ask-<name>/SKILL.md` with YAML frontmatter — `name` matching the
directory, and a `description` that names the package and its path, lists what the skill
covers, and ends with a `Use when …` clause naming concrete symptoms. That description is
the only thing an agent sees when deciding whether to load the skill, so it does the
triggering work. Keep the body to setup → which call to reach for → recipes → a
symptom/cause/fix table, and split exhaustive option, export or prop tables into
`API.md`. Add the package to the table above and to the map in
[ask-qwksearch-monorepo](./ask-qwksearch-monorepo/SKILL.md).
