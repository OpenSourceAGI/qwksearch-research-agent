# write-language

Multi-provider language generation toolkit using Vercel AI SDK. Generate AI responses with 10+ LLM providers including OpenAI, Anthropic, Google, AWS Bedrock, and more.

## Features

- 🤖 **Multi-Provider Support**: Works with 10+ LLM providers
  - OpenAI (GPT-4, GPT-3.5)
  - Anthropic (Claude 3.5, Claude 3)
  - Google (Gemini, PaLM)
  - AWS Bedrock
  - Groq
  - xAI (Grok)
  - Cloudflare Workers AI
  - Ollama (local models)
  - OpenRouter
  - And more!

- 📝 **Flexible Response Generation**: Stream or non-stream responses
- 🔧 **Model Registry**: Complete catalog of available models by provider
- 🎯 **Provider Factory**: Easy provider initialization
- 📋 **Pre-built Prompts**: Ready-to-use agent prompt templates
- 🛠️ **Tool Support**: Function calling and tool use capabilities
- 🎨 **Markdown to HTML**: Built-in markdown rendering with syntax highlighting

## Installation

```bash
npm install write-language
```

## Usage

### Basic Response Generation

```typescript
import { generateLanguageResponse } from 'write-language';

const result = await generateLanguageResponse({
  provider: 'openai',
  model: 'gpt-4-turbo',
  prompt: 'Explain quantum computing in simple terms',
  apiKey: process.env.OPENAI_API_KEY
});

console.log(result.text);
```

### Streaming Responses

```typescript
const result = await generateLanguageResponse({
  provider: 'anthropic',
  model: 'claude-3-5-sonnet-20241022',
  prompt: 'Write a short story about AI',
  apiKey: process.env.ANTHROPIC_API_KEY,
  stream: true
});

for await (const chunk of result.textStream) {
  process.stdout.write(chunk);
}
```

### Using the Model Registry

```typescript
import { 
  LANGUAGE_MODELS, 
  getModelsByProvider,
  getModelsByCapability 
} from 'write-language';

// Get all OpenAI models
const openaiModels = getModelsByProvider('openai');

// Get all multimodal models
const multimodalModels = getModelsByCapability('multimodal');

// Check specific model info
const gpt4Info = LANGUAGE_MODELS['gpt-4-turbo'];
console.log(gpt4Info);
// {
//   name: 'GPT-4 Turbo',
//   provider: 'openai',
//   contextWindow: 128000,
//   capabilities: ['text', 'multimodal', 'function-calling'],
//   ...
// }
```

### Custom Provider Setup

```typescript
import { createLLMProvider } from 'write-language';

const provider = createLLMProvider(
  'groq',
  process.env.GROQ_API_KEY
);

const model = provider('llama-3.3-70b-versatile');
```

### Using Agent Prompts

```typescript
import { AGENT_PROMPTS } from 'write-language';

const result = await generateLanguageResponse({
  provider: 'openai',
  model: 'gpt-4',
  prompt: AGENT_PROMPTS.researchAgent.systemPrompt,
  messages: [
    {
      role: 'user',
      content: 'Research the latest developments in fusion energy'
    }
  ],
  apiKey: process.env.OPENAI_API_KEY
});
```

### Markdown to HTML Conversion

```typescript
import { convertMarkdownToHTMLEscaped } from 'write-language';

const markdown = '# Hello\n\n```javascript\nconsole.log("world");\n```';
const html = convertMarkdownToHTMLEscaped(markdown);
```

## API Reference

### `generateLanguageResponse(options)`

Generate an AI language response.

**Options:**
- `provider` (string): LLM provider name
- `model` (string): Model identifier
- `prompt` (string): System prompt or initial prompt
- `apiKey` (string): Provider API key
- `messages` (array, optional): Conversation history
- `stream` (boolean, optional): Enable streaming
- `maxTokens` (number, optional): Maximum tokens to generate
- `temperature` (number, optional): Sampling temperature
- `tools` (array, optional): Available tools for function calling

**Returns:** `GenerateLanguageResult` with `text`, `textStream`, `finishReason`, etc.

### `createLLMProvider(provider, apiKey, options)`

Create a provider instance.

