# OpenRouter Free Models Validation System

**Status:** ✅ Ready to use  
**Created:** 2026-07-05  
**Purpose:** Ensure guests and new users only access working OpenRouter free models

## Overview

This system validates which OpenRouter free models actually work with your configured API key (`OPENROUTER_API_KEY` in `.env`). Only validated models are shown to guests and new users, preventing errors from broken or unavailable models.

## Quick Start

```bash
# Run validation
npm run validate:openrouter

# Get JSON output
npm run validate:openrouter:json
```

## What Was Created

### Core Files

1. **`lib/utils/validate-openrouter-models.ts`**
   - Core validation logic
   - Tests each model with actual API calls
   - Returns list of working vs broken models

2. **`lib/utils/guest-model-filter.ts`**
   - Filters models for guest access
   - Provides recommended default models
   - Helper functions for model access checks

3. **`scripts/validate-openrouter-models.ts`**
   - CLI script for running validation
   - Supports custom concurrency and timeout
   - JSON output option

4. **`app/api/agent/validate-openrouter/route.ts`**
   - API endpoint for validation
   - GET returns cached results (24h TTL)
   - POST forces fresh validation

### Documentation

1. **`lib/utils/README.md`** - Complete system documentation
2. **`lib/utils/INTEGRATION_GUIDE.md`** - Step-by-step integration guide
3. **`docs/OPENROUTER_VALIDATION.md`** - This file

### Package Scripts

Added to `package.json`:
```json
{
  "validate:openrouter": "tsx scripts/validate-openrouter-models.ts",
  "validate:openrouter:json": "tsx scripts/validate-openrouter-models.ts --json"
}
```

## How It Works

### 1. Validation Process

```
Load Free Models → Test Each Model → Filter Results → Return List
                     (concurrent)     (working vs broken)
```

- Gets all free OpenRouter models from database
- Tests each with a simple "Reply with 'OK'" prompt
- Runs 3 concurrent tests by default (configurable)
- 15-second timeout per model (configurable)
- Returns working and broken model lists

### 2. Guest Filtering

```
API Request → Get Active Providers → Filter OpenRouter → Return to Client
                                    (only working models)
```

