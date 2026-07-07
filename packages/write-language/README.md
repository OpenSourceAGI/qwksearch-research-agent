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

## License

AGPL-3.0

## Author

vtempest <grokthiscontact@gmail.com>

## Contributing

Issues and PRs welcome at [github.com/vtempest/ai-research-agent](https://github.com/vtempest/ai-research-agent)
