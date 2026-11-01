---
name: ask-write-language
description: Guide to write-language (packages/write-language), the one-call multi-provider text generation toolkit built on the Vercel AI SDK — writeLanguageResponse(), the AGENT_PROMPTS template registry, the LANGUAGE_MODELS registry, createLLMProvider() and the packed apiKey formats for Cloudflare/Bedrock/Vertex, tool calling, attachments, and HTML vs Markdown output. Use when adding or debugging an LLM provider or model, when a call returns `{ error }` instead of content, when a prompt template needs a new variable or a structured `after` extractor, or when generation works for one provider but not another.
---

# Working With write-language

`packages/write-language`, published as **write-language**. One async call,
`writeLanguageResponse(options)`, wraps the Vercel AI SDK's `generateText` behind a
registry of providers, models and named prompt templates. `chat-agent-toolkit`
re-exports all of it, so agent code usually reaches it indirectly. Full option and
return shapes: [API.md](API.md).

## Setup

```ts
import { writeLanguageResponse } from "write-language";

const { content, extract, error } = await writeLanguageResponse({
  provider: "groq",           // required, case-insensitive
  apiKey: process.env.GROQ_API_KEY,
  agent: "question",          // a name from AGENT_PROMPTS; default "question"
  query: "Explain neural networks",
});
```

No env vars are read for you — the key is always an argument. The result is a plain
object: **failures come back as `{ error: "..." }`, they do not throw**, so a `try`
alone will not catch a bad provider name.

## Picking the right call

| You want | Call |
| --- | --- |
| Generate a response | `writeLanguageResponse({ provider, apiKey, agent, ...vars })` |
| A raw `LanguageModel` for your own `generateText`/`streamText` | `createLLMProvider(provider, apiKey, model, temperature)` |
| Every model the registry knows | `getAllModels()`, or `LANGUAGE_MODELS` (grouped by provider) |
| Models for one provider | `getModelsByProvider(provider)` |
| Vision- or reasoning-capable models only | `getModelsByCapability("vision")`, `getMultimodalModels()`, `getTextOnlyModels()` |
| The list of valid provider strings | `LANGUAGE_PROVIDERS` (lowercased provider names) |
| The prompt templates | `AGENT_PROMPTS` — `question`, `summarize`, `summarize-bullets`, `summary-longtext`, `answer-cite-sources`, `query-resolution`, `query-resolution-search`, `question-research-engine`, `knowledge-graph-nodes`, `remember-user`, `results-relevance-filter`, `suggest-followups` |
| JSON out of a reply that wrapped it in prose/fences | `extractJSONFromLanguageReply(reply)` |
| Markdown → HTML the same way the lib does | `convertMarkdownToHTMLEscaped(md)` (also exported as `markdownToHTML`) |

## Recipes

**Template variables.** Anything extra in `options` is substituted into the agent's
`{placeholder}` template — `query`, `article`, `chat_history` are the common ones, but
a custom template can name any key. A missing variable renders as an empty string
rather than erroring.

**Providers that pack several credentials into `apiKey`** — there is one key argument,
so these are colon-joined:

```ts
{ provider: "cloudflare", apiKey: `${CF_API_TOKEN}:${CF_ACCOUNT_ID}` }
{ provider: "vertex",     apiKey: `${PROJECT_ID}:${LOCATION}` }   // location defaults to us-central1
{ provider: "amazon",     apiKey: `${REGION}:${ACCESS_KEY_ID}:${SECRET_ACCESS_KEY}` }
```

**Attachments.** Pass `attachments: [{ ... }]` and the call switches from a prompt
string to a multimodal `messages` request, so images and documents reach the model
directly. Use a model from `getMultimodalModels()` or it will be ignored or rejected.

**Structured output.** A template's `after(reply, options)` hook parses the raw reply;
whatever it returns lands in `result.extract` while `result.content` keeps the prose.
`knowledge-graph-nodes` and `results-relevance-filter` work this way — copy one of them
rather than post-parsing at the call site.

**Adding a provider.** Add a `case` to `createLLMProvider` (`src/provider-factory.ts`)
returning an AI SDK model, and an entry to `LANGUAGE_MODELS` in
`src/language-model-registry.ts` with `provider`, `default` and its model list.
`LANGUAGE_PROVIDERS` is derived from the registry, so validation follows automatically —
skipping the registry entry is what makes a working factory case still return
"API key and provider are required".

## Troubleshooting

| Symptom | Cause → fix |
| --- | --- |
| `{ error: "API key and provider are required. Valid providers: …" }` | `apiKey` missing, or `provider` is not in `LANGUAGE_PROVIDERS`. The check is exact after lowercasing — `"OpenAI"` is fine, `"open-ai"` is not. |
| `{ error: 'Agent "X" not found' }` | `agent` must match an `AGENT_PROMPTS[].name` exactly; it is not a free-text system prompt. |
| Nothing throws but `content` is empty | Errors are returned, not thrown. Always read `error` before `content`. |
| A brand-new model id 404s at the provider | The registry is a static list; an id that is not in it is still passed through, so the failure is the provider's. Add it to `LANGUAGE_MODELS` so `default`/capability filters know about it. |
| `createLLMProvider` returns `null` | Unrecognised provider string — the `default` branch. |
| Cloudflare or Bedrock auth fails with a valid-looking key | The packed `apiKey` format above is mandatory; a bare token gives an account-less base URL or a missing region. |
| Output is HTML when you wanted Markdown | `html` defaults to `true`. Pass `html: false`. |
| A long article silently loses its tail | `applyContextLimit` defaults to `true` and truncates to the model's context length. Pass `applyContextLimit: false`, or chunk first. |
| `AGENT_TOOLS` resolves to the wrong set inside `chat-agent-toolkit` | Both packages export that name; `chat-agent-toolkit` deliberately re-exports its own last. Import from the package you mean. |
