# chat-agent-toolkit API Reference

## Entry points

| Import path | Resolves to | Notes |
| --- | --- | --- |
| `chat-agent-toolkit` | built `dist/` (`.es.js` / `.cjs.js`, types `dist/types.d.ts`) | Also `export *`s all of `write-language`. |
| `chat-agent-toolkit/connectors` | **`src/connectors/index.ts`** | Raw TypeScript source. |
| `chat-agent-toolkit/<anything>` | **`src/<anything>`** | Raw TypeScript source, `react-server` condition included. |

## Search handlers

`createSearchHandlers(searchFunctions?: Partial<Config>)` returns:

| Handler | `activeEngines` | `rerank` / threshold |
| --- | --- | --- |
| `webSearch` | `[]` (all) | `true` / `0.3` |
| `academicSearch` | `arxiv`, `google scholar`, `pubmed` | `true` / `0` |
| `writingAssistant` | `[]`, empty query generator | `true` / `0` |
| `wolframAlphaSearch` | `wolframalpha` | `false` / `0` |
| `youtubeSearch` | `youtube` | `true` / `0.3` |
| `redditSearch` | `reddit` | `true` / `0.3` |

`searchHandlers` is the zero-argument form and is `@deprecated` — it performs no real
web search because no search functions were injected.

### `Config` (MetaSearchAgent constructor)

Required: `searchWeb`, `rerank`, `rerankThreshold`, `queryGeneratorPrompt`,
`queryGeneratorFewShots`, `responsePrompt`, `activeEngines`.
Injectable implementations (all optional): `getDocumentsFromLinks`, `searchSearxng`,
`searchTavily`, `isTavilyConfigured`, `scrapeURL`.

### `searchAndAnswer(...)`

```ts
searchAndAnswer(
  message: string,
  history: ChatTurnMessage[],          // { role: "user"|"assistant"|"system", content }
  llm: LanguageModel,                  // an AI SDK model, e.g. from createLLMProvider
  optimizationMode: "speed" | "balanced" | "quality",
  fileIds: string[],
  systemInstructions: string,
  category = "general",
  sourceExtractionEnabled = false,
  thinkingTimeLimit = 0,
  queryExpansionPrompt?: string,       // replaces queryGeneratorPrompt when non-blank
  queryExpansionEnabled = false,       // LLM-rephrase the message before searching
): Promise<EventEmitter>
```

Returns an `EventEmitter`; the pipeline starts on the next macrotask so listeners can
be attached first. Data events include `SearchingEvent` (`{ query, category?, status }`),
sources, and streamed response chunks.

Order of work, fastest first: the message is searched **as typed** (no LLM call)
unless `queryExpansionEnabled` is set; `sources` is emitted as soon as the search
returns; only then are the top pages fetched, and only when `sourceExtractionEnabled`
or `thinkingTimeLimit > 0` asks for it. The answer prompt's context is the results'
titles and snippets (or the extracted text, when fetched). With expansion off, URLs
in the message still go to `getDocumentsFromLinks` when one is configured.

## Mastra

| Export | Purpose |
| --- | --- |
| `createMastraAgent(config)`, `createToolAgent(...)`, `MastraAgentConfig` | Agent construction |
| `createMastraInstance(...)`, `loadMastraModel(...)` | Runtime + model routing |
| `createWorkflowStep`, `createResearchWorkflow`, `createRAGWorkflow`, `WorkflowStepConfig` | Workflows |
| `MastraRAG`, `createRAGPipeline`, `RAGConfig`, `RAGDocument`, `RAGChunk`, `RAGRetrievalResult` | RAG |
| `factualityEval`, `relevanceEval`, `coherenceEval`, `toxicityEval`, `runEvalSuite` | Evals |

## Memory

| Export | Purpose |
| --- | --- |
| `MemoryAgent`, `MemoryAgentOptions` | The manager: store, search, summarize |
| `SimpleMemory` | In-process storage (lost on restart) |
| `DrizzleMemoryStorage`, `createMemorySchema` | Drizzle/Postgres persistence |
| `MastraMemoryManager`, `MastraD1MemoryStorage`, `MastraKVMemoryStorage` | Cloudflare Workers persistence |
| `IMemoryStorage` | The interface to implement for a custom backend |
| `MEMORY_CONFIG`, `MEMORY_TYPES`, `MemoryType`, `MemoryRecord`, `MemorySearchOptions`, `MemoryUpdate`, `MemoryContextOptions`, `MemoryMetrics`, `MemoryOptions`, `ExtractedFact` | Types and constants |

## Tools, MCP and connectors

| Export | Purpose |
| --- | --- |
| `AGENT_TOOLS` | QwkSearch tool definitions (this package's version shadows `write-language`'s) |
| `getQwkSearchTools()`, `QwkSearchMCPSession` | QwkSearch tools over MCP |
| `OpenConnectorMCPSession`, `OpenConnectorMastraSession`, `createOpenConnectorSession`, `getOpenConnectorTools`, `createDynamicOpenConnectorAgent`, `createOpenConnectorMastraAgent` | Third-party OAuth/MCP connectors (`/connectors` subpath) |

## Config and models

| Export | Purpose |
| --- | --- |
| `configManager`, `Config`, `ConfigModelProvider`, `MCPServerConfig`, `UIConfigSections` | User configuration |
| `ModelRegistry`, `Model`, `ModelWithProvider`, `getConfiguredModelProviders()`, `getConfiguredModelProviderById(id)` | Configured providers |
| `getModelProvidersUIConfigSection()`, `provider-ui-config` | Settings UI schema |
| `GUEST_SAFE_MODELS`, `FREE_MODELS`, `FREE_TIER_PROVIDERS` | Access tiers |
| `testModel(...)`, `testProviderModels(...)`, `categorizeModelsByType(...)` | Model probing |
| `getEnv(key)` | The only env accessor; returns `undefined` where `process.env` is absent |
| `getSearxngURL()`, `getTavilyApiKey()`, `getSourceScrapeCount()`, `getSourceScrapeTimeout()` | Retrieval settings |

## Document and prompt helpers

`rerankDocs`, `groupAndSummarizeDocs`, `buildFallbackDocs`, `formatChatHistoryAsString`,
`LineOutputParser`, `LineListOutputParser`, `webSearchRetrieverPrompt`,
`webSearchRetrieverFewShots`, `webSearchResponsePrompt`, `writingAssistantPrompt`,
`cropProvider` / `cropProviderAsBlob` / `cropProviderAsDataURL` / `getProviderImage` /
`getProviderNames` (provider logo sprites).
