# OpenRouter Guest Access Configuration

## Overview ✅

QwkSearch now provides **free, unlimited AI access** to all guests and new users through OpenRouter's free tier, powered by NVIDIA Nemotron 3 Super 120B.

## Configuration Status

### ✅ Fully Configured
- **Provider**: OpenRouter (https://openrouter.ai)
- **Default Model**: `nvidia/nemotron-3-super-120b-a12b:free`
- **Context Length**: 1,000,000 tokens
- **Cost**: $0 per 1M input/output tokens (truly free)
- **Daily Limits**: None (unlike Groq which has rate limits)
- **API Key**: Host-provided via `OPENROUTER_API_KEY` environment variable

## How It Works

### 1. Environment Configuration

The host-provided OpenRouter API key is configured in `.env`:

```bash
OPENROUTER_API_KEY=sk-or-v1-...
```

This key is automatically loaded by the config manager and made available to all users.

### 2. Automatic Provider Loading

When the application starts, the config manager:
1. Scans environment variables for API keys
2. Finds `OPENROUTER_API_KEY` 
3. Automatically creates an OpenRouter provider
4. Loads all available free models from the database
5. Sets Nemotron as the default model

**File**: [packages/agent-toolkit/src/config/config-manager.ts:145-184](../../packages/agent-toolkit/src/config/config-manager.ts#L145-L184)

### 3. Guest Access Priority

The ModelRegistry prioritizes OpenRouter for guests and unauthenticated users:

```typescript
// Prioritize OpenRouter (no daily limits) over Groq (has daily limits)
provider =
  providers.find((p) => p.name.toLowerCase().includes("openrouter")) ??
  providers.find((p) => p.name.toLowerCase().includes("groq")) ??
  providers.find((p) => p.name.toLowerCase().includes("nvidia")) ??
  providers[0];
```

**File**: [packages/agent-toolkit/src/config/model-registry.ts:84-89](../../packages/agent-toolkit/src/config/model-registry.ts#L84-L89)

### 4. Rate Limiting for Shared API Keys

Guests using the host-provided OpenRouter key are subject to rate limits to prevent abuse:

```typescript
if (registry.isProviderEnvBased(body.chatModel.providerId)) {
  const ip = getClientIP(req);
  const rateLimit = checkGuestRateLimit(ip);
  
  if (!rateLimit.allowed) {
    return Response.json({
      message: `Daily limit reached (${rateLimit.limit} requests). 
                Resets at ${resetDate.toLocaleString()}. 
                Add your own API key in settings for unlimited access.`
    }, { status: 429 });
  }
}
```

**File**: [apps/qwksearch-web/lib/chat/handler.ts:173-196](../lib/chat/handler.ts#L173-L196)

## Available Models

### Free Models (via OpenRouter)

All of these models are available with **no cost** and **no daily limits**:

| Model | Context Length | Description |
|-------|----------------|-------------|
| **Nemotron 3 Super 120B** (default) | 1M tokens | NVIDIA's flagship free model |
| Nemotron 3 Ultra 550B | 1M tokens | Ultra-large reasoning model |
| Nemotron 3 Nano 30B | 256K tokens | Compact but powerful |
| Nemotron Nano 12B v2 VL | 128K tokens | Vision-language model |
| Nemotron Nano 9B v2 | 128K tokens | Small and fast |
| Gemma 4 31B IT | 262K tokens | Google's Gemma 4 |
| GPT-OSS 120B | 131K tokens | Open-source GPT alternative |
| Qwen3 Coder | 1M tokens | Specialized code model |
| Llama 3.3 70B Instruct | 131K tokens | Meta's latest Llama |
| Hermes 3 Llama 3.1 405B | 131K tokens | Fine-tuned Llama 405B |

**Complete list**: [packages/agent-toolkit/src/config/language-models-database.ts:1231-1407](../../packages/agent-toolkit/src/config/language-models-database.ts#L1231-L1407)

## User Experience

### For Guests (Not Logged In)
1. **Immediate Access**: No signup required
2. **Default Model**: Nemotron 3 Super 120B (1M context)
3. **Rate Limits**: Enforced per IP address
4. **No Persistence**: Chats stored in localStorage only
5. **Upgrade Path**: Sign in or add own API key for unlimited access

### For New Users (Logged In)
1. **Automatic Provider**: OpenRouter enabled by default
2. **Default Model**: Nemotron 3 Super 120B (1M context)
3. **Rate Limits**: Same as guests (using shared key)
4. **Chat Persistence**: Saved to database with userId
5. **Upgrade Path**: Add own API key in settings for unlimited access

### For Users with Own API Keys
1. **Unlimited Access**: No rate limits
2. **All Models**: Access to paid models if configured
3. **Custom Providers**: Can add multiple providers
4. **Priority**: Own keys take precedence over shared keys

## Configuration Files

### 1. Environment Variables

**File**: `.env` or `.env.local`

```bash
# OpenRouter API Key (host-provided, shared by all guests)
OPENROUTER_API_KEY=sk-or-v1-...
```

### 2. Model Database

**File**: `packages/agent-toolkit/src/config/language-models-database.ts`

```typescript
{
  "provider": "OpenRouter",
  "docs": "https://openrouter.ai/docs",
  "api_key": "https://openrouter.ai/settings/keys",
  "default": "nvidia/nemotron-3-super-120b-a12b:free",
  "models": [
    {
      "name": "Nemotron 3 Super 120B",
      "id": "nvidia/nemotron-3-super-120b-a12b:free",
      "contextLength": 1_000_000,
      "free": true,
      "type": "text-generation"
    },
    // ... more models
  ]
}
```

### 3. Provider Configuration

**File**: `packages/agent-toolkit/src/config/provider-ui-config.ts`

```typescript
{
  key: "openrouter",
  name: "OpenRouter",
  fields: [
    {
      type: "password",
      name: "API Key",
      key: "apiKey",
      description: "Your OpenRouter API key. Get one free at openrouter.ai - includes free access to Llama 3.3 70B, Nemotron, and other models.",
      required: true,
      placeholder: "sk-or-v1-...",
      env: "OPENROUTER_API_KEY",
      scope: "server"
    }
  ]
}
```

## Deployment

### Local Development

1. Ensure `.env` has `OPENROUTER_API_KEY`:
   ```bash
   echo "OPENROUTER_API_KEY=sk-or-v1-..." >> .env
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Verify OpenRouter is available:
   ```bash
   curl http://localhost:3000/api/agent/providers
   ```

### Production (Cloudflare Pages)

1. Set the secret in Cloudflare:
   ```bash
   npx wrangler secret put OPENROUTER_API_KEY
   # Paste the API key when prompted
   ```

2. Verify in `wrangler.jsonc` that `keep_vars: true` is set:
   ```jsonc
   {
     "env": {
       "production": {
         "keep_vars": true
       }
     }
   }
   ```

3. Deploy:
   ```bash
   npm run deploy
   ```

4. Verify via API:
   ```bash
   curl https://your-domain.pages.dev/api/agent/providers
   ```

## Rate Limiting

### Guest Rate Limits

**File**: `apps/qwksearch-web/lib/rate-limit/guestRateLimiter.ts`

- **Purpose**: Prevent abuse of shared host API key
- **Scope**: Per IP address
- **Reset**: Daily (midnight UTC)
- **Limit**: Configurable (default varies by provider)
- **Storage**: In-memory (resets on deployment)

### Bypass Rate Limits

Users can bypass rate limits by:
1. **Adding own API key** in Settings → Model Providers
2. **Signing up** for their own OpenRouter account (free)
3. **Using alternate free providers** (Groq, NVIDIA)

## Monitoring

### Check Provider Loading

```bash
# Development
npm run dev

# Check logs for:
# [ModelRegistry] ModelRegistry active providers: <hash>(openrouter)
```

### Verify Model Selection

```bash
# Check that Nemotron is selected by default
curl http://localhost:3000/api/agent/providers | jq '.providers[] | select(.type=="openrouter") | .chatModels[0]'
```

### Monitor Rate Limiting

```bash
# Guest request logs show:
# [POST /api/agent/chat] guest rate limit for <ip>: allowed=true remaining=<n>/<limit>
```

## Troubleshooting

### OpenRouter Not Showing Up

1. **Check environment variable**:
   ```bash
   grep OPENROUTER_API_KEY .env
   ```

2. **Verify API key format**:
   ```bash
   # Should start with sk-or-v1-
   echo $OPENROUTER_API_KEY
   ```

3. **Check provider loading**:
   ```bash
   curl http://localhost:3000/api/agent/providers | jq '.providers[] | select(.type=="openrouter")'
   ```

### Default Model Not Nemotron

1. **Check language-models-database.ts**:
   ```bash
   grep -A 5 '"provider": "OpenRouter"' packages/agent-toolkit/src/config/language-models-database.ts | grep default
   ```

2. **Verify model registry fallback**:
   ```typescript
   // Should prioritize openrouter
   providers.find((p) => p.name.toLowerCase().includes("openrouter"))
   ```

### Rate Limit Too Restrictive

1. **Adjust guest rate limit**:
   ```typescript
   // In guestRateLimiter.ts
   const DAILY_LIMIT = 100; // Increase as needed
   ```

2. **Encourage users to add own keys**:
   - Settings → Model Providers → Add OpenRouter
   - Free signup at openrouter.ai

## Benefits

### For Users
- ✅ **No Signup Required**: Instant access to AI chat
- ✅ **Truly Free**: No credit card, no payment
- ✅ **Large Context**: 1M tokens for long documents
- ✅ **High Quality**: NVIDIA Nemotron is GPT-4 class
- ✅ **No Daily Limits**: Unlike Groq (300K TPM)

### For Administrators
- ✅ **Cost Control**: Rate limiting prevents abuse
- ✅ **Easy Setup**: Just set one environment variable
- ✅ **Automatic**: No manual provider configuration
- ✅ **Scalable**: OpenRouter handles infrastructure
- ✅ **Flexible**: Users can add own keys anytime

## Next Steps

### For Users Who Want More

1. **Remove Rate Limits**: Add own OpenRouter API key (free)
2. **Access Paid Models**: Add OpenAI, Anthropic, or Google keys
3. **Multiple Providers**: Configure backup providers
4. **Custom Models**: Add custom OpenAI-compatible endpoints

### For Administrators

1. **Monitor Usage**: Track API costs via OpenRouter dashboard
2. **Adjust Limits**: Tune rate limits based on usage patterns
3. **Add Providers**: Configure additional free providers as fallbacks
4. **Update Models**: Keep language-models-database.ts current with new free models

## References

### Key Files
- [language-models-database.ts](../../packages/agent-toolkit/src/config/language-models-database.ts) - Model definitions
- [model-registry.ts](../../packages/agent-toolkit/src/config/model-registry.ts) - Provider loading and fallbacks
- [config-manager.ts](../../packages/agent-toolkit/src/config/config-manager.ts) - Environment variable parsing
- [provider-ui-config.ts](../../packages/agent-toolkit/src/config/provider-ui-config.ts) - UI configuration
- [chat/handler.ts](../lib/chat/handler.ts) - Rate limiting logic

### External Links
- [OpenRouter Documentation](https://openrouter.ai/docs)
- [OpenRouter Free Models](https://openrouter.ai/models?free=true)
- [NVIDIA Nemotron](https://build.nvidia.com/nvidia/nemotron-3-super-120b-a12b)

---

**Status**: ✅ **CONFIGURED AND READY**  
**Date**: 2026-07-05  
**Default Provider**: OpenRouter  
**Default Model**: NVIDIA Nemotron 3 Super 120B (1M context, free)