**Parameters:**
- `provider`: Provider name
- `apiKey`: API key
- `options`: Additional provider options

**Returns:** Provider function

### Model Registry Functions

- `getModelsByProvider(provider)`: Get all models for a provider
- `getAllModels()`: Get all available models
- `getModelsByCapability(capability)`: Filter by capability
- `getTextOnlyModels()`: Get text-only models
- `getMultimodalModels()`: Get multimodal models

## Supported Providers

| Provider | Models | Capabilities |
|----------|--------|--------------|
| OpenAI | GPT-4, GPT-3.5, o1, o3 | Text, Multimodal, Functions |
| Anthropic | Claude 3.5, Claude 3 | Text, Multimodal, Functions |
| Google | Gemini 2.0, Gemini 1.5 | Text, Multimodal |
| AWS Bedrock | Claude, Llama, Mistral | Text, Multimodal |
| Groq | Llama 3, Mixtral | Text, Fast Inference |
| xAI | Grok | Text |
| Cloudflare | Various | Text, Edge Deployment |
| Ollama | Local Models | Text, Privacy |
| OpenRouter | 100+ Models | Text, Aggregator |

## Environment Variables

Set API keys for the providers you want to use:

```bash
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...
GROQ_API_KEY=gsk_...
XAI_API_KEY=xai-...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
CLOUDFLARE_ACCOUNT_ID=...
CLOUDFLARE_API_TOKEN=...
```


## Model Rank


