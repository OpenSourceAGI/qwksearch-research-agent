# Integration Guide: OpenRouter Model Validation

This guide shows how to integrate the OpenRouter model validation system with your existing providers API.

## Quick Start

### Step 1: Run Initial Validation

```bash
cd apps/qwksearch-web
npm run validate:openrouter
```

This will test all free OpenRouter models and show which ones work with your API key.

### Step 2: Integrate with Providers API

Modify `apps/qwksearch-web/app/api/agent/providers/route.ts`:

```typescript
import ModelRegistry from "ai-research-agent/models/registry";
import { NextRequest } from "next/server";
import { filterModelsForGuests } from "@/lib/utils/guest-model-filter";

export const GET = async (req: Request) => {
  try {
    const registry = new ModelRegistry();
    const activeProviders = await registry.getActiveProviders();

    // Filter providers to remove those with errors
    const filteredProviders = activeProviders.filter((p) => {
      return !p.chatModels.some((m) => m.key === "error");
    });

    // Apply guest filtering for OpenRouter (if using env-based API key)
    const guestFilteredProviders = filteredProviders.map(provider => {
      // Only filter OpenRouter free models for guests
      if (provider.type === 'openrouter' && isEnvBasedProvider(provider)) {
        return {
          ...provider,
          chatModels: filterModelsForGuests(
            provider.chatModels,
            provider.type,
            {
              strictMode: false, // Don't break if validation fails
            }
          )
        };
      }
      return provider;
    });

    return Response.json(
      {
        providers: guestFilteredProviders,
      },
      {
        status: 200,
      },
    );
  } catch (err) {
    console.error("An error occurred while fetching providers", err);
    return Response.json(
      {
        message: "An error has occurred.",
      },
      {
        status: 500,
      },
    );
  }
};

// Helper to check if provider uses env-based API key
function isEnvBasedProvider(provider: any): boolean {
  return provider.config?.apiKey === process.env.OPENROUTER_API_KEY;
}
```

### Step 3: Add Validation to Startup (Optional)

Add a startup validation check in `apps/qwksearch-web/lib/startup/validate-models.ts`:

```typescript
import { validateOpenRouterModels } from "@/lib/utils/validate-openrouter-models";

export async function runStartupValidation() {
  if (process.env.OPENROUTER_API_KEY) {
    console.log("Running OpenRouter model validation...");
    
    const result = await validateOpenRouterModels(
      3,  // concurrency
      15000  // timeout
    );

    if (result.unavailableModels.length > 0) {
      console.warn(
        `⚠️  ${result.unavailableModels.length}/${result.totalTested} ` +
        `OpenRouter models are unavailable`
      );
    }

    console.log(
      `✓ ${result.availableModels.length} OpenRouter models validated`
    );
  }
}
```

Then call it in your Next.js config or server startup:

```typescript
// next.config.js
if (process.env.NODE_ENV === 'production') {
  import('./lib/startup/validate-models').then(m => m.runStartupValidation());
}
```

## Advanced Integration

### Option 1: Real-time Validation API

Use the validation endpoint to get fresh results:

```typescript
// Client-side component
import { useEffect, useState } from 'react';

export function ModelSelector() {
  const [validModels, setValidModels] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/agent/validate-openrouter')
      .then(res => res.json())
      .then(data => {
        const ids = data.availableModels.map(m => m.modelId);
        setValidModels(ids);
      });
  }, []);

  // Use validModels to filter your model list
}
```

### Option 2: Cached Validation with KV

Store validation results in Cloudflare KV for better performance:

```typescript
import { validateOpenRouterModels } from "@/lib/utils/validate-openrouter-models";

export async function getCachedValidation(
  kv: KVNamespace
): Promise<string[]> {
  const CACHE_KEY = 'openrouter-validated-models';
  const CACHE_TTL = 24 * 60 * 60; // 24 hours

  // Try to get from cache
  const cached = await kv.get(CACHE_KEY, 'json') as {
    modelIds: string[];
    timestamp: number;
  } | null;

  // Return cached if fresh
  if (cached && Date.now() - cached.timestamp < CACHE_TTL * 1000) {
    return cached.modelIds;
  }

  // Run validation
  const result = await validateOpenRouterModels();
  const modelIds = result.availableModels.map(m => m.modelId);

  // Cache results
  await kv.put(CACHE_KEY, JSON.stringify({
    modelIds,
    timestamp: Date.now()
  }), {
    expirationTtl: CACHE_TTL
  });

  return modelIds;
}
```

Then use in your API route:

```typescript
export const GET = async (req: Request, { env }) => {
  const validatedModelIds = await getCachedValidation(env.KV);
  
  // Use validatedModelIds to filter models
  const filteredProviders = activeProviders.map(provider => {
    if (provider.type === 'openrouter') {
      return {
        ...provider,
        chatModels: filterModelsForGuests(
          provider.chatModels,
          provider.type,
          { validatedModelIds }
        )
      };
    }
    return provider;
  });
};
```

### Option 3: Scheduled Validation

Run validation on a schedule using Cloudflare Workers Cron:

