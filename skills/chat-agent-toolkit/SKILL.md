---
name: ask-chat-agent-toolkit
description: Guide to chat-agent-toolkit (packages/chat-agent-toolkit), the agent orchestration layer over write-language — MetaSearchAgent search handlers (webSearch / academicSearch / writingAssistant / youtubeSearch and friends), Mastra agents, workflows, RAG and evals, MCP tool sessions, OpenConnector OAuth sessions, the long-term memory manager with in-memory / Drizzle / D1 / KV storage, and the model + config registries. Use when wiring an agent, adding a tool or MCP server, changing search-and-answer behaviour, debugging memory persistence, or when a re-exported symbol resolves to the wrong package's version.
---

# Working With chat-agent-toolkit

`packages/chat-agent-toolkit`, published as **chat-agent-toolkit**. It composes
`write-language` (generation), `search-web-api`/`extract-webpage` (retrieval) and
Mastra (agents, workflows, RAG) into the research-agent behaviour the web app and the
MCP server both call. Symbol-by-symbol surface: [API.md](API.md).

## Setup

```ts
import { createSearchHandlers, MemoryAgent, createMastraAgent } from "chat-agent-toolkit";
```

The root entry `export *`s `write-language`, so `writeLanguageResponse`,
`LANGUAGE_MODELS` and friends are available from this package too. Where the two
collide — `AGENT_TOOLS` — **this package's version deliberately wins**, because it is
re-exported after the wildcard.

Connectors live behind their own subpath: `chat-agent-toolkit/connectors`. Unlike the
root entry, the `./connectors` and `./*` export conditions point at **`src/*.ts`, not
`dist/`** — they are consumed as source, so a consumer's bundler must be able to
transpile TypeScript from `node_modules`.

## Picking the right call

| You want | Call |
| --- | --- |
| Search-and-answer, cited | `createSearchHandlers(fns).webSearch.searchAndAnswer(...)` |
| Academic sources only | `.academicSearch` — pinned to `arxiv`, `google scholar`, `pubmed`, threshold `0` |
| One-source handlers | `.youtubeSearch`, `.redditSearch`, `.wolframAlphaSearch` |
| Rewrite/continue prose with no retrieval | `.writingAssistant` |
| Your own retrieval mix | `new MetaSearchAgent({ activeEngines, queryGeneratorPrompt, responsePrompt, rerank, rerankThreshold, searchWeb })` |
| A Mastra agent with tools | `createMastraAgent(config)` / `createToolAgent(...)` |
| A multi-step research or RAG pipeline | `createResearchWorkflow(...)`, `createRAGWorkflow(...)`, `createWorkflowStep(...)` |
| Chunk + embed + retrieve | `new MastraRAG(config)` / `createRAGPipeline(config)` |
| Score a generation | `factualityEval`, `relevanceEval`, `coherenceEval`, `toxicityEval`, `runEvalSuite` |
| Remember facts across turns | `new MemoryAgent({ storage })` |
| Persist memory | `SimpleMemory` (RAM), `DrizzleMemoryStorage`, `MastraD1MemoryStorage`, `MastraKVMemoryStorage` |
| QwkSearch tools for an LLM | `AGENT_TOOLS`, or `getQwkSearchTools()` / `new QwkSearchMCPSession(...)` |
| A third-party MCP server's tools | `new OpenConnectorMCPSession(...)`, `getOpenConnectorTools()` |
| Which providers the user configured | `getConfiguredModelProviders()`, `getConfiguredModelProviderById(id)` |
| Rank a doc set against a query | `rerankDocs(...)`, `groupAndSummarizeDocs(...)` |
| Test a model actually answers | `testModel(...)`, `testProviderModels(...)` |

## Recipes

**Wire the search handlers.** `createSearchHandlers(searchFunctions)` takes a partial
`Config` that is spread over every handler, which is how you inject the actual
`searchWeb`/`extractContent` implementations instead of taking the package's defaults.
The bare `searchHandlers` export is the no-argument form and is marked `@deprecated` —
call the factory.

**Add a tool.** Define it in `src/tools/qwksearch-api-tools.ts` (Vercel AI SDK `tool()`
shape) and list its name in the agent prompt's `tools` array — tools are attached to an
agent by being *declared in the prompt template*, not by being passed at the call site.

**Register an MCP server.** `src/config/mcp-server-registry.ts` holds the catalogue;
`listMcpServers`/`addMcpServer` on the API client persist a user's own. `QwkSearchMCPSession`
and `OpenConnectorMCPSession` are stateful — open one, reuse it, close it; do not create
one per tool call.

**Memory.** `MemoryAgent` is storage-agnostic through `IMemoryStorage`. `SimpleMemory`
loses everything on restart and is the default; pick a Drizzle/D1/KV storage explicitly
for anything user-facing. `createMemorySchema` generates the Drizzle table definitions.

**Cloudflare Workers.** Prefer `MastraD1MemoryStorage`/`MastraKVMemoryStorage` and pass
bindings in; `getEnv(key)` is the only env accessor in this package and it degrades to
`undefined` rather than throwing when `process.env` does not exist.

## Troubleshooting

| Symptom | Cause → fix |
| --- | --- |
| `AGENT_TOOLS` has the wrong entries | Both this package and `write-language` export the name. Import from the package you actually mean, or use the explicit `chat-agent-toolkit` re-export. |
| Bundler chokes on TypeScript from `node_modules` | The `./connectors` and `./*` subpaths resolve to `src/*.ts` on purpose. Transpile the package, or import the root entry (which is built `dist/`). |
| Search returns nothing but no error | `MetaSearchAgent` catches and logs retrieval failures and returns empty results. `activeEngines: []` means "all". |
| An `activeEngines` name matches nothing | Those are **SearXNG** engine names (spaces: `"google scholar"`), passed through to the injected `searchSearxng`. They are *not* `search-web-api`'s `ALL_ENGINES` keys (underscores: `google_scholar`), and `wolframalpha` exists only on the SearXNG side. |
| Tavily never gets used | The Tavily branch only fires when Tavily is configured **and** `activeEngines` is empty **and** the category is `general` — so every single-source handler skips it by design. |
| Reranking drops everything | `rerankThreshold` is a cosine cutoff — `webSearch` uses `0.3`, `academicSearch` uses `0` for exactly this reason. Lower it before assuming retrieval failed. |
| Memory is empty after a restart | You are on `SimpleMemory` (in-process). Construct `MemoryAgent` with a persistent storage. |
| Mastra agent ignores a tool | The tool must be named in the agent prompt's `tools` list; passing it to the constructor alone is not enough. |
| `loadMastraModel` / `createMastraInstance` fails on a valid model id | Model routing goes through the registry in `src/config/`; an id missing from `LANGUAGE_MODELS` has no provider mapping. Add it there. |
| Guest/free-tier users get a paid model | Gate on the exported `GUEST_SAFE_MODELS`, `FREE_MODELS`, `FREE_TIER_PROVIDERS` sets rather than an ad-hoc allowlist. |
| A build OOMs | Use the package's own `bun run make` (`NODE_OPTIONS=--max-old-space-size=15192 vite build`) rather than plain `vite build`. |
