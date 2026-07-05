# AI Model Configuration Guide

This guide explains how to configure and use AI models in the application, with a focus on free and cost-effective options.

## Default Configuration

The application now **prioritizes free models** from OpenRouter by default:

### Free Models (No Cost)

1. **Llama 3.3 70B** (Default)
   - Context: 131K tokens
   - Provider: Meta via OpenRouter
   - Best for: General chat, reasoning, and complex queries

2. **Nemotron 70B**
   - Context: 131K tokens
   - Provider: NVIDIA via OpenRouter
   - Best for: Technical content, coding assistance

3. **Qwen 2.5 72B**
   - Context: 32K tokens
   - Provider: Alibaba via OpenRouter
   - Best for: Multilingual tasks, fast responses

4. **DeepSeek V3**
   - Context: 64K tokens
   - Provider: DeepSeek via OpenRouter
   - Best for: Long-form content, analysis

5. **DeepSeek R1**
   - Context: 64K tokens
   - Provider: DeepSeek via OpenRouter
   - Best for: Reasoning tasks, problem-solving

## Quick Start with Free Models

### 1. Get an OpenRouter API Key

1. Visit [OpenRouter](https://openrouter.ai)
2. Sign up for a free account
3. Go to [API Keys](https://openrouter.ai/settings/keys)
4. Generate a new API key
5. Add credits (many models are free, but you need an account)

### 2. Configure Environment

Add to your `.env` file:

```bash
# OpenRouter API Key (supports free models)
OPENROUTER_API_KEY=sk-or-v1-...
```

### 3. Add Provider in Settings

The app will automatically detect the `OPENROUTER_API_KEY` environment variable. If not, you can manually add it:

1. Open the app settings
2. Navigate to "Model Providers"
3. Add OpenRouter provider with your API key
4. The free models will be automatically available

## Provider Fallback Order

When no specific provider is configured, the system falls back in this order:

1. **OpenRouter** (free models available)
2. **NVIDIA** (free tier available)
3. **Groq** (generous free tier)
4. First available provider

## Configuration File

Models are defined in: `packages/agent-toolkit/src/config/language-models-database.ts`

### Adding Custom Models

To add a custom model to OpenRouter:

```typescript
{
  provider: "OpenRouter",
  models: [
    // Add your model here
    {
      name: "Custom Model Name",
      id: "provider/model-id",
      contextLength: 128000,
    },
    // ... existing models
  ],
}
```

## Alternative Free Providers

### NVIDIA NIM (Free Tier)

NVIDIA offers free access to several models:

```bash
# Add to .env
NVIDIA_API_KEY=nvapi-...
```

**Free models available:**
- Llama Nemotron
- Mistral models
- Qwen models
- DeepSeek V3

Get your key: [NVIDIA API Keys](https://build.nvidia.com/settings/api-keys)

### Groq (Fast & Free)

Groq offers very fast inference with a generous free tier:

```bash
# Add to .env
GROQ_API_KEY=gsk_...
```

**Free models available:**
- Llama 4 Maverick
- Llama 3.3 70B
- Mixtral models

Get your key: [Groq Console](https://console.groq.com/keys)

### Ollama (100% Local & Free)

Run models locally without any API costs:

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull a model
ollama pull llama3.2

# Start Ollama server (runs on localhost:11434)
ollama serve
```

No API key needed - the app will automatically detect Ollama running locally.

## Cost Management Tips

### 1. Use Free Models First

Start with free OpenRouter models (Llama 3.3 70B, Nemotron, etc.) before upgrading to premium models.

### 2. Monitor Usage

OpenRouter provides usage dashboards:
- [Usage Dashboard](https://openrouter.ai/activity)
- Set spending limits
- Enable email alerts

### 3. Local Development

Use Ollama for local development to avoid API costs entirely:

```bash
# No internet needed, no API costs
ollama run llama3.2
```

### 4. Rate Limits

Free tier rate limits:
- **OpenRouter Free Models**: ~20 requests/minute
- **NVIDIA NIM**: ~100 requests/day
- **Groq**: ~30 requests/minute, 14,400/day

## Premium Models

For production or advanced use cases, premium models are also available:

### OpenRouter Premium
- Claude 3.7 Sonnet ($3/$15 per 1M tokens)
- GPT-4o ($2.50/$10 per 1M tokens)
- Gemini 2.5 Pro ($1.25/$5 per 1M tokens)

### Direct Providers

You can also configure direct API access:

```bash
# Anthropic Claude
ANTHROPIC_API_KEY=sk-ant-...

# OpenAI
OPENAI_API_KEY=sk-...

# Google AI
GOOGLE_API_KEY=...
```

## Model Selection in UI

Users can switch models in the chat interface:

1. Click the model selector button
2. Choose from available models
3. Free models are marked with "(Free)" label
4. Selection persists across sessions

## Advanced Configuration

### Custom Provider URLs

Override provider base URLs:

```typescript
// In model-registry.ts
const openAICompatibleBaseURLs: Record<string, string> = {
  openrouter: "https://openrouter.ai/api/v1",
  custom: "https://your-custom-endpoint.com/v1",
};
```

### Model Parameters

Adjust temperature, max tokens, etc. in the chat handler:

```typescript
// In lib/chat/handler.ts
const result = await generateText({
  model: chatModel,
  messages,
  temperature: 0.7,  // Adjust creativity
  maxTokens: 4096,   // Adjust response length
});
```

## Troubleshooting

### "No model providers configured"

**Solution:** Add at least one API key to your `.env` file

### "Model not available for provider"

**Solution:** Check that the model ID is correct in the database configuration

### Rate limit errors

**Solution:** 
1. Add multiple providers for failover
2. Implement exponential backoff
3. Upgrade to paid tier if needed

### Slow responses

**Solution:**
1. Use Groq for fastest inference (free)
2. Use smaller models (Llama 3.2 3B on Ollama)
3. Reduce max tokens

## Best Practices

1. **Start Free**: Use OpenRouter free models (Llama 3.3 70B)
2. **Local Dev**: Use Ollama locally to save API costs
3. **Multiple Providers**: Configure fallback providers for reliability
4. **Monitor Costs**: Track usage in provider dashboards
5. **Model Selection**: Choose the right model for the task
   - Simple Q&A: Qwen 2.5 72B (free)
   - Complex reasoning: Llama 3.3 70B (free)
   - Speed-critical: Groq Llama (free)
   - Production: Claude/GPT-4o (paid)

## Resources

- [OpenRouter Models](https://openrouter.ai/models)
- [NVIDIA NIM Catalog](https://build.nvidia.com/explore/discover)
- [Groq Speed Benchmarks](https://groq.com/speed/)
- [Ollama Model Library](https://ollama.com/library)
- [LLM Pricing Comparison](https://openrouter.ai/models)
