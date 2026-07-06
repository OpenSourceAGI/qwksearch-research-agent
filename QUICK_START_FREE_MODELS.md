# Quick Start: Free Models for Guests

## 🚀 30-Second Setup

### For Server Operators

```bash
# 1. Add ONE API key to .env
echo "OPENROUTER_API_KEY=sk-or-v1-..." >> .env

# 2. Restart
docker-compose restart

# 3. Done! ✅
```

Guests can now chat for free with **Nemotron 70B** (131K context, unlimited).

---

## 📋 API Key Options

| Provider | Speed | Limits | Get Key |
|----------|-------|--------|---------|
| **OpenRouter** ⭐ | ⚡⚡⚡ | None | [openrouter.ai/settings/keys](https://openrouter.ai/settings/keys) |
| **Groq** | ⚡⚡⚡⚡ | 432M/day | [console.groq.com/keys](https://console.groq.com/keys) |
| **NVIDIA** | ⚡⚡⚡ | Free tier | [build.nvidia.com](https://build.nvidia.com/settings/api-keys) |

⭐ = Recommended for guests (no daily limits)

---

## 🎯 What Guests Get

| With OpenRouter | With Groq | With NVIDIA |
|-----------------|-----------|-------------|
| Nemotron 70B | Llama 3.3 70B | Nemotron 3 Super 120B |
| 131K context | 131K context | 128K context |
| Unlimited | 432M tokens/day | Free tier |
| 20+ free models | 9 free models | 5+ free models |

---

## ⚡ Quick Commands

```bash
# Check if working
docker logs qwksearch-web | grep "ModelRegistry"

# View guest rate limits
docker logs qwksearch-web | grep "guest rate limit"

# Adjust guest limit (default: 100/day)
echo "GUEST_DAILY_LIMIT=500" >> .env
docker-compose restart
```

---

## ❓ FAQ

**Q: Do I need all three API keys?**  
A: No! Just ONE is enough. OpenRouter is recommended.

**Q: Do free models cost anything?**  
A: **$0** - They're completely free, no charges.

**Q: Will guests need to sign up?**  
A: **No** - They can chat immediately without accounts.

**Q: What if I don't add any API keys?**  
A: App shows "No providers configured" - at least one key is required.

**Q: Which is fastest?**  
A: **Groq** has the fastest inference, but has daily limits.

---

## 🎓 Full Documentation

- [Complete Setup Guide](GUEST_FREE_MODELS_FINAL.md) - Detailed instructions
- [All Free Models](docs/OPENROUTER_FREE_MODELS.md) - Model list & features
- [Guest Access Details](GUEST_ACCESS_SETUP.md) - Security & rate limiting

---

**That's it!** One environment variable, unlimited guest access. 🎉
