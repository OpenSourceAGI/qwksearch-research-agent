# Quick Reference Guide

Fast reference for common tasks and configurations.

## 🚀 Getting Started (5 Minutes)

### Step 1: Install
```bash
git clone <repo>
cd qwksearch-research-agent
bun install
```

### Step 2: Configure Free AI
```bash
# Get free API key from https://openrouter.ai
echo 'OPENROUTER_API_KEY=sk-or-v1-...' >> .env
```

### Step 3: Run
```bash
bun run dev
# Open http://localhost:3000
```

That's it! You're using **free AI models** now.

## 💰 Free AI Providers

| Provider | Signup | Free Models | Speed | Best For |
|----------|--------|-------------|-------|----------|
| **OpenRouter** | [openrouter.ai](https://openrouter.ai) | Llama 3.3 70B, Nemotron, DeepSeek | Fast | **General use (Recommended)** |
| **Groq** | [console.groq.com](https://console.groq.com) | Llama, Mixtral | Ultra-fast | Speed-critical apps |
| **NVIDIA** | [build.nvidia.com](https://build.nvidia.com) | Nemotron, Llama | Fast | Technical content |
| **Ollama** | [ollama.com](https://ollama.com) | Any model | Medium | 100% local, no internet |

## 🔑 Environment Variables

### Minimal Setup (Free)
```bash
# .env file
OPENROUTER_API_KEY=sk-or-v1-...
BETTER_AUTH_SECRET=<generate-random-string>
DATABASE_URL=file:./data/qwksearch.db
```

### Full Setup
```bash
# AI Providers (pick one or more)
OPENROUTER_API_KEY=sk-or-v1-...    # Free models
GROQ_API_KEY=gsk_...               # Free & fast
NVIDIA_API_KEY=nvapi-...           # Free tier
ANTHROPIC_API_KEY=sk-ant-...       # Premium
OPENAI_API_KEY=sk-...              # Premium

# Authentication
BETTER_AUTH_SECRET=<your-secret>
GOOGLE_CLIENT_ID=<your-id>.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<your-secret>

# Email (production only)
# No API key needed - configure DNS instead

# Database
DATABASE_URL=file:./data/qwksearch.db
```

## 📧 Email Setup (Production)

### DNS Configuration
```bash
# Add TXT record to your domain:
Type: TXT
Name: @
Value: v=spf1 a mx include:relay.mailchannels.net ~all
```

### App Configuration
```typescript
// apps/qwksearch-web/lib/config/site.ts
export const APP_EMAIL = "noreply@yourdomain.com"
export const APP_NAME = "Your App Name"
```

### Deploy
```bash
bun run deploy  # Must deploy to Cloudflare Workers
```

No API key needed - emails work automatically! ✨

## 🎯 Common Commands

### Development
```bash
bun run dev              # Start dev server
bun run build            # Build for production
bun run preview          # Preview production build
```

### Database
```bash
bun run db:generate      # Generate migrations
bun run db:push          # Push to local SQLite
bun run db:studio        # Open Drizzle Studio
```

### Deployment
```bash
bun run deploy           # Deploy to Cloudflare
bun run deploy:staging   # Deploy to staging
```

## 🔍 Troubleshooting

### "No model providers configured"
```bash
# Add at least one API key to .env:
echo 'OPENROUTER_API_KEY=sk-or-v1-...' >> .env
# Restart dev server
```

### Emails not sending
```bash
# Check:
1. SPF record configured? (dig TXT yourdomain.com)
2. Deployed to Cloudflare? (not localhost)
3. APP_EMAIL matches your domain?
```

### Rate limit errors
```bash
# Solutions:
1. Add multiple providers for failover
2. Check provider dashboard for usage
3. Upgrade to paid tier if needed
```

### Dev server won't start
```bash
# Fix:
rm -rf node_modules .next
bun install
bun run dev
```

## 🎨 Model Selection

### In UI
1. Click model selector button in chat
2. Choose from available models
3. Free models show "(Free)" label

### In Code
```typescript
// Default: Uses free OpenRouter models automatically
// Override in API call:
const result = await generateText({
  model: 'meta-llama/llama-3.3-70b-instruct',
  messages,
});
```

## 📊 Cost Estimates

### Free Tier Limits

| Provider | Rate Limit | Daily Limit | Cost |
|----------|------------|-------------|------|
| OpenRouter | ~20/min | Varies | $0 |
| Groq | ~30/min | 14,400 | $0 |
| NVIDIA | Variable | ~100 | $0 |
| Ollama | Unlimited | Unlimited | $0 |

### Paid Options (Optional)

| Model | Cost (per 1M tokens) | Best For |
|-------|---------------------|----------|
| Claude 3.7 Sonnet | $3/$15 | Complex reasoning |
| GPT-4o | $2.50/$10 | General purpose |
| Gemini 2.5 Pro | $1.25/$5 | Long context |

## 🔐 Security

### Protect Your Keys
```bash
# Never commit .env files
echo '.env' >> .gitignore
echo '.env.local' >> .gitignore

# Use separate keys for dev/prod
# Rotate keys regularly
```

### Environment Best Practices
```bash
# Development
.env.local  # Local overrides (gitignored)

# Production
# Use Cloudflare secrets or environment variables
wrangler secret put OPENROUTER_API_KEY
```

## 🌐 Deployment Checklist

- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Email DNS records added (if using magic links)
- [ ] API keys valid and have sufficient quota
- [ ] Build succeeds locally (`bun run build`)
- [ ] Cloudflare account set up
- [ ] Deploy script configured (`wrangler.toml`)

## 📱 Model Recommendations

### By Use Case

**Chat / General Q&A**
- Free: Llama 3.3 70B (OpenRouter)
- Fast: Groq Llama 3.3 70B
- Premium: Claude 3.7 Sonnet

**Code Generation**
- Free: Qwen 2.5 72B (OpenRouter)
- Fast: Groq Llama
- Premium: GPT-4o

**Long Context (>32K tokens)**
- Free: Llama 3.3 70B (131K)
- Premium: Gemini 2.5 Pro (1M)

**Local/Offline**
- Ollama (any model)

**Speed Critical**
- Groq (any model) - Ultra-fast
- Cloudflare Workers AI

## 🔗 Important Links

### Documentation
- [Email Setup](./EMAIL_SETUP.md)
- [AI Model Configuration](./AI_MODEL_CONFIGURATION.md)
- [Migration Guide](./MIGRATION_RESEND_TO_CLOUDFLARE.md)

### External Services
- [OpenRouter Dashboard](https://openrouter.ai/activity)
- [Groq Console](https://console.groq.com)
- [NVIDIA Build](https://build.nvidia.com)
- [Cloudflare Dashboard](https://dash.cloudflare.com)

### API Keys
- [OpenRouter Keys](https://openrouter.ai/settings/keys)
- [Groq Keys](https://console.groq.com/keys)
- [NVIDIA Keys](https://build.nvidia.com/settings/api-keys)
- [Anthropic Keys](https://console.anthropic.com/settings/keys)
- [OpenAI Keys](https://platform.openai.com/api-keys)

## 💡 Tips & Tricks

### Cost Optimization
```bash
# 1. Start with free models
OPENROUTER_API_KEY=...  # Free Llama 3.3 70B

# 2. Use Ollama for dev (100% free)
ollama pull llama3.2
ollama serve

# 3. Add multiple providers for failover
OPENROUTER_API_KEY=...
GROQ_API_KEY=...
NVIDIA_API_KEY=...
```

### Performance
```bash
# Use Groq for speed
GROQ_API_KEY=...  # Fastest inference

# Use smaller models for simple tasks
# Use larger models only when needed
```

### Reliability
```bash
# Configure multiple providers
# System automatically falls back if one fails
```

## ❓ FAQ

**Q: Do I need an API key?**  
A: Yes, at least one. OpenRouter offers free models.

**Q: Does email work locally?**  
A: Email sending works best on Cloudflare Workers. For local testing, deploy to a staging environment.

**Q: Which provider should I use?**  
A: Start with OpenRouter (free Llama 3.3 70B). Add Groq if you need speed.

**Q: How much does it cost?**  
A: $0 with free providers. Email is also free on Cloudflare.

**Q: Can I use multiple providers?**  
A: Yes! Add multiple API keys for automatic failover.

**Q: Is Ollama really free?**  
A: Yes, 100% free. Runs locally on your machine.

## 🆘 Get Help

1. Check this guide first
2. Read full documentation in `docs/`
3. Search existing GitHub issues
4. Open a new issue with details

---

**Last Updated**: 2026-07-04  
**For detailed guides**, see the [docs/](.) folder
