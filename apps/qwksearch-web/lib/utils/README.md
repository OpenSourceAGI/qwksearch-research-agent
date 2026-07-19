# OpenRouter Free Models Validation

This directory contains utilities for validating and filtering OpenRouter free models to ensure guests and new users only have access to working models.

## Overview

The system validates OpenRouter's free models against the configured API key and filters out any models that return errors. This prevents guests from encountering broken models.

## Files

### `validate-openrouter-models.ts`
Core validation logic that tests each free model.

**Key Functions:**
- `validateOpenRouterModels()` - Tests all free models with concurrency control
- `getValidatedFreeModels()` - Returns list of working model IDs
- `filterWorkingModels()` - Filters a model list to only include working ones
- `isModelValidated()` - Checks if a specific model is validated

### `guest-model-filter.ts`
Guest access filtering and model recommendations.

**Key Functions:**
- `filterModelsForGuests()` - Main function to filter models for guest access
- `isModelAccessibleToGuests()` - Check if a model should be available to guests
- `getDefaultGuestModel()` - Get recommended default model for guests
- `getGuestModelInfo()` - Get metadata about guest-accessible models

**Constants:**
- `RECOMMENDED_GUEST_MODELS` - Prioritized list of best free models

## Usage

### Running Validation (CLI)

```bash
# From project root
cd apps/qwksearch-web

# Run validation with defaults
tsx scripts/validate-openrouter-models.ts

# Run with custom options
tsx scripts/validate-openrouter-models.ts --concurrency 5 --timeout 20000

# Output as JSON
tsx scripts/validate-openrouter-models.ts --json
```

### API Endpoint

**GET /api/agent/validate-openrouter**
Returns cached validation results (refreshes every 24 hours)

**POST /api/agent/validate-openrouter**
Forces a fresh validation

```typescript
// Client-side usage
const response = await fetch('/api/agent/validate-openrouter');
const { availableModels, unavailableModels } = await response.json();
```

### Programmatic Usage

```typescript
import { 
  validateOpenRouterModels,
  getValidatedFreeModels 
} from '@/lib/utils/validate-openrouter-models';

import {
  filterModelsForGuests,
  getDefaultGuestModel
} from '@/lib/utils/guest-model-filter';

// Run validation
const result = await validateOpenRouterModels();
console.log(`Available: ${result.availableModels.length}`);
console.log(`Unavailable: ${result.unavailableModels.length}`);

// Get working model IDs
const validatedIds = await getValidatedFreeModels();

// Filter models for guests
const guestModels = filterModelsForGuests(allModels, 'openrouter', {
  validatedModelIds: validatedIds
});

// Get recommended default
const defaultModel = getDefaultGuestModel(validatedIds);
```

## Integration with Providers API

To integrate validation with the providers API, modify `apps/qwksearch-web/app/api/agent/providers/route.ts`:

```typescript
import { filterModelsForGuests } from '@/lib/utils/guest-model-filter';

export const GET = async (req: Request) => {
  const registry = new ModelRegistry();
  const activeProviders = await registry.getActiveProviders();

  // Filter models for guest access
  const filteredProviders = activeProviders.map(provider => {
    // Only filter if this is OpenRouter with env-based key
    if (provider.type === 'openrouter' && isEnvBasedProvider(provider)) {
      return {
        ...provider,
        chatModels: filterModelsForGuests(
          provider.chatModels,
          provider.type
        )
      };
    }
    return provider;
  });

  return Response.json({ providers: filteredProviders });
};
```

## Caching Strategy

### Development
- In-memory cache with 24-hour TTL
- Cache is lost on server restart

### Production (Recommended)
Store validation results in Cloudflare KV:

```typescript
// Example KV integration
interface CachedValidation {
  availableModelIds: string[];
  timestamp: number;
}

async function getCachedValidation(kv: KVNamespace): Promise<string[]> {
  const cached = await kv.get<CachedValidation>('openrouter-validation', 'json');
  
  if (cached && Date.now() - cached.timestamp < 24 * 60 * 60 * 1000) {
    return cached.availableModelIds;
  }

  // Run fresh validation
  const result = await validateOpenRouterModels();
  const modelIds = result.availableModels.map(m => m.modelId);

  // Cache for 24 hours
  await kv.put('openrouter-validation', JSON.stringify({
    availableModelIds: modelIds,
    timestamp: Date.now()
  }));

  return modelIds;
}
```

## Recommended Models

The system prioritizes these models for guests (in order):

1. **openrouter/free** ⭐ DEFAULT
   - 200K context window
   - Auto-router that selects the best free model automatically
   - Most reliable option for guests

2. **nvidia/nemotron-3-super-120b-a12b:free**
   - 1M context window
   - Best overall performance

3. **nvidia/nemotron-3-ultra-550b-a55b:free**
   - 1M context window
   - Most capable model

4. **qwen/qwen3-coder:free**
   - 1M context window
   - Best for code generation

5. **meta-llama/llama-3.3-70b-instruct:free**
   - 131K context window
   - Very reliable

## Configuration

### Environment Variables

```bash
# Required
OPENROUTER_API_KEY=sk-or-v1-...

# Optional - for rate limiting
GUEST_RATE_LIMIT_RPM=10
GUEST_RATE_LIMIT_TPM=50000
```

### Validation Options

```typescript
interface ValidationOptions {
  concurrency?: number;     // Default: 3
  timeout?: number;         // Default: 15000ms
  onProgress?: (current: number, total: number, modelName: string) => void;
}
```

## Error Handling

The system is designed to fail gracefully:

1. **No API Key**: Returns empty list, doesn't break app
2. **All Models Fail**: In non-strict mode, returns all free models
3. **Validation Timeout**: Individual model timeouts don't stop other tests
4. **Network Errors**: Logged and marked as unavailable

## Monitoring

### CLI Output
```
[1/25] Nemotron 3 Super 120B: ✓ (1234ms)
[2/25] Gemma 4 31B IT: ✗ (Model not available)
...
=== Summary ===
Total tested: 25
Available: 18
Unavailable: 7
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
  "unavailableModels": [...],
  "testDuration": 45000,
  "apiKeyPresent": true,
  "cached": false
}
```

## Best Practices

1. **Run validation daily** via cron or scheduled task
2. **Cache results** in KV or database (not in-memory)
3. **Monitor failure rate** - if >50% fail, check API key
4. **Log validation results** for debugging
5. **Use non-strict mode** in production to prevent breaking changes
6. **Set reasonable timeouts** (15s recommended)
7. **Limit concurrency** (3-5 concurrent tests recommended)

## Troubleshooting

### All models show as unavailable
- Check OPENROUTER_API_KEY is set correctly
- Verify API key has proper permissions
- Check OpenRouter service status

### Validation takes too long
- Reduce concurrency (try 2-3)
- Increase timeout (try 20000ms)
- Test fewer models (filter by type first)

### Models work but validation fails
- Check network connectivity
- Verify firewall isn't blocking OpenRouter
- Try increasing timeout

## Future Enhancements

- [ ] Add KV/database caching
- [ ] Scheduled validation via cron
- [ ] Admin UI for viewing validation results
- [ ] Webhook notifications for failed validations
- [ ] Model performance tracking (latency trends)
- [ ] A/B testing different default models
- [ ] User feedback on model quality
