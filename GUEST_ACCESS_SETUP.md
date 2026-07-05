# Guest Access with Free Models - Setup Guide

## Overview

The application now provides **full guest access** using free models from OpenRouter. Guests and logged-in users can use the same high-quality AI models at no cost.

## Default Configuration

### Default Model: Llama 3.3 70B (Free)

**Why Llama 3.3 70B?**
- ✅ **131K context** - Large enough for long conversations
- ✅ **Meta's latest** - State-of-the-art performance
- ✅ **Best for general use** - Reasoning, complex queries, chat
- ✅ **Completely free** - No daily limits, $0 per 1M tokens
- ✅ **No API key needed** - Works for guests out of the box

### Free Model Tier (Available to All Users)

| Priority | Model | Context | Best For |
|----------|-------|---------|----------|
| 1️⃣ **DEFAULT** | **Llama 3.3 70B** | 131K | General chat, reasoning, complex queries |
| 2️⃣ | Nemotron 70B | 131K | Technical content, coding assistance |
| 3️⃣ | Qwen 2.5 72B | 131K | Multilingual tasks, fast responses |
| 4️⃣ | DeepSeek V3 | 64K | Long-form content, analysis |
| 5️⃣ | DeepSeek R1 | 64K | Reasoning tasks, problem-solving |

### Additional Free Models (15+ total)

All models marked with `(Free)` in the UI are available to guests and logged-in users:

- Nemotron 3 Super 120B - Most powerful free model
- Nemotron 3 Nano 30B MoE - Fast & efficient
- OpenRouter Free - 200K context window
- Qwen3 Coder - Code generation specialist
- DeepSeek V4 Flash - Fastest inference
- Gemma 4 31B IT - Google's efficient model
- GLM 4.5 Air - Multilingual support
- Hermes 3 70B - Great for instructions
- Mistral 7B - Lightweight & fast
- Phi-3 Mini/Medium 128K - Microsoft's efficient models
- MythoMax L2 13B - Creative writing
- Toppy M 7B - Very fast responses

## Setup for Guest Access

### Option 1: Environment Variable (Recommended for Production)

Add an OpenRouter API key to your `.env` file to enable guest access:

```bash
# .env file
OPENROUTER_API_KEY=sk-or-v1-...
```