| Usage | Logo | Flag | Model | Author | Output $/M | Context | Intelligence | Coding | Agentic | Released |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | ![](https://www.google.com/s2/favicons?domain=deepseek.com&sz=64) | ![](https://flagcdn.com/w40/cn.png) | DeepSeek V4 Flash | DeepSeek | $0.18 | 1,048,576 | 40.3 | 56.2 | 31.1 | 2mo ago |
| 2 | ![](https://www.google.com/s2/favicons?domain=xiaomi.com&sz=64) | ![](https://flagcdn.com/w40/cn.png) | MiMo-V2.5 | Xiaomi | $0.28 | 1,048,576 | — | — | — | 2mo ago |
| 3* | ![](https://www.google.com/s2/favicons?domain=minimax.io&sz=64) | ![](https://flagcdn.com/w40/cn.png) | MiniMax M3 | MiniMax | $1.20 | 1,048,576 | 44.4 | 58.6 | 35.4 | 1mo ago |
| 4* | ![](https://www.google.com/s2/favicons?domain=z.ai&sz=64) | ![](https://flagcdn.com/w40/cn.png) | GLM 5.2 | Z.ai | $2.856 | 1,048,576 | 51.1 | 68.8 | 43.1 | 2w ago |
| 5* | ![](https://www.google.com/s2/favicons?domain=tencent.com&sz=64) | ![](https://flagcdn.com/w40/cn.png) | Hy3 preview | Tencent | $0.21 | 262,144 | — | — | — | 2mo ago | 
| 6* | ![](https://www.google.com/s2/favicons?domain=deepseek.com&sz=64) | ![](https://flagcdn.com/w40/cn.png) | DeepSeek V4 Pro | DeepSeek | $0.87 | 1,048,576 | 44.3 | 59.4 | 36.4 | 2mo ago |
| 7 | ![](https://www.google.com/s2/favicons?domain=anthropic.com&sz=64) | ![](https://flagcdn.com/w40/us.png) | Claude Opus 4.7 | Anthropic | $25 | 1,000,000 | 53.5 | 73.6 | 44.4 | 2mo ago |
| 8 | ![](https://www.google.com/s2/favicons?domain=anthropic.com&sz=64) | ![](https://flagcdn.com/w40/us.png) | Claude Opus 4.8 | Anthropic | $25 | 1,000,000 | 55.7 | 74.3 | 47.2 | 1mo ago |
| 9* | ![](https://www.google.com/s2/favicons?domain=stepfun.com&sz=64) | ![](https://flagcdn.com/w40/cn.png) | Step 3.7 Flash | StepFun | $1.15 | 256,000 | 29.7 | 37.3 | 21.5 | 1mo ago |
| 10 | ![](https://www.google.com/s2/favicons?domain=anthropic.com&sz=64) | ![](https://flagcdn.com/w40/us.png) | Claude Sonnet 4.6 | Anthropic | $15 | 1,000,000 | 47.2 | 63.0 | 40.8 | 4mo ago |
| 11* | ![](https://www.google.com/s2/favicons?domain=openai.com&sz=64) | ![](https://flagcdn.com/w40/us.png) | GPT-5.5 | OpenAI | $30 | 1,050,000 | 54.8 | 74.9 | 44.9 | 2mo ago |
| 12* | ![](https://www.google.com/s2/favicons?domain=nvidia.com&sz=64) | ![](https://flagcdn.com/w40/us.png) | Nemotron 3 Ultra (free) | NVIDIA | $0 | 1,000,000 | 37.8 | 49.3 | 27.4 | 1mo ago |
| 13 | ![](https://www.google.com/s2/favicons?domain=google.com&sz=64) | ![](https://flagcdn.com/w40/us.png) | Gemini 3 Flash Preview | Google | $3 | 1,048,576 | — | — | — | 6mo ago |
| 14 | ![](https://www.google.com/s2/favicons?domain=anthropic.com&sz=64) | ![](https://flagcdn.com/w40/us.png) | Claude Sonnet 5 | Anthropic | $10 | 1,000,000 | 53.4 | 71.5 | 46.7 | 6d ago |
| 15* | ![](https://www.google.com/s2/favicons?domain=poolside.ai&sz=64) | ![](https://flagcdn.com/w40/us.png) | Laguna M.1 (free) | Poolside | $0 | 262,144 | — | — | — | 2mo ago |
| 16 | ![](https://www.google.com/s2/favicons?domain=google.com&sz=64) | ![](https://flagcdn.com/w40/us.png) | Gemini 2.5 Flash Lite | Google | $0.40 | 1,048,576 | — | — | — | 11mo ago |
| 17 | ![](https://www.google.com/s2/favicons?domain=google.com&sz=64) | ![](https://flagcdn.com/w40/us.png) | Gemini 2.5 Flash | Google | $2.50 | 1,048,576 | — | — | — | 1y ago |
| 18* | ![](https://www.google.com/s2/favicons?domain=xiaomi.com&sz=64) | ![](https://flagcdn.com/w40/cn.png) | MiMo-V2.5-Pro | Xiaomi | $0.87 | 1,048,576 | 42.2 | 60.2 | 29.1 | 2mo ago |
| 19 | ![](https://www.google.com/s2/favicons?domain=openai.com&sz=64) | ![](https://flagcdn.com/w40/us.png) | GPT-4o-mini | OpenAI | $0.60 | 128,000 | — | 11.4 | 1.0 | 1y ago |
| 20 | ![](https://www.google.com/s2/favicons?domain=google.com&sz=64) | ![](https://flagcdn.com/w40/us.png) | Gemini 3.1 Flash Lite | Google | $1.50 | 1,048,576 | — | — | — | 2mo ago |
| 21 | ![](https://www.google.com/s2/favicons?domain=openai.com&sz=64) | ![](https://flagcdn.com/w40/us.png) | gpt-oss-120b | OpenAI | $0.15 | 131,072 | 23.8 | 30.4 | 13.2 | 11mo ago |
| 22 | ![](https://www.google.com/s2/favicons?domain=nvidia.com&sz=64) | ![](https://flagcdn.com/w40/us.png) | Nemotron 3 Super (free) | NVIDIA | $0 | 1,000,000 | 25.4 | 37.7 | 8.7 | 3mo ago |
| 23 | ![](https://www.google.com/s2/favicons?domain=deepseek.com&sz=64) | ![](https://flagcdn.com/w40/cn.png) | DeepSeek V3.2 | DeepSeek | $0.3432 | 131,072 | — | 43.7 | — | 7mo ago |
| 24* | ![](https://www.google.com/s2/favicons?domain=google.com&sz=64) | ![](https://flagcdn.com/w40/us.png) | Gemini 3.5 Flash | Google | $9 | 1,048,576 | 50.2 | 70.1 | 37.4 | 1mo ago |
| 25 | ![](https://www.google.com/s2/favicons?domain=tencent.com&sz=64) | ![](https://flagcdn.com/w40/cn.png) | Hy3 (free) | Tencent | $0 | 262,144 | — | — | — | 0d ago |
| 26 | ![](https://www.google.com/s2/favicons?domain=openai.com&sz=64) | ![](https://flagcdn.com/w40/us.png) | GPT-5.4 | OpenAI | $15 | 1,050,000 | 51.4 | 71.1 | 41.1 | 4mo ago |
| 27 | ![](https://www.google.com/s2/favicons?domain=google.com&sz=64) | ![](https://flagcdn.com/w40/us.png) | Gemma 4 31B | Google | $0.35 | 262,144 | 29.4 | 43.4 | 14.4 | 3mo ago |
| 28 | ![](https://www.google.com/s2/favicons?domain=google.com&sz=64) | ![](https://flagcdn.com/w40/us.png) | Gemma 4 26B A4B | Google | $0.33 | 262,144 | 25.7 | 39.3 | 11.0 | 3mo ago |
| 29* | ![](https://www.google.com/s2/favicons?domain=moonshot.ai&sz=64) | ![](https://flagcdn.com/w40/cn.png) | Kimi K2.6 | MoonshotAI | $3.41 | 262,144 | 42.8 | 56.0 | 30.3 | 2mo ago |
| 30* | ![](https://www.google.com/s2/favicons?domain=mistral.ai&sz=64) | ![](https://flagcdn.com/w40/fr.png) | Mistral Nemo | Mistral | $0.03 | 131,072 | — | — | — | 1y ago |
| 31* | ![](https://www.google.com/s2/favicons?domain=anthropic.com&sz=64) | ![](https://flagcdn.com/w40/us.png) | Claude Fable 5 | Anthropic | $50 | 1,000,000 | 59.9 | 76.5 | 52.8 | 3w ago |
| 32 | ![](https://www.google.com/s2/favicons?domain=anthropic.com&sz=64) | ![](https://flagcdn.com/w40/us.png) | Claude Opus 4.6 | Anthropic | $25 | 1,000,000 | — | — | — | 5mo ago |
| 33 | ![](https://www.google.com/s2/favicons?domain=anthropic.com&sz=64) | ![](https://flagcdn.com/w40/us.png) | Claude Haiku 4.5 | Anthropic | $5 | 200,000 | 29.6 | 43.9 | 16.4 | 8mo ago |
| 34 | ![](https://www.google.com/s2/favicons?domain=google.com&sz=64) | ![](https://flagcdn.com/w40/us.png) | Gemini 3.1 Pro Preview | Google | $12 | 1,048,576 | 46.5 | 68.8 | 21.4 | 4mo ago |
| 35 | ![](https://www.google.com/s2/favicons?domain=moonshot.ai&sz=64) | ![](https://flagcdn.com/w40/cn.png) | Kimi K2.7 Code | MoonshotAI | $3.50 | 262,144 | 41.9 | 60.8 | 29.6 | 3w ago |
| 36 | ![](https://www.google.com/s2/favicons?domain=z.ai&sz=64) | ![](https://flagcdn.com/w40/cn.png) | GLM 5 | Z.ai | $1.92 | 202,752 | — | — | — | 4mo ago |
| 37 | ![](https://www.google.com/s2/favicons?domain=openai.com&sz=64) | ![](https://flagcdn.com/w40/us.png) | GPT-5.4 Mini | OpenAI | $4.50 | 400,000 | 40.0 | 56.1 | 30.2 | 3mo ago |
| 38* | ![](https://www.google.com/s2/favicons?domain=qwen.ai&sz=64) | ![](https://flagcdn.com/w40/cn.png) | Qwen3.7 Max | Qwen | $3.75 | 1,000,000 | 46.0 | 66.0 | 30.6 | 1mo ago |
| 39 | ![](https://www.google.com/s2/favicons?domain=google.com&sz=64) | ![](https://flagcdn.com/w40/us.png) | Gemini 3.1 Flash Lite Preview | Google | $1.50 | 1,048,576 | 25.0 | 34.7 | 6.2 | 4mo ago |
| 40 | ![](https://www.google.com/s2/favicons?domain=qwen.ai&sz=64) | ![](https://flagcdn.com/w40/cn.png) | Qwen3.7 Plus | Qwen | $1.28 | 1,000,000 | 39.0 | 55.9 | 20.8 | 1mo ago |
| 41* | ![](https://www.google.com/s2/favicons?domain=cohere.com&sz=64) | ![](https://flagcdn.com/w40/ca.png) | North Mini Code (free) | Cohere | $0 | 256,000 | — | 36.5 | — | 2w ago |
| 42 | ![](https://www.google.com/s2/favicons?domain=z.ai&sz=64) | ![](https://flagcdn.com/w40/cn.png) | GLM 5.1 | Z.ai | $3.036 | 202,752 | 40.2 | 55.8 | 29.9 | 3mo ago |
| 43 | ![](https://www.google.com/s2/favicons?domain=openai.com&sz=64) | ![](https://flagcdn.com/w40/us.png) | GPT-5 Mini | OpenAI | $2 | 400,000 | 25.3 | 15.6 | 19.4 | 11mo ago |
| 44 | ![](https://www.google.com/s2/favicons?domain=openai.com&sz=64) | ![](https://flagcdn.com/w40/us.png) | GPT-5.4 Nano | OpenAI | $1.25 | 400,000 | 38.2 | 56.1 | 27.5 | 3mo ago |
| 45 | ![](https://www.google.com/s2/favicons?domain=minimax.io&sz=64) | ![](https://flagcdn.com/w40/cn.png) | MiniMax M2.7 | MiniMax | $0.72 | 204,800 | 38.1 | 52.6 | 25.6 | 3mo ago |
| 46 | ![](https://www.google.com/s2/favicons?domain=moonshot.ai&sz=64) | ![](https://flagcdn.com/w40/cn.png) | Kimi K2.5 | MoonshotAI | $2.025 | 262,144 | — | — | — | 5mo ago |
| 47* | ![](https://www.google.com/s2/favicons?domain=x.ai&sz=64) | ![](https://flagcdn.com/w40/us.png) | Grok 4.3 | xAI | $2.50 | 1,000,000 | 37.6 | 42.2 | 24.1 | 2mo ago |
| 48 | ![](https://www.google.com/s2/favicons?domain=anthropic.com&sz=64) | ![](https://flagcdn.com/w40/us.png) | Claude Sonnet 4.5 | Anthropic | $15 | 1,000,000 | 36.4 | 52.1 | 24.6 | 9mo ago |
| 49 | ![](https://www.google.com/s2/favicons?domain=google.com&sz=64) | ![](https://flagcdn.com/w40/us.png) | Gemini 2.5 Pro | Google | $10 | 1,048,576 | 25.8 | 33.3 | 7.1 | 1y ago |
| 50 | ![](https://www.google.com/s2/favicons?domain=openai.com&sz=64) | ![](https://flagcdn.com/w40/us.png) | GPT-4.1 Mini | OpenAI | $1.60 | 1,047,576 | 14.8 | 20.2 | 1.7 | 1y ago |
| 51 | ![](https://www.google.com/s2/favicons?domain=qwen.ai&sz=64) | ![](https://flagcdn.com/w40/cn.png) | Qwen3 235B A22B Instruct 2507 | Qwen | $0.10 | 262,144 | — | — | — | 11mo ago |
| 52 | ![](https://www.google.com/s2/favicons?domain=poolside.ai&sz=64) | ![](https://flagcdn.com/w40/us.png) | Laguna XS 2.1 (free) | Poolside | $0 | 262,144 | — | — | — | 4d ago |
| 53 | ![](https://www.google.com/s2/favicons?domain=qwen.ai&sz=64) | ![](https://flagcdn.com/w40/cn.png) | Qwen3.6 Plus | Qwen | $1.95 | 1,000,000 | 39.6 | 54.5 | 27.6 | 3mo ago |
| 54 | ![](https://www.google.com/s2/favicons?domain=z.ai&sz=64) | ![](https://flagcdn.com/w40/cn.png) | GLM 4.7 Flash | Z.ai | $0.40 | 202,752 | — | — | — | 5mo ago |
| 55 | ![](https://www.google.com/s2/favicons?domain=openai.com&sz=64) | ![](https://flagcdn.com/w40/us.png) | gpt-oss-20b | OpenAI | $0.14 | 131,072 | 14.9 | 20.7 | 3.1 | 11mo ago |