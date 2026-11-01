# write-language API Reference

## `writeLanguageResponse(options): Promise<GenerateLanguageResult>`

### Options (`GenerateLanguageOptions`)

| Option | Type | Default | Notes |
| --- | --- | --- | --- |
| `provider` | `LLMProviderName` | — | **Required.** Lowercased before matching against `LANGUAGE_PROVIDERS`. |
| `apiKey` | `string` | — | **Required.** Colon-packed for `cloudflare` (`token:accountId`), `vertex` (`projectId:location`), `amazon`/`bedrock` (`region:accessKeyId:secretAccessKey`). |
| `agent` | `string` | `"question"` | Must match an `AGENT_PROMPTS[].name`. |
| `model` | `string` | provider's registered `default` | Passed straight to the provider. |
| `temperature` | `number` | `1` | 0–2, applied at `generateText` call time. |
| `query` | `string` | — | The user question; the variable most templates use. |
| `article` | `string` | — | Document text for summarize/cite agents. |
| `chat_history` | `string` | — | Prior turns for context-aware agents. |
| `attachments` | `LanguageAttachment[]` | — | Switches the request to a multimodal `messages` call. |
| `html` | `boolean` | `true` | `true` → HTML, `false` → raw Markdown. |
| `applyContextLimit` | `boolean` | `true` | Truncates the prompt to the model's context window. |
| *(any other key)* | `unknown` | — | Substituted into the template's `{placeholder}`s. |

### Result (`GenerateLanguageResult`)

| Field | Type | Notes |
| --- | --- | --- |
| `content` | `string?` | HTML or Markdown per `html`. |
| `extract` | `unknown?` | Whatever the agent's `after` hook returned. |
| `error` | `string?` | Set instead of throwing on any failure. |

## Providers

`createLLMProvider(provider, apiKey, model, temperature)` returns an AI SDK
`LanguageModel`, or `null` for an unknown provider.

| Provider | SDK / endpoint |
| --- | --- |
| `groq` | `@ai-sdk/groq` |
| `openai` | `@ai-sdk/openai` |
| `anthropic` | `@ai-sdk/anthropic` |
| `google` | `@ai-sdk/google` |
| `vertex` | `@ai-sdk/google-vertex`, `apiKey` = `projectId:location` |
| `xai` | `@ai-sdk/xai` |
| `amazon` / `bedrock` | `@ai-sdk/amazon-bedrock`, `apiKey` = `region:accessKeyId:secretAccessKey` |
| `openrouter` | `@openrouter/ai-sdk-provider` (`.chat(model)`) |
| `togetherai` | OpenAI-compatible, `https://api.together.xyz/v1` |
| `cloudflare` | OpenAI-compatible, `…/accounts/{accountId}/ai/v1`, `apiKey` = `token:accountId` |
| `nvidia` | OpenAI-compatible, `https://integrate.api.nvidia.com/v1` |
| `perplexity` | OpenAI-compatible, `https://api.perplexity.ai` |
| `anyapi` | OpenAI-compatible, `https://api.anyapi.ai/v1` |

## Agent prompt templates (`AGENT_PROMPTS`)

`question`, `question-research-engine`, `summarize`, `summarize-bullets`,
`summary-longtext`, `answer-cite-sources`, `query-resolution`,
`query-resolution-search`, `results-relevance-filter`, `suggest-followups`,
`knowledge-graph-nodes`, `remember-user`.

`AgentPrompt`: `{ name, template?, prompt?, before?(prompt, options), after?(reply, options), tools?, ... }`.
`before` pre-processes the prompt string before variable substitution; `after` parses
the reply into `result.extract`.

## Registry helpers

| Export | Returns |
| --- | --- |
| `LANGUAGE_MODELS` | Provider-grouped catalogue (`provider`, `default`, model entries) |
| `LANGUAGE_PROVIDERS` | `string[]` of lowercased provider names, derived from the above |
| `LANGUAGE_MODEL_FAMILIES` | Family groupings for UI |
| `getAllModels()` | Flat `ModelInfo[]` |
| `getModelsByProvider(p)` | `ModelInfo[]` |
| `getModelsByCapability(c)` | `c` is `"text" \| "vision" \| "audio" \| "code" \| "reasoning"` |
| `getTextOnlyModels()` / `getMultimodalModels()` | Convenience filters |

`ModelInfo`: `{ name, id, contextLength, capabilities?, provider }`.

## Utilities

| Export | Purpose |
| --- | --- |
| `extractJSONFromLanguageReply(reply)` | Pull a JSON object out of a fenced or prose-wrapped reply |
| `convertMarkdownToHTMLEscaped(md)` / `markdownToHTML` | Markdown → escaped HTML (marked) |
| `highlightCode`, `Prism` | Syntax highlighting used by the HTML output. Markup/CSS/C-like/JavaScript highlight immediately; the other grammars are registered asynchronously by `loadPrismGrammars()` (`src/utils/prism-global.ts`), so a block rendered in that first gap comes back unhighlighted rather than broken |
| `getRewriteModes`, `saveRewriteModes`, `resetRewriteModes`, `DEFAULT_REWRITE_MODES` | The rewrite-mode presets (`src/rewrite-modes.ts`) |