**To get a free OpenRouter API key:**
1. Visit [openrouter.ai](https://openrouter.ai)
2. Sign up for a free account
3. Go to [Settings > API Keys](https://openrouter.ai/settings/keys)
4. Generate a new API key
5. Add $5 credits (many models are free, but you need an account)

**Important:** With an API key configured as an environment variable:
- ✅ Guests can use free models (Llama 3.3 70B, etc.)
- ✅ Rate limiting applies (configurable daily limit per IP)
- ✅ No authentication required
- ✅ Server-side API key is never exposed to clients

### Option 2: User-Provided Keys (No Server Setup)

Users can add their own OpenRouter API keys in Settings:

1. Open the application
2. Go to Settings → Model Providers
3. Click "Add Provider"
4. Select "OpenRouter"
5. Enter your API key from [openrouter.ai](https://openrouter.ai/settings/keys)
6. Free models are now available with your personal key

**Advantages:**
- ✅ No server-side API key needed
- ✅ Each user has their own rate limits
- ✅ No shared rate limiting
- ✅ Users control their own API usage

## Guest Rate Limiting

When using a server-provided API key, guests are rate-limited to prevent abuse.

### Configuration

Rate limits are configured per IP address:

```typescript
// Default rate limit: 100 requests per day per IP
const GUEST_DAILY_LIMIT = parseInt(process.env.GUEST_DAILY_LIMIT || "100");
```

### Rate Limit Headers

Responses include rate limit information:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1672531200000
```

### When Rate Limit is Exceeded

Guests receive a 429 response with a helpful message:

```json
{
  "message": "Daily limit reached (100 requests). Resets at 1/1/2024, 12:00:00 AM. Add your own API key in settings for unlimited access."
}
```

### Adjusting Rate Limits

Set the `GUEST_DAILY_LIMIT` environment variable:

```bash
# .env
GUEST_DAILY_LIMIT=200  # Allow 200 requests per day per IP
```

## Provider Fallback Order

When no specific provider is configured, the system automatically falls back in this order:

1. **OpenRouter** (if `OPENROUTER_API_KEY` is set)
   - Free models: Llama 3.3 70B, Nemotron, Qwen, DeepSeek
   - No daily limits on free models
   - Best for guest access

2. **NVIDIA** (if `NVIDIA_API_KEY` is set)
   - Free tier available
   - Nemotron, Llama, Mistral models
   - Good backup option

3. **Groq** (if `GROQ_API_KEY` is set)
   - Very fast inference
   - Generous free tier
   - Daily limits apply

4. **First available provider**

## How It Works

### For Guests (No Login)

1. Guest visits the application
2. System detects no user session (`userId = null`)
3. Model registry checks for environment-based providers
4. If `OPENROUTER_API_KEY` is set:
   - Guest can use free models (Llama 3.3 70B default)
   - Rate limiting applies based on IP address
   - No authentication required

### For Logged-In Users

1. User logs in with their account
2. Same free models available by default
3. User can optionally add their own API keys
4. No rate limiting for user-provided keys

## Security Considerations

### API Key Protection

- ✅ **Never exposed to clients** - API keys stay server-side
- ✅ **Environment variables only** - Keys stored in `.env` file
- ✅ **Not in database** - Environment-based providers are ephemeral
- ✅ **No logging** - API keys never logged to console

### Rate Limiting

- ✅ **IP-based** - Prevents abuse from single source
- ✅ **Daily resets** - Fair usage policy
- ✅ **Configurable** - Adjust limits based on usage patterns

### Cost Control

- ✅ **Free models only for guests** - No unexpected costs
- ✅ **Rate limits** - Prevent API abuse
- ✅ **Monitoring** - Track guest usage patterns

## Monitoring Guest Usage

### Check Active Providers

```bash
# View logs for active providers
docker logs qwksearch-web | grep "ModelRegistry active providers"
```

### Track Rate Limit Hits

```bash
# View rate limit events
docker logs qwksearch-web | grep "guest rate limit"
```

### Monitor API Usage

OpenRouter provides usage dashboards:
- [Usage Dashboard](https://openrouter.ai/usage)
- Set spending limits
- Enable email alerts

## Cost Estimates

### Free Models (Zero Cost)

All free models in OpenRouter have **$0 per 1M tokens** pricing:

| Usage Level | Requests/Day | Tokens/Request | Daily Cost |
|-------------|--------------|----------------|------------|
| Light | 100 | 1,000 | $0 |
| Medium | 1,000 | 1,000 | $0 |
| Heavy | 10,000 | 1,000 | $0 |

**Total cost: $0** - Free models have no charges regardless of usage volume.

### Premium Models (Optional)

If users select premium models (Claude, GPT-4o):

| Model | Input Cost | Output Cost |
|-------|-----------|-------------|
| Claude 3.7 Sonnet | $3/1M | $15/1M |
| GPT-4o | $2.50/1M | $10/1M |
| Gemini 2.5 Pro | $1.25/1M | $5/1M |

**Protection:** Guests can only use free models when using server-provided API keys.

## Troubleshooting

### "No model providers configured"

**Cause:** No `OPENROUTER_API_KEY` in environment variables.

**Solution:** Add the API key to your `.env` file:

```bash
echo "OPENROUTER_API_KEY=sk-or-v1-..." >> .env
```

### "Daily limit reached"

**Cause:** Guest has exceeded the daily rate limit.

**Solution:**
- Wait for the daily reset (shown in error message)
- Add your own API key in Settings for unlimited access
- Or increase `GUEST_DAILY_LIMIT` in `.env`

### "Model not available for provider"

**Cause:** Requested model ID is incorrect or not in the database.

**Solution:** Check the [language-models-database.ts](packages/agent-toolkit/src/config/language-models-database.ts) file for valid model IDs.

### Slow Responses

**Cause:** Model is slower or rate limits are affecting performance.

**Solution:**
- Try DeepSeek V4 Flash (fastest free model)
- Use Groq with your own key (fastest inference)
- Check OpenRouter status page

## Best Practices

### For Operators

1. ✅ **Set rate limits** - Protect against abuse
2. ✅ **Monitor usage** - Track guest patterns
3. ✅ **Use free models** - Keep costs at zero
4. ✅ **Enable multiple providers** - Provide fallback options
5. ✅ **Regular key rotation** - Security best practice

### For Users

1. ✅ **Start with free models** - Test before upgrading
2. ✅ **Add your own key** - Unlimited access
3. ✅ **Choose the right model** - Match task to model strengths
4. ✅ **Monitor your usage** - OpenRouter dashboard
5. ✅ **Report issues** - Help improve the system

## Environment Variables Summary

```bash
# Required for guest access
OPENROUTER_API_KEY=sk-or-v1-...

# Optional: Adjust rate limits
GUEST_DAILY_LIMIT=100

# Optional: Additional providers
NVIDIA_API_KEY=nvapi-...
GROQ_API_KEY=gsk_...

# Optional: OpenRouter base URL override
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
```

## Testing Guest Access

### Local Testing

1. Start the application without logging in
2. Ensure `OPENROUTER_API_KEY` is set in `.env`
3. Open the chat interface
4. Verify "Llama 3.3 70B (Free - Default)" is selected
5. Send a message
6. Check that response is generated successfully

### Rate Limit Testing

```bash
# Send multiple requests to test rate limiting
for i in {1..105}; do
  curl -X POST http://localhost:3000/api/agent/chat \
    -H "Content-Type: application/json" \
    -d '{"message":{"content":"test"},"focusMode":"webSearch","chatModel":{"providerId":"","key":""}}' \
    -H "X-Forwarded-For: 192.168.1.100"
done
```

### Verify Free Models

1. Click the model selector
2. Verify all models marked "(Free)" are visible
3. Select different free models
4. Confirm they work without errors

## Production Deployment

### Docker Compose

```yaml
services:
  qwksearch-web:
    image: qwksearch-web:latest
    environment:
      - OPENROUTER_API_KEY=${OPENROUTER_API_KEY}
      - GUEST_DAILY_LIMIT=100
    ports:
      - "3000:3000"
```

### Kubernetes

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: openrouter-secret
type: Opaque
stringData:
  OPENROUTER_API_KEY: sk-or-v1-...
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: qwksearch-web
spec:
  template:
    spec:
      containers:
      - name: web
        env:
        - name: OPENROUTER_API_KEY
          valueFrom:
            secretKeyRef:
              name: openrouter-secret
              key: OPENROUTER_API_KEY
        - name: GUEST_DAILY_LIMIT
          value: "100"
```

## Resources

- [OpenRouter Documentation](https://openrouter.ai/docs)
- [OpenRouter Free Models](https://openrouter.ai/models?free=true)
- [OpenRouter API Keys](https://openrouter.ai/settings/keys)
- [Language Models Database](packages/agent-toolkit/src/config/language-models-database.ts)
- [Model Registry](packages/agent-toolkit/src/config/model-registry.ts)
- [Provider UI Config](packages/agent-toolkit/src/config/provider-ui-config.ts)
