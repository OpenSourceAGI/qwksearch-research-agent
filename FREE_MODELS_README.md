# Free AI Models - Quick Start Guide

## 🎉 No Cost, Full Features

QwkSearch now offers **free, high-quality AI models** for both guests and logged-in users. No credit card required!

## 🚀 Quick Start (30 seconds)

### For Guests (No Account Needed)

If the server has OpenRouter configured, you can use it immediately:

1. Visit the application
2. Start chatting - Llama 3.3 70B is ready to use
3. **That's it!** No signup, no API keys

### For Personal Use

Get your own free API key for unlimited access:

1. Visit [openrouter.ai](https://openrouter.ai) and sign up
2. Get your API key from [Settings > API Keys](https://openrouter.ai/settings/keys)
3. Add it in Settings → Model Providers → Add Provider → OpenRouter
4. Enjoy unlimited free model access!

## 🎯 Best Free Models

| Model | Context | Best For | Speed |
|-------|---------|----------|-------|
| **Llama 3.3 70B** ⭐ | 131K | General chat, reasoning | ⚡⚡⚡ |
| **Nemotron 70B** | 131K | Coding, technical | ⚡⚡⚡ |
| **Qwen 2.5 72B** | 131K | Multilingual, fast | ⚡⚡⚡⚡ |
| **DeepSeek V3** | 64K | Long-form analysis | ⚡⚡ |
| **DeepSeek R1** | 64K | Problem-solving | ⚡⚡ |

⭐ = Default model

## 💡 When to Use What

```
📝 General questions → Llama 3.3 70B (default)
💻 Coding help      → Nemotron 70B
🌍 Multilingual     → Qwen 2.5 72B
📊 Long analysis    → DeepSeek V3
🧩 Math/logic       → DeepSeek R1
⚡ Quick answers    → DeepSeek V4 Flash
```

## 🔧 Server Setup (Optional)

To enable guest access, add one environment variable:

```bash
# .env
OPENROUTER_API_KEY=sk-or-v1-...
```

**Get your key:** [openrouter.ai/settings/keys](https://openrouter.ai/settings/keys)

That's it! All free models are now available to everyone.

## 📊 All Free Models (15+)

### Large Context Models (128K-200K)
- **Llama 3.3 70B** (131K) - Meta's latest, best all-around
- **Nemotron 70B** (131K) - NVIDIA's coding specialist  
- **Qwen 2.5 72B** (131K) - Fast multilingual
- **Nemotron 3 Super 120B** (128K) - Most powerful free model
- **OpenRouter Free** (200K) - Largest context window
- **Phi-3 Mini/Medium** (128K) - Microsoft's efficient models

### Specialized Models
- **DeepSeek V3/V4** (64K) - Analysis & fast inference
- **DeepSeek R1** (64K) - Reasoning & problem-solving
- **Qwen3 Coder** (32K) - Code generation
- **Gemma 4 31B** (131K) - Google's efficient model
- **Hermes 3 70B** (131K) - Instruction following

### Fast & Lightweight
- **Mistral 7B** (32K) - Quick responses
- **MythoMax L2 13B** (8K) - Creative writing
- **Toppy M 7B** (4K) - Very fast

## 💰 Cost Comparison

| Provider | Free Tier | Cost |
|----------|-----------|------|
| **OpenRouter Free Models** | ✅ Unlimited | **$0** |
| OpenAI GPT-4o | ❌ No free tier | $2.50-$10/1M tokens |
| Anthropic Claude | ❌ No free tier | $3-$15/1M tokens |
| Google Gemini | ⚠️ Limited free | $1.25-$5/1M tokens |

**Total savings:** $1000+/year for typical usage

## 🛡️ Rate Limits

### With Server-Provided Key (Guests)
- 100 requests/day per IP (configurable)
- Resets daily at midnight UTC
- Helpful error message when limit reached

### With Personal Key
- ✅ No daily limits
- ✅ Unlimited requests
- ✅ Your own rate limits apply

## ❓ FAQ

### Do I need an account?
**No!** If the server has OpenRouter configured, just start chatting.

### Are these models any good?
**Yes!** Llama 3.3 70B competes with GPT-4o and Claude for many tasks.

### What's the catch?
**No catch!** OpenRouter sponsors free access to these models. Just use responsibly.

### Can I use my own API key?
**Yes!** Add your own OpenRouter key in Settings for unlimited access.

### What if I hit the rate limit?
Wait for the daily reset, or add your own API key for unlimited access.

### Which model should I use?
Start with **Llama 3.3 70B** (the default). It's great for everything!

## 🔗 Useful Links

- [OpenRouter](https://openrouter.ai) - Get your free API key
- [OpenRouter Models](https://openrouter.ai/models?free=true) - Browse all free models
- [Guest Access Setup](./GUEST_ACCESS_SETUP.md) - Detailed setup guide
- [AI Model Guide](./AI_MODEL_GUIDE.md) - Complete configuration reference

## 🎓 Examples

### Simple Chat
```
User: What is quantum computing?
Llama 3.3 70B: Quantum computing is a revolutionary approach to computation...
```

### Coding Help
```
User: Write a Python function to sort a list
Nemotron 70B: Here's an efficient implementation...
```

### Multilingual
```
User: Translate "hello" to 10 languages
Qwen 2.5 72B: 1. Spanish: Hola, 2. French: Bonjour...
```

## 📈 Upgrade Path

Start free, upgrade when needed:

1. **Start:** Free models (Llama 3.3 70B)
2. **Grow:** Add your own OpenRouter key
3. **Scale:** Premium models (Claude, GPT-4o) for production

No lock-in, switch anytime!

---

**Questions?** Check the [full documentation](./GUEST_ACCESS_SETUP.md) or [open an issue](https://github.com/your-repo/issues).