- Only filters OpenRouter (other providers need user's own key)
- Uses cached validation results (24h TTL)
- Non-strict mode: returns all if validation fails (prevents breaking app)
- Recommended models prioritized in model selector

## Usage Examples

### Run Validation

```bash
# Basic validation
npm run validate:openrouter

# With custom options
tsx scripts/validate-openrouter-models.ts --concurrency 5 --timeout 20000

# JSON output
npm run validate:openrouter:json > results.json
```

### Use in Code

```typescript
import { validateOpenRouterModels, getValidatedFreeModels } from '@/lib/utils/validate-openrouter-models';
import { filterModelsForGuests, getDefaultGuestModel } from '@/lib/utils/guest-model-filter';

// Run validation
const result = await validateOpenRouterModels();
console.log(`${result.availableModels.length} working models`);

// Get working model IDs
const validatedIds = await getValidatedFreeModels();

// Filter models for guests
const guestModels = filterModelsForGuests(allModels, 'openrouter', {
  validatedModelIds: validatedIds
});

// Get recommended default
const defaultModel = getDefaultGuestModel(validatedIds);
```

### API Endpoint

```bash
# Get validation results (cached)
curl http://localhost:3000/api/agent/validate-openrouter

# Force fresh validation
curl -X POST http://localhost:3000/api/agent/validate-openrouter
```

## Recommended Models

The system prioritizes these models for guests:

1. **nvidia/nemotron-3-super-120b-a12b:free** (1M context) - Best overall
2. **nvidia/nemotron-3-ultra-550b-a55b:free** (1M context) - Most capable
3. **qwen/qwen3-coder:free** (1M context) - Best for code
4. **meta-llama/llama-3.3-70b-instruct:free** (131K context) - Very reliable
5. **openrouter/free** (200K context) - Auto-router fallback

## Integration Steps

### Step 1: Validate Models

```bash
npm run validate:openrouter
```

Review the output to see which models work with your API key.

### Step 2: Integrate with Providers API

Modify `app/api/agent/providers/route.ts` to filter models:

```typescript
import { filterModelsForGuests } from "@/lib/utils/guest-model-filter";

// In GET handler
const guestFilteredProviders = activeProviders.map(provider => {
  if (provider.type === 'openrouter' && isEnvBasedProvider(provider)) {
    return {
      ...provider,
      chatModels: filterModelsForGuests(
        provider.chatModels,
        provider.type,
        { strictMode: false }
      )
    };
  }
  return provider;
});
```

### Step 3: Set Up Caching (Production)

For production, cache validation results in Cloudflare KV:

```typescript
// Store validation results
await env.KV.put('openrouter-validated-models', JSON.stringify({
  modelIds: validatedIds,
  timestamp: Date.now()
}), { expirationTtl: 86400 }); // 24 hours
```

### Step 4: Schedule Daily Validation

Add to `wrangler.toml`:

```toml
[triggers]
crons = ["0 0 * * *"]  # Daily at midnight
```

## Configuration

### Environment Variables

```bash
# Required
OPENROUTER_API_KEY=sk-or-v1-...

# Optional (future use)
GUEST_RATE_LIMIT_RPM=10
GUEST_RATE_LIMIT_TPM=50000
```

### Validation Options

```typescript
await validateOpenRouterModels(
  3,      // concurrency (default: 3)
  15000,  // timeout in ms (default: 15000)
  (current, total, modelName) => {
    console.log(`Testing ${current}/${total}: ${modelName}`);
  }
);
```

## Output Examples

### CLI Output

```
=== OpenRouter Free Models Validator ===

[1/25] Nemotron 3 Super 120B: ✓ (1234ms)
[2/25] Gemma 4 31B IT: ✓ (876ms)
[3/25] Some Broken Model: ✗ (Model not available)
...

=== Summary ===
Total tested: 25
Available: 18
Unavailable: 7

=== Validated Models for Guest/New User Access ===
These models should be included in the guest-accessible list:
  "nvidia/nemotron-3-super-120b-a12b:free",  // Nemotron 3 Super 120B
  "google/gemma-4-31b-it:free",  // Gemma 4 31B IT
  ...

✓ Validation complete in 45.23s
```

### API Response

```json
{
  "totalTested": 25,
  "availableModels": [
    {
      "modelId": "nvidia/nemotron-3-super-120b-a12b:free",
      "modelName": "Nemotron 3 Super 120B",
      "available": true,
      "latency": 1234,
      "testTimestamp": "2026-07-05T12:34:56.789Z"
    }
  ],
  "unavailableModels": [
    {
      "modelId": "some-broken-model:free",
      "modelName": "Broken Model",
      "available": false,
      "error": "Model not available",
      "latency": 2000,
      "testTimestamp": "2026-07-05T12:34:58.789Z"
    }
  ],
  "testDuration": 45230,
  "apiKeyPresent": true,
  "cached": false
}
```

## Monitoring

### Check Validation Status

```bash
# Run validation and check exit code
npm run validate:openrouter && echo "✓ All models validated"

# Check specific model
tsx scripts/validate-openrouter-models.ts --json | jq '.availableModels[] | select(.modelId=="nvidia/nemotron-3-super-120b-a12b:free")'
```

### Monitor Failure Rate

```typescript
const result = await validateOpenRouterModels();
const failureRate = result.unavailableModels.length / result.totalTested;

if (failureRate > 0.5) {
  console.error(`⚠️  ${(failureRate * 100).toFixed(0)}% models unavailable`);
  // Send alert
}
```

## Troubleshooting

### All Models Unavailable

**Symptoms:** Validation shows 0 available models

**Solutions:**
1. Check `OPENROUTER_API_KEY` in `.env`
2. Verify key at https://openrouter.ai/settings/keys
3. Check OpenRouter status: https://openrouter.ai/status
4. Try increasing timeout: `--timeout 30000`

### Validation Timeout

**Symptoms:** Script hangs or takes very long

**Solutions:**
1. Reduce concurrency: `--concurrency 2`
2. Increase timeout: `--timeout 20000`
3. Check network connection

### Models Work Manually But Fail Validation

**Symptoms:** Can use model directly but validation fails

**Solutions:**
1. Increase timeout for slower models
2. Check if model requires special parameters
3. Test individual model with longer timeout

## Best Practices

1. ✅ Run validation daily (via cron)
2. ✅ Cache results in KV (not in-memory)
3. ✅ Use non-strict mode in production
4. ✅ Monitor failure rates
5. ✅ Set reasonable timeouts (15s)
6. ✅ Limit concurrency (3-5)
7. ✅ Log validation results

## Future Enhancements

- [ ] KV caching implementation
- [ ] Scheduled validation via Workers Cron
- [ ] Admin UI for validation results
- [ ] Webhook alerts for failures
- [ ] Model performance tracking
- [ ] A/B testing different defaults
- [ ] User feedback on model quality

## Support

For issues or questions:

1. Check [lib/utils/README.md](../lib/utils/README.md) for detailed docs
2. Review [lib/utils/INTEGRATION_GUIDE.md](../lib/utils/INTEGRATION_GUIDE.md) for integration
3. Run validation: `npm run validate:openrouter`
4. Check API: `curl http://localhost:3000/api/agent/validate-openrouter`
5. Verify OpenRouter status: https://openrouter.ai/status

## Related Files

- Core logic: [lib/utils/validate-openrouter-models.ts](../lib/utils/validate-openrouter-models.ts)
- Guest filtering: [lib/utils/guest-model-filter.ts](../lib/utils/guest-model-filter.ts)
- CLI script: [scripts/validate-openrouter-models.ts](../scripts/validate-openrouter-models.ts)
- API endpoint: [app/api/agent/validate-openrouter/route.ts](../app/api/agent/validate-openrouter/route.ts)
- Integration guide: [lib/utils/INTEGRATION_GUIDE.md](../lib/utils/INTEGRATION_GUIDE.md)
