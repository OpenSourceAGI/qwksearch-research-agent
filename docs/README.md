# Documentation

Welcome to the QwkSearch documentation! This folder contains guides for configuring and using the application.

## 📚 Available Guides

### Email & Authentication

- **[EMAIL_SETUP.md](./EMAIL_SETUP.md)** - Complete guide for configuring Cloudflare Email Service for magic link authentication
- **[MIGRATION_RESEND_TO_CLOUDFLARE.md](./MIGRATION_RESEND_TO_CLOUDFLARE.md)** - Step-by-step migration guide from Resend to Cloudflare Email Service

### AI Models & Configuration

- **[AI_MODEL_CONFIGURATION.md](./AI_MODEL_CONFIGURATION.md)** - Comprehensive guide for configuring AI models, including free options from OpenRouter, NVIDIA, Groq, and Ollama

## 🚀 Quick Start

### Free AI Models Setup

1. Get a free OpenRouter API key at [openrouter.ai](https://openrouter.ai)
2. Add to `.env`:
   ```bash
   OPENROUTER_API_KEY=sk-or-v1-...
   ```
3. Start using free models (Llama 3.3 70B, Nemotron, etc.)

See [AI_MODEL_CONFIGURATION.md](./AI_MODEL_CONFIGURATION.md) for details.

### Email Setup

1. Configure SPF DNS record for your domain
2. Update `APP_EMAIL` in `lib/config/site.ts`
3. Deploy to Cloudflare Workers
4. Magic links work automatically!

See [EMAIL_SETUP.md](./EMAIL_SETUP.md) for details.

## 💡 Key Features

### Cost Savings

- **Free AI Models**: Llama 3.3 70B, Nemotron, DeepSeek, and more via OpenRouter
- **Free Email**: Unlimited emails via Cloudflare Email Service
- **Local Development**: Run Ollama locally with zero API costs

### Easy Configuration

- **No API Keys Needed**: Email works automatically on Cloudflare
- **Multiple Providers**: OpenRouter, NVIDIA, Groq, Ollama, and more
- **Automatic Fallback**: System picks the best available provider

### Production Ready

- **Reliable**: Built on Cloudflare's infrastructure
- **Scalable**: Handle any volume of emails and API requests
- **Fast**: Groq offers ultra-fast inference for free

## 🔧 Configuration Files

### Environment Variables

```bash
# .env or .env.local

# AI Providers (all optional, use what you need)
OPENROUTER_API_KEY=sk-or-v1-...    # Free models available
NVIDIA_API_KEY=nvapi-...           # Free tier available
GROQ_API_KEY=gsk_...               # Free & fast
ANTHROPIC_API_KEY=sk-ant-...       # Premium (Claude)
OPENAI_API_KEY=sk-...              # Premium (GPT)

# Authentication
BETTER_AUTH_SECRET=your-secret-key
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Database
DATABASE_URL=file:./data/qwksearch.db
```

### Model Configuration

Models are configured in:
- `packages/agent-toolkit/src/config/language-models-database.ts`
- `packages/agent-toolkit/src/config/model-registry.ts`

See [AI_MODEL_CONFIGURATION.md](./AI_MODEL_CONFIGURATION.md) for customization.

## 📖 Additional Resources

### External Documentation

- [OpenRouter Models](https://openrouter.ai/models) - Browse all available models
- [NVIDIA NIM](https://build.nvidia.com) - NVIDIA AI model catalog
- [Groq Console](https://console.groq.com) - Fast inference platform
- [Ollama](https://ollama.com) - Local model runtime
- [Cloudflare Workers](https://developers.cloudflare.com/workers/) - Deployment platform
- [MailChannels](https://mailchannels.zendesk.com) - Email API docs

### Pricing References

- **OpenRouter**: Free and paid models, transparent pricing
- **NVIDIA**: Free tier + pay-as-you-go
- **Groq**: Generous free tier
- **Cloudflare**: Free Workers tier (100k requests/day)

## 🆘 Troubleshooting

### Common Issues

**Q: AI models not working**
- Check that you have at least one provider API key configured
- Verify the API key is valid
- Check provider rate limits

**Q: Emails not sending**
- Verify SPF DNS record is configured
- Check that you're deployed to Cloudflare Workers
- Ensure `APP_EMAIL` matches your domain

**Q: "No model providers configured" error**
- Add at least one API key to your `.env` file
- Restart the development server
- Check Settings → Model Providers in the UI

**Q: Rate limit errors**
- Free tiers have rate limits
- Add multiple providers for failover
- Consider upgrading to paid tier

### Getting Help

- Check the relevant guide in this `docs/` folder
- Search existing issues in the repository
- Open a new issue with details about your problem
- Include error messages and environment info

## 🔄 Recent Changes

### Latest Updates

- ✅ Migrated from Resend to Cloudflare Email Service (free)
- ✅ Default to free OpenRouter models (Llama 3.3 70B)
- ✅ Added Nemotron and other free models
- ✅ Improved provider fallback logic
- ✅ Better UI descriptions for free tiers

See [MIGRATION_RESEND_TO_CLOUDFLARE.md](./MIGRATION_RESEND_TO_CLOUDFLARE.md) for migration details.

## 📝 Contributing

Found an issue or have a suggestion for the documentation?

1. Check if it's already documented
2. Open an issue or PR
3. Be specific about what's unclear or missing

## 📄 License

This documentation is part of the QwkSearch project. See the main repository for license information.
