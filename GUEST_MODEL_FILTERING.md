# Guest Model Filtering Implementation

## Overview
This implementation provides separate model lists for guest users vs. authenticated users, ensuring guests only see models that have been tested and confirmed to work.

## Changes Made

### 1. Language Models Database (`packages/agent-toolkit/src/config/language-models-database.ts`)
Added:
- **`GUEST_SAFE_MODELS`** — Whitelist of models confirmed working via API tests
- **`filterModelsForGuests()`** — Helper to filter models marked `free: true`
- **`getGuestSafeProviders()`** — Returns provider list with only guest-safe models

**Guest-safe models (tested working):**

**OpenRouter Provider:**
- openrouter/free (rotating)
- nvidia/nemotron-3-super-120b-a12b:free
- nvidia/nemotron-3-ultra-550b-a55b:free
- nvidia/nemotron-3-nano-30b-a3b:free
- nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free
- nvidia/nemotron-nano-9b-v2:free
- nvidia/nemotron-3.5-content-safety:free
- google/gemma-4-31b-it:free
- google/gemma-4-26b-a4b-it:free
- openai/gpt-oss-20b:free
- poolside/laguna-xs-2.1:free
- poolside/laguna-m.1:free
- cohere/north-mini-code:free

**NVIDIA Provider:**
- nvidia/nemotron-3-super-120b-a12b
- meta/llama-3.1-8b-instruct

### 2. Model Registry (`packages/agent-toolkit/src/config/model-registry.ts`)
Updated:
- **`getActiveProviders(guestMode: boolean)`** — Now accepts optional guest mode parameter
- **`getGuestChatModels()`** — Private helper to filter models for guests using the whitelist
- Automatically filters models when `guestMode=true`

### 3. Providers API Route (`apps/qwksearch-web/app/api/agent/providers/route.ts`)
Enhanced:
- **Auto-detection of guest status** — Checks session to determine if user is guest
- **Query parameter override** — `?guest=true` forces guest mode for testing
- **Returns `isGuest` flag** — Client knows which model set is being used
- **Custom error messages** — Different messages for guests vs. authenticated users

**Query Parameters:**
- `?guest=true` — Force guest mode (for testing)
- `?guest=false` — Force authenticated mode (for testing)
- No param — Auto-detect based on session

## API Response

### Guest User Response
```json
{
  "providers": [
    {
      "id": "openrouter",
      "name": "OpenRouter",
      "type": "openrouter",
      "chatModels": [
        {
          "name": "OpenRouter Free (rotating)",
          "key": "openrouter/free"
        },
        {
          "name": "Nemotron 3 Super 120B",
          "key": "nvidia/nemotron-3-super-120b-a12b:free"
        },
        // ... other guest-safe models
      ]
    },
    {
      "id": "nvidia",
      "name": "NVIDIA",
      "type": "nvidia",
      "chatModels": [
        {
          "name": "Nemotron 3 Super 120B",
          "key": "nvidia/nemotron-3-super-120b-a12b"
        },
        {
          "name": "Llama 3.1 8B Instruct",
          "key": "meta/llama-3.1-8b-instruct"
        }
      ]
    }
  ],
  "isGuest": true
}
```

### Authenticated User Response
```json
{
  "providers": [
    {
      "id": "openrouter",
      "name": "OpenRouter",
      "type": "openrouter",
      "chatModels": [
        // ... ALL 25 models including rate-limited ones
      ]
    }
    // ... all providers with full model lists
  ],
  "isGuest": false
}
```

## Testing

Test guest mode:
```bash
curl "http://localhost:3000/api/agent/providers?guest=true"
```

Test authenticated mode (with valid session):
```bash
curl -b "session-cookie" "http://localhost:3000/api/agent/providers?guest=false"
```

Test auto-detection (no cookie):
```bash
curl "http://localhost:3000/api/agent/providers"
# Returns guest list
```

## Model Status Summary

Based on live tests:
- **OpenRouter**: 15/25 models responding (rate-limited during test)
- **NVIDIA**: 2/5 models responding (function timeout issues)
- **Guest list**: 13 OpenRouter + 2 NVIDIA = 15 models confirmed working

Models filtered out:
- `nvidia/llama-3.1-nemotron-70b-instruct` — HTTP 404 error
- `meta/llama-3.3-70b-instruct` — Timeout
- `google/gemma-4-31b-it` — Timeout (at NVIDIA endpoint)
- Rate-limited models (Qwen, Llama models at OpenRouter)

## Future Improvements

1. **Periodic testing** — Automated cron job to test all models and update whitelist
2. **Per-model status tracking** — Store last-seen working time in database
3. **Regional availability** — Different model lists for different regions
4. **Performance tiers** — Show avg response times for each model
