# NVIDIA Cloud Free Tier Models Validation Results

**Date:** 2026-07-05
**Test Duration:** 15.50s
**API:** https://integrate.api.nvidia.com/v1

## Summary

- **Total Tested:** 10 free tier models
- **Working:** 2 models (20%)
- **Not Working:** 8 models (80%)

## ✅ Working Models (Guest-Accessible)

These models are currently working and should be included in the guest-accessible list:

1. **Llama 3.1 8B Instruct** (`meta/llama-3.1-8b-instruct`)
   - Latency: 421ms
   - Context Length: 131,072 tokens
   - Status: ✓ Responsive

2. **Nemotron 3 Super 120B** (`nvidia/nemotron-3-super-120b-a12b`)
   - Latency: 511ms
   - Context Length: 1,000,000 tokens
   - Status: ✓ Responsive

## ❌ Not Working Models

These models should be excluded from guest access:

### 404 Not Found (6 models)
Models returning 404 errors - likely not available on the free tier or model IDs have changed:

- `moonshotai/kimi-k2.5` - Kimi K2.5
- `deepseek-ai/deepseek-v3` - DeepSeek V3
- `z-ai/glm-4.5-air` - GLM 4.5 Air
- `mistralai/mistral-nemo` - Mistral Nemo
- `qwen/qwen2.5-72b-instruct` - Qwen2.5 72B Instruct
- `meta/llama-3.1-70b-code-instruct` - CodeLlama 70B Instruct

### Timeout (2 models)
Models taking longer than 15 seconds to respond:

- `meta/llama-3.3-70b-instruct` - Llama 3.3 70B Instruct
- `google/gemma-4-31b-it` - Gemma 4 31B IT

## Recommendations

1. **Update Guest Model List:** Only include the 2 working models for guest users:
   ```typescript
   const NVIDIA_GUEST_MODELS = [
     "meta/llama-3.1-8b-instruct",
     "nvidia/nemotron-3-super-120b-a12b"
   ];
   ```

2. **Remove Invalid Models:** The 6 models returning 404 errors should be removed from the database or marked as unavailable.

3. **Investigate Timeouts:** The 2 timeout models may need longer timeout periods or may be experiencing rate limiting.

4. **Regular Validation:** Run this validation weekly to catch changes in model availability:
   ```bash
   bun run validate:nvidia
   ```

## How to Run Validation

```bash
# Standard validation
bun run validate:nvidia

# JSON output
bun run validate:nvidia:json

# Custom parameters
export NVIDIA_API_KEY=your-key
bun run scripts/validate-nvidia-models.ts --concurrency 5 --timeout 20000
```

## Script Location

- Validation utility: `apps/qwksearch-web/lib/utils/validate-nvidia-models.ts`
- CLI script: `apps/qwksearch-web/scripts/validate-nvidia-models.ts`