```typescript
// worker.ts
export default {
  async scheduled(event: ScheduledEvent, env: Env) {
    const result = await validateOpenRouterModels();
    
    // Store in KV
    await env.KV.put('openrouter-validated-models', JSON.stringify({
      modelIds: result.availableModels.map(m => m.modelId),
      timestamp: Date.now(),
      summary: {
        total: result.totalTested,
        available: result.availableModels.length,
        unavailable: result.unavailableModels.length
      }
    }));

    // Log for monitoring
    console.log(
      `Validation complete: ${result.availableModels.length}/${result.totalTested} models available`
    );
  }
};
```

Configure in `wrangler.toml`:

```toml
[triggers]
crons = ["0 0 * * *"]  # Run daily at midnight
```

## Testing

### Test the Validation Script

```bash
# Run validation
npm run validate:openrouter

# Get JSON output
npm run validate:openrouter:json > validation-results.json

# Test with custom options
tsx scripts/validate-openrouter-models.ts --concurrency 5 --timeout 20000
```

### Test the API Endpoint

```bash
# Get cached validation
curl http://localhost:3000/api/agent/validate-openrouter

# Force fresh validation
curl -X POST http://localhost:3000/api/agent/validate-openrouter

# With custom options
curl -X POST http://localhost:3000/api/agent/validate-openrouter \
  -H "Content-Type: application/json" \
  -d '{"concurrency": 5, "timeout": 20000}'
```

### Test Guest Filtering

```typescript
import { filterModelsForGuests, getDefaultGuestModel } from '@/lib/utils/guest-model-filter';

const mockModels = [
  { key: 'nvidia/nemotron-3-super-120b-a12b:free', name: 'Nemotron 3 Super' },
  { key: 'some-broken-model:free', name: 'Broken Model' }
];

const validatedIds = ['nvidia/nemotron-3-super-120b-a12b:free'];

// Should only return working model
const filtered = filterModelsForGuests(mockModels, 'openrouter', {
  validatedModelIds
});

console.log(filtered); // Only Nemotron 3 Super

// Should return default
const defaultModel = getDefaultGuestModel(validatedIds);
console.log(defaultModel); // nvidia/nemotron-3-super-120b-a12b:free
```

## Monitoring

### Log Validation Results

Add logging to track validation over time:

```typescript
import { validateOpenRouterModels } from "@/lib/utils/validate-openrouter-models";

export async function logValidation() {
  const result = await validateOpenRouterModels();
  
  // Log to your monitoring system
  console.log({
    timestamp: new Date().toISOString(),
    available: result.availableModels.length,
    unavailable: result.unavailableModels.length,
    duration: result.testDuration,
    failedModels: result.unavailableModels.map(m => ({
      id: m.modelId,
      error: m.error
    }))
  });
}
```

### Alert on High Failure Rate

```typescript
const result = await validateOpenRouterModels();
const failureRate = result.unavailableModels.length / result.totalTested;

if (failureRate > 0.5) {
  // Send alert - more than 50% models failing
  console.error(
    `⚠️  HIGH FAILURE RATE: ${(failureRate * 100).toFixed(0)}% of models unavailable`
  );
  
  // Could send to Sentry, Slack, etc.
}
```

## Troubleshooting

### Issue: All models show as unavailable

**Solution:**
1. Check `.env` has correct `OPENROUTER_API_KEY`
2. Verify API key is valid at https://openrouter.ai/settings/keys
3. Check network connectivity to OpenRouter
4. Try increasing timeout: `--timeout 30000`

### Issue: Validation is too slow

**Solution:**
1. Reduce concurrency: `--concurrency 2`
2. Increase timeout: `--timeout 20000`
3. Use cached results instead of real-time validation

### Issue: Models work manually but fail validation

**Solution:**
1. Check if model requires specific parameters
2. Increase timeout for slower models
3. Test individual model:

```typescript
import { testOpenRouterModel } from '@/lib/utils/validate-openrouter-models';

const result = await testOpenRouterModel(
  process.env.OPENROUTER_API_KEY!,
  'nvidia/nemotron-3-super-120b-a12b:free',
  'Nemotron 3 Super',
  30000 // longer timeout
);

console.log(result);
```

## Production Checklist

- [ ] Run initial validation and verify results
- [ ] Integrate guest filtering in providers API
- [ ] Set up caching (KV or database)
- [ ] Configure scheduled validation (daily)
- [ ] Add monitoring and alerts
- [ ] Test with guest users
- [ ] Document which models are recommended
- [ ] Set up fallback behavior if all models fail
- [ ] Monitor failure rates in production
- [ ] Create runbook for common issues

## Next Steps

1. Run validation: `npm run validate:openrouter`
2. Review results and note which models work
3. Integrate guest filtering in providers API
4. Set up caching strategy (KV recommended)
5. Configure daily scheduled validation
6. Add monitoring and alerts
7. Test thoroughly with guest users
8. Deploy to production

## Support

For issues or questions:
1. Check the [README.md](./README.md) for detailed documentation
2. Review validation results: `npm run validate:openrouter:json`
3. Test API endpoint: `/api/agent/validate-openrouter`
4. Check OpenRouter status: https://openrouter.ai/status
