# OpenRouter Free Models Configuration

## Summary

Added comprehensive free model support from OpenRouter with **Nemotron 3 Nano 30B MoE** set as the default model for the platform.

## Changes Made

### 1. Default Model Update
**File**: `packages/agent-toolkit/src/config/language-models-database.ts`

- **Changed OpenRouter default** from `openrouter/free` to `nvidia/llama-nemotron-3-nano-30b-moe:free`
- Nemotron 3 Nano 30B MoE is now the **first model** in the OpenRouter models list (ensures it's used as fallback)

### 2. New Free Models Added

Added **15 additional free models** from OpenRouter:

#### High-Performance Models
1. **Nemotron 3 Nano 30B MoE** (NEW DEFAULT) - 128K context, MoE architecture
2. **Nemotron 3 Super 120B** - 128K context, most powerful free model
3. **Llama 3.3 70B** - 131K context, Meta's latest
4. **Qwen 2.5 72B** - 131K context, excellent for general tasks
5. **Hermes 3 70B** - 131K context, fine-tuned for following instructions

#### Specialized Models
6. **DeepSeek V3** - 64K context, great for coding
7. **DeepSeek V4 Flash** - 64K context, fast inference
8. **Qwen3 Coder** - 32K context, optimized for code generation
9. **Gemma 4 31B IT** - 131K context, Google's efficient model
10. **GLM 4.5 Air** - 128K context, multilingual support

#### Smaller Efficient Models
11. **Phi-3 Mini 128K** - 128K context, Microsoft's efficient model
12. **Phi-3 Medium 128K** - 128K context, balance of size and quality
13. **Mistral 7B** - 32K context, lightweight and fast
14. **MythoMax L2 13B** - 8K context, creative writing
15. **Toppy M 7B** - 4K context, fast responses

### 3. Model Metadata

All models include:
- ✅ **Free tier**: `free: true`
- ✅ **Type**: `text-generation`
- ✅ **Context length**: Properly specified
- ✅ **Rate limits**: "No daily limit - $0 per 1M tokens"

## Why Nemotron 3 Nano 30B MoE?

Chosen as default for these reasons:

1. **Best Balance**: 30B MoE architecture provides excellent quality-to-speed ratio
2. **Large Context**: 128K context window handles long conversations
3. **Efficient**: MoE (Mixture of Experts) means fast inference despite large capacity
4. **Free**: No cost, no daily limits
5. **NVIDIA-backed**: Professional model from a trusted provider

## Testing

Added comprehensive test suite:
- ✅ Verifies Nemotron 3 Nano is default
- ✅ Confirms it's first in model list
- ✅ Validates all free models have proper metadata
- ✅ Checks documentation links

**Test file**: `packages/agent-toolkit/test/openrouter-default-model.test.js`

All 7 tests passing ✅

## How It Works

### Model Selection Priority

1. **User-saved preference** (localStorage)
2. **Provider's default model** (Nemotron 3 Nano 30B MoE for OpenRouter)
3. **First available model** in provider's list

### Provider Fallback Order

When no specific provider is selected:

1. **OpenRouter** (no daily limits, largest model variety)
2. **Groq** (fastest inference, but has daily limits)
3. **NVIDIA** (free tier available)
4. First configured provider

## Usage

Users can:

1. **Use default**: Automatically get Nemotron 3 Nano 30B MoE with OpenRouter
2. **Select from 15+ free models**: Via the model selector in the UI
3. **Switch providers**: OpenRouter, NVIDIA, Groq all have free tiers
4. **No API key needed**: For OpenRouter free tier (though recommended for better rate limits)

## Files Modified

1. `packages/agent-toolkit/src/config/language-models-database.ts`
   - Updated OpenRouter default model
   - Added 15+ new free models
   - Improved model metadata

2. `packages/agent-toolkit/test/openrouter-default-model.test.js` (NEW)
   - Comprehensive test coverage
   - Validates configuration correctness

## Deployment Notes

- ✅ **No breaking changes**: Existing configurations continue to work
- ✅ **Backward compatible**: Users with saved preferences keep their selection
- ✅ **No database migration needed**: Pure configuration change
- ✅ **No API key required**: Free models work without authentication (though rate limits are more generous with a key)

## Related Work

This complements the recent Tavily query sanitization fix:
- `packages/extract-webpage/src/search/metaSearchAgent.ts`
- `packages/extract-webpage/src/search/tavily.ts`
- `packages/extract-webpage/test/tavily-query-sanitization.test.js`

Both improvements make the research agent more robust and accessible to users without API keys.
