5# agent-toolkit


Multi-provider AI agent toolkit for generating language responses, searching the web, extracting page content, and managing long-term memory across 10+ LLM providers.

Built on top of the [Vercel AI SDK](https://sdk.vercel.ai), with a small registry of pre-tuned agent prompts (research, summarization, citation answering, query resolution, knowledge-graph extraction, etc.) and tool wrappers around the [QwkSearch](https://qwksearch.com) API.

## Language Intelligence Providers

| Provider               | 🌍  | Top Model (Others)                            | 🏆 Benchmarks                                                         | 📄 Docs                                                                                               | 🔑 Keys                                                                                            | 💰 Funding   |
| ---------------------- | --- | --------------------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------ |
| **Anthropic**          | 🇺🇸  | Claude Mythos / Opus  (Sonnet, Haiku)         | 🥇 GPQA Diamond 94.6% · 🥇 SWE-bench 93.9% · 🧬 PhD reasoning         | [Docs](https://docs.anthropic.com/en/docs/welcome)                                                    | [Keys](https://console.anthropic.com/settings/keys)                                                | ~$60B        |
| **OpenAI**             | 🇺🇸  | GPT / o3 / Codex (o1, o4, o4-mini, gpt-4o)    | 🥇 AIME 2025 100% · 🥇 SWE-bench Pro · 📚 MMLU-Pro 90%                | [Docs](https://platform.openai.com/docs/overview)                                                     | [Keys](https://platform.openai.com/api-keys)                                                       | ~$180B       |
| **Google**      | 🇺🇸  | Gemini Pro (Flash, Flash-Lite, Gemma)         | 🥇 GPQA 94.1% · 🥇 LiveCodeBench Elo 2439 · 🌐 #1 in 6/13 Vals        | [Docs](https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models)                            | [Keys](https://cloud.google.com/vertex-ai/generative-ai/docs/start/express-mode/overview#api-keys) | Public       |
| **xAI**                | 🇺🇸  | Grok Heavy (Grok-3, Grok Vision)              | 🥇 AIME 2025 100% · 🧮 Math competition · ⚡ X integration            | [Docs](https://docs.x.ai/docs#models)                                                                 | [Keys](https://console.x.ai/)                                                                      | ~$45B        |
| **Meta**               | 🇺🇸  | Llama Maverick / Scout (Llama 3.x, CodeLlama) | 🥇 DocVQA 94.4% · 🥇 10M token context · 📊 ChartQA 90%               | [Docs](https://www.llama.com/docs/overview/)                                                          | [Keys](https://www.llama.com/llama-downloads/)                                                     | Public       |
| **NVIDIA**             | 🇺🇸  | Nemotron-Cascade  (Llama Nemotron, Kimi)      | 🥇 LCB v6 87.2% · 🏅 IMO+IOI+ICPC gold · 🧮 AIME 98.6%                | [Docs](https://docs.api.nvidia.com/nim/reference/llm-apis)                                            | [Keys](https://build.nvidia.com/settings/api-keys)                                                 | Public       |
| **Perplexity**      | 🇺🇸  | Sonar Reasoning Pro (Sonar Deep Research)     | 🥇 Search Arena · 🔍 #1 web-grounded QA · 🌐 Real-time retrieval      | [Docs](https://docs.perplexity.ai/models/model-cards)                                                 | [Keys](https://www.perplexity.ai/account/api/keys)                                                 | ~$1B         |
| **Groq**               | 🇺🇸  | (Llama, DeepSeek, Gemma, Mistral, Qwen)       | ⚡ #1 inference speed · 🏎️ Fastest TTFT · 🔧 LPU hardware             | [Docs](https://console.groq.com/docs/overview)                                                        | [Keys](https://console.groq.com/keys)                                                              | ~$640M       |
| **Mistral**         | 🇫🇷  | Mistral Large  (Small 4, Codestral, Devstral) | 🥈 Arena Elo 1418 · 🌍 Multilingual MMLU 85.5% · 🚀 Fastest TTFT      | [Docs](https://docs.mistral.ai/)                                                                      | [Keys](https://console.mistral.ai/api-keys/)                                                       | ~$3.1B       |
| **Together**        | 🇺🇸  | (Llama, Mistral, Gemma, Qwen, DeepSeek)       | 🏗️ Widest open hosting · 💸 Best open-source pricing · 🔧 Fine-tuning | [Docs](https://docs.together.ai/docs/quickstart)                                                      | [Keys](https://api.together.xyz/settings/api-keys)                                                 | ~$225M       |
| **Moonshot** | 🇨🇳  | Kimi Reasoning (K2.6, K2)                     | 🥇 AIME open 96.1% · 🥇 MATH-500 98% · 🥇 HumanEval 99%               | [Docs](https://platform.moonshot.cn/docs)                                                             | [Keys](https://platform.moonshot.cn/console/api-keys)                                              | ~$3.9B       |
| **Zhipu**     | 🇨🇳  | GLM Reasoning / GLM-4.7 (GLM-4V, CogView)     | 🥇 Chatbot Arena Elo 1451 · 🥇 MMLU 96% · 🧮 AIME 95.7%               | [Docs](https://bigmodel.cn/dev/api)                                                                   | [Keys](https://bigmodel.cn/usercenter/apikeys)                                                     | ~$1.8B       |
| **Alibaba**     | 🇨🇳  | Qwen-Coder / Qwen  (Qwen-VL, Qwen-Audio)      | 🥇 Codeforces Elo 2056 · 💻 SWE-bench 69.6% · 🏎️ LCB 70.7%            | [Docs](https://www.alibabacloud.com/help/en/model-studio/developer-reference/use-qwen-by-calling-api) | [Keys](https://bailian.console.aliyun.com/?apiKey=1)                                               | Public       |
| **DeepSeek**           | 🇨🇳  | DeepSeek (DeepSeek-Coder, DeepSeek-VL)        | 🥇 IMO gold (open) · 📚 MMLU-Pro 81.2 · 🧮 AIME 87.5%                 | [Docs](https://api-docs.deepseek.com/)                                                                | [Keys](https://platform.deepseek.com/api_keys)                                                     | Bootstrapped |
| **Cloudflare**         | 🇺🇸  | (Llama, Mistral, Gemma, Qwen, DeepSeek)       | 🌐 Edge inference · ⚡ Serverless CDN scale · 🔒 Privacy-first        | [Docs](https://developers.cloudflare.com/workers-ai/)                                                 | [Keys](https://dash.cloudflare.com/profile/api-tokens)                                             | Public       |
| **Ollama**             | 🇺🇸  | (Llama, Mistral, Gemma, Qwen, DeepSeek)       | 🖥️ #1 local inference · 🔒 Fully offline · 🆓 Free self-hosted        | [Docs](https://ollama.com/docs)                                                                       | [Keys](https://ollama.com/settings/keys)                                                           | ~$20M        |

## Amazon Bedrock Provider

Use Vercel AI SDK's official Bedrock provider: install `@ai-sdk/amazon-bedrock`, configure AWS auth, then call `bedrock('model-id')` in `generateText` or `streamText`. [ai-sdk](https://ai-sdk.dev/providers/ai-sdk-providers/amazon-bedrock)

### Install

- Run `pnpm add ai @ai-sdk/amazon-bedrock` or the npm/yarn equivalent. [vercel](https://vercel.com/changelog/amazon-bedrock-provider-for-the-vercel-ai-sdk-now-available)
- Import either `bedrock` directly or `createAmazonBedrock` for custom config. [ai-sdk](https://ai-sdk.dev/providers/ai-sdk-providers/amazon-bedrock)

### Env setup

- Simplest path: set `AWS_BEARER_TOKEN_BEDROCK` with a Bedrock API key; the docs say API key auth is the recommended method. [ai-sdk](https://ai-sdk.dev/providers/ai-sdk-providers/amazon-bedrock)
- SigV4 also works with `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `AWS_REGION`, and the provider can also use the AWS credential chain. [ai-sdk](https://ai-sdk.dev/providers/ai-sdk-providers/amazon-bedrock)

### Minimal example

```ts
import { generateText } from 'ai';
import { bedrock } from '@ai-sdk/amazon-bedrock';

const { text } = await generateText({
  model: bedrock('anthropic.claude-3-haiku-20240307-v1:0'),
  prompt: 'Explain Bedrock in one sentence.',
});

console.log(text);
```

### Custom region

```ts
import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock';

export const amazonBedrock = createAmazonBedrock({
  region: 'us-east-1',
  apiKey: process.env.AWS_BEARER_TOKEN_BEDROCK,
});
```

### Notes

- You must enable model access in the AWS Bedrock console first; access is not granted by default. [ai-sdk](https://ai-sdk.dev/providers/ai-sdk-providers/amazon-bedrock)
- `streamText` is supported too, and Bedrock-specific options like guardrails can be passed via `providerOptions.bedrock`. [ai-sdk](https://ai-sdk.dev/providers/ai-sdk-providers/amazon-bedrock)

## Install

```bash
npm install ai-research-agent
```

## Quick start

```ts
import { writeLanguageResponse } from "ai-research-agent";

const response = await writeLanguageResponse({
  provider: "groq",
  apiKey: process.env.GROQ_API_KEY,
  agent: "question",
  query: "Explain transformer attention in two sentences.",
});

console.log(response.content);
```

`response.content` is HTML by default (set `html: false` for raw Markdown). Agents that define an `after` hook also return parsed data on `response.extract`.

### Using Amazon Bedrock

```ts
import { writeLanguageResponse } from "ai-research-agent";

const response = await writeLanguageResponse({
  provider: "amazon",
  apiKey: process.env.AWS_BEARER_TOKEN_BEDROCK, // or "region:accessKeyId:secretAccessKey"
  model: "anthropic.claude-3-5-sonnet-20241022-v2:0",
  agent: "question",
  query: "Explain transformer attention in two sentences.",
});

console.log(response.content);
```

## Supported providers

| Provider        | ID           | Default model                                   | Notes                                             |
| --------------- | ------------ | ----------------------------------------------- | ------------------------------------------------- |
| Anthropic       | `anthropic`  | `claude-3-7-sonnet-20250219`                    |                                                   |
| OpenAI          | `openai`     | `gpt-4o`                                        |                                                   |
| Groq            | `groq`       | `meta-llama/llama-4-maverick-17b-128e-instruct` |                                                   |
| Google Vertex   | `google`     | Gemini 2.x                                      |                                                   |
| XAI             | `xai`        | `grok-beta`                                     |                                                   |
| Amazon Bedrock  | `amazon`     | `anthropic.claude-3-5-sonnet-20241022-v2:0`     | apiKey = bearer token or `region:key:secret`     |
| Cloudflare      | `cloudflare` | `llama-4-scout-17b-16e-instruct`                | apiKey =`token:accountId`                         |
| Together AI     | `togetherai` | `meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo`   |                                                   |
| Perplexity      | `perplexity` | `sonar`                                         |                                                   |
| NVIDIA NIM      | `nvidia`     | `moonshotai/kimi-k2.5`                          |                                                   |
| Ollama          | `ollama`     | `llama3.2`                                      | Local — no key required                           |

The full registry (including context lengths) is exported as `LANGUAGE_MODELS`.

## Built-in agents

The `agent` option selects a prompt template from [`AGENT_PROMPTS`](src/agents/agent-prompts.ts):

- `question` — general-purpose Q&A with chat history.
- `question-research-engine` — long-form, journalistic, citation-style answer.
- `query-resolution` — rephrases a follow-up question into standalone search queries.
- `query-resolution-search` — classifies a query and proposes search categories as JSON.
- `summarize`, `summarize-bullets`, `summary-longtext` — single-shot and reduce-style summarization.
- `answer-cite-sources` — answers a query against a `{context}` block with `[n]` citations.
- `suggest-followups` — emits 4–5 follow-up questions inside `<suggestions>` tags.
- `remember-user` — extracts factual user memories as structured JSON.
- `knowledge-graph-nodes` — builds a temporal knowledge graph from a document.
- `results-relevance-filter` — picks the most relevant URLs from a search result list.

Templates use `{variableName}` placeholders that are filled from the options object (`query`, `article`, `chat_history`, `context`, etc.).

## Agent tools

`AGENT_TOOLS` registers callable tools that the ReAct agent attaches automatically when a prompt declares them in its `tools` array:

- `web_search` — QwkSearch metasearch over 100+ engines.
- `extract_page` — Mozilla Readability + Mercury extraction with PDF and YouTube support.
- `generate_ai_response` — proxy to QwkSearch's hosted `/language` endpoint.

Set `QWKSEARCH_URL` and `QWKSEARCH_API_KEY` in the environment, or pass `baseURL`/`apiKey` per-call.

## Memory

```ts
import {
  SimpleMemory,
  MemoryAgent,
  DrizzleMemoryStorage,
} from "ai-research-agent";
```

- `SimpleMemory` — in-memory store implementing `IMemoryStorage`.
- `DrizzleMemoryStorage` — Drizzle ORM-backed persistence; pair with `createMemorySchema()`.
- `MemoryAgent` — high-level wrapper that uses the `remember-user` agent to extract facts from chat turns and writes them to a storage backend.

See [src/memory/README.md](src/memory/README.md) and [src/memory/ARCHITECTURE.md](src/memory/ARCHITECTURE.md) for details.

## Package layout

```
src/
  agents/                    # prompt + tool registry, generate function, model list
    agent-prompts.ts         # AGENT_PROMPTS, extractJSONFromLanguageReply
    agent-tools.ts           # AGENT_TOOLS (web_search, extract_page, ...)
    generate-language.ts     # writeLanguageResponse — main entry point
    generate-language-types.ts
    language-model-names.ts  # LANGUAGE_MODELS, LANGUAGE_PROVIDERS
    llm-providers.ts         # createLLMProvider — chat-model factory
    index.ts                 # barrel export
  memory/                    # SimpleMemory, MemoryAgent, Drizzle storage
  providers/                 # alternate provider abstractions (model registry)
  utils/                     # markdown-to-html, document helpers
  index.ts                   # public entry — re-exports agents + memory
```

## Build

```bash
npm run build      # vite build
npm run make       # clean + build with extra heap
npm run test       # vitest
```

Vite bundles ES + CJS targets to `dist/`, emits `.d.ts` files alongside, and applies a `fs/promises` polyfill so the bundle works in browser and edge runtimes (Cloudflare Workers, Vercel Edge).

## Resources

### Documentation & Guides
- [Vercel AI SDK generateText docs](https://sdk.vercel.ai/docs/reference/ai-sdk-core/generate-text)
- [Hugging Face tutorials](https://huggingface.co/learn)
- [Illustrated Transformer](https://jalammar.github.io/illustrated-transformer/)
- [Building a Transformer with PyTorch](https://www.datacamp.com/tutorial/building-a-transformer-with-py-torch)
- [LLM training example](https://github.com/vtempest/ai-research-agent/blob/master/packages/neural-net/src/train/predict-next-word.js)

### Transformer Architecture Visualizations

<img src="https://i.imgur.com/uW6E9VJ.gif"  alt="Transformer architecture visualization" />


## Alternative Agents Frameworks

| # | Framework | Features | Stars | Language | Maker |
|---:|---|---|---:|---|---|
| 1 | [Hermes Agent](https://github.com/NousResearch/hermes-agent) | Self-improving agent with a built-in learning loop; distills reusable skills from past runs, persists experience across sessions, "grows with you" over time | 211k | Python | Nous Research |
| 2 | [AutoGPT](https://github.com/Significant-Gravitas/AutoGPT) | One of the original autonomous agents; goal-driven loop that self-prompts to decompose and execute tasks. Now a low-code platform: visual block-based builder, deploy/run continuous agents, and an agent marketplace | 185k | Python/TypeScript | Significant Gravitas |
| 3 | [n8n](https://github.com/n8n-io/n8n) | Workflow automation, native AI features, 400+ integrations, visual/code hybrid | 175k | TypeScript | n8n.io |
| 4 | [LangChain / LangGraph](https://github.com/langchain-ai/langchain) | Full ecosystem: LangChain for chains/model+tool abstractions, [LangGraph](https://github.com/langchain-ai/langgraph) (36.7k) for graph-native orchestration with explicit state, branching, loops, checkpoints, human-in-the-loop, durable execution, streaming; [LangGraphJS](https://github.com/langchain-ai/langgraphjs) (3.1k) mirrors it for JS runtimes | 141k | Python + TS/JS | LangChain AI |
| 5 | [Dify](https://github.com/langgenius/dify) | Visual workflow builder, RAG pipelines, agent apps, deployment tooling | 130k–147k+ | TypeScript | LangGenius |
| 6 | [OpenHands](https://github.com/All-Hands-AI/OpenHands) | Autonomous dev agent — writes/edits code, runs shell commands, browses the web, executes in a sandbox; strong local secure-workflow story | 80k | Python | All-Hands-AI (formerly OpenDevin) |
| 7 | [MetaGPT](https://github.com/FoundationAgents/MetaGPT) | Simulates a software company (PM/architect/dev/QA roles), SOP-driven pipelines, generates specs, docs, and code from one prompt | 69k | Python | Foundation Agents |
| 8 | [Mem0](https://github.com/mem0ai/mem0) | Memory layer, not an orchestrator: extraction, consolidation, scoped retrieval, long-term user/agent memory; drops into any framework | 60k | Python/TypeScript | mem0ai |
| 9 | [AutoGen](https://github.com/microsoft/autogen) | Dialogue-first multi-agent conversations, async event-driven messaging, distributed collaboration, observability, code execution | 60k | Python | Microsoft |
| 10 | [CrewAI](https://github.com/crewAIInc/crewAI) | Role-based "crews," task delegation and collaboration, memory, checkpointing, async flows; lean (no LangChain dependency) | 55k | Python | CrewAI Inc. / João Moura |
| 11 | [LlamaIndex](https://github.com/run-llama/llama_index) | Retrieval-centric agents, event-driven Workflows, RAG-first data connectors, memory, structured query planning | 51k | Python | LlamaIndex |
| 12 | [smolagents](https://github.com/huggingface/smolagents) | Minimal code-first agents that write actions as Python code, sandboxed execution, tiny surface area, model-agnostic | 28k | Python | Hugging Face |
| 13 | [OpenAI Agents SDK](https://github.com/openai/openai-agents-python) | Lightweight agent loop, handoffs between agents, guardrails, sessions, built-in tracing, sandboxed tool execution | 28k | Python/TypeScript | OpenAI |
| 14 | [Mastra](https://github.com/mastra-ai/mastra) | TS-native, batteries-included: agents, graph-based workflows (`.then()`/`.branch()`/`.parallel()`), 40+ model routing, observational memory, human-in-the-loop, authored MCP servers, built-in evals + observability; deploys standalone or inside React/Next/Node | 26k | TypeScript | Mastra (mastra.ai) |
| 15 | [Vercel AI SDK](https://github.com/vercel/ai) | Streaming, tool calling, structured outputs, agent loops, MCP support, provider-agnostic, first-class UI hooks; runs on edge/Workers | 25k | TypeScript | Vercel |
| 16 | [Zep](https://github.com/getzep/zep) | Agent memory platform built on a temporal knowledge graph; long-term context, fact extraction, cross-session recall | 4.7k | Python/TypeScript | getzep |
