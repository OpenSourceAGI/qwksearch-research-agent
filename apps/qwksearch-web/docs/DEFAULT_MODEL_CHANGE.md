# Default Model Change: openrouter/free

**Date:** 2026-07-05  
**Status:** ✅ Implemented  
**Impact:** All guests and new users

## Summary

Changed the default OpenRouter model from `nvidia/nemotron-3-super-120b-a12b:free` to `openrouter/free` for all guests and new users on the free tier.

## Rationale

### Why openrouter/free?

1. **Auto-routing** - Automatically selects the best available free model
2. **Reliability** - Falls back if specific models are unavailable
3. **Performance** - Always gets the most optimal free model at any given time
4. **Simplicity** - No need to manually update default when better models are released
5. **Load balancing** - OpenRouter distributes requests across their best free models

### Previous Default (Nemotron)

The previous default was `nvidia/nemotron-3-super-120b-a12b:free`, which:
- Is an excellent model (1M context, high quality)
- But requires manual updates when better models become available
- Could be temporarily unavailable without fallback
- Ties users to a specific model rather than best-available

### New Default (openrouter/free)

The new default `openrouter/free`:
- ✅ Auto-selects from best free models (may include Nemotron, Llama, etc.)
- ✅ Automatically updates as OpenRouter adds better models
- ✅ Built-in fallback and load balancing
- ✅ 200K context window (sufficient for most use cases)
- ✅ Zero configuration needed

## Changes Made

### 1. Database Configuration
**File:** `packages/agent-toolkit/src/config/language-models-database.ts`

```typescript
// Before
"default": "nvidia/nemotron-3-super-120b-a12b:free",

// After
"default": "openrouter/free",
```

### 2. Chat Config (Frontend)
**File:** `apps/qwksearch-web/components/ResearchAgent/hooks/useChat/chatConfig.ts`

```typescript
// Before
// For OpenRouter, prefer Nemotron 3 Super 120B (best free model)
if (chatModelProvider.name.toLowerCase().includes("openrouter")) {
  chatModel = chatModelProvider.chatModels.find(
    (m) => m.key === "nvidia/nemotron-3-super-120b-a12b:free"
  );
}

// After
// For OpenRouter, prefer openrouter/free (auto-router for best free model)
if (chatModelProvider.name.toLowerCase().includes("openrouter")) {
  chatModel = chatModelProvider.chatModels.find(
    (m) => m.key === "openrouter/free"
  );
}
```

### 3. Guest Model Recommendations
**File:** `apps/qwksearch-web/lib/utils/guest-model-filter.ts`

```typescript
// Before
export const RECOMMENDED_GUEST_MODELS = [
  "nvidia/nemotron-3-super-120b-a12b:free", // First
  ...
  "openrouter/free", // Last
];

// After
export const RECOMMENDED_GUEST_MODELS = [
  "openrouter/free", // First - DEFAULT
  "nvidia/nemotron-3-super-120b-a12b:free", // Second
  ...
];
```

### 4. Environment Documentation
**File:** `apps/qwksearch-web/.env.example`

Updated comments to show `openrouter/free` as the default with ⭐ marker.

### 5. Documentation Updates
Updated these docs to reflect the new default:
- `docs/OPENROUTER_VALIDATION.md`
- `lib/utils/README.md`

## User Impact

### For Guests
- ✅ Better experience - always get the best available free model
- ✅ More reliable - automatic fallback if one model is down
- ✅ No action needed - change is automatic

### For Existing Users
- ℹ️ Users with saved model preference - **No change** (their choice is preserved)
- ℹ️ Users without saved preference - Will get `openrouter/free` on next session
- ✅ Can manually select specific models if desired

### For New Users
- ✅ Start with `openrouter/free` by default
- ✅ Can change to specific models in settings
- ✅ Previous selections are always remembered

## Fallback Behavior

The system maintains a fallback chain:

```
1. User's saved preference (if exists)
   ↓
2. openrouter/free (new default)
   ↓
3. nvidia/nemotron-3-super-120b-a12b:free (fallback)
   ↓
4. Any Nemotron 3 Super 120B model
   ↓
5. Any Nemotron model
   ↓
6. First available model
```

## Testing

### Verify Default Model

```bash
# Test that openrouter/free is returned as default
npm run test:validation
```

### Test Frontend

1. Clear localStorage (to remove saved preference)
2. Refresh app
3. Check selected model - should be `openrouter/free`

### Test API

```bash
# Check providers API returns openrouter/free first
curl http://localhost:3000/api/agent/providers | jq '.providers[] | select(.type=="openrouter") | .chatModels[0]'
```

## Migration Notes

### No Breaking Changes

- ✅ Existing API calls continue to work
- ✅ User preferences are preserved
- ✅ No database migration needed
- ✅ Backward compatible

### Monitoring

Monitor these metrics after deployment:

1. **Model usage distribution** - Verify openrouter/free is being used
2. **Error rates** - Should be same or lower
3. **User satisfaction** - Check for feedback on model quality
4. **API latency** - openrouter/free may have different latency profile

## Rollback Plan

If issues arise, revert these files:

```bash
# Revert database config
git checkout HEAD^ packages/agent-toolkit/src/config/language-models-database.ts

# Revert chat config
git checkout HEAD^ apps/qwksearch-web/components/ResearchAgent/hooks/useChat/chatConfig.ts

# Revert guest filter
git checkout HEAD^ apps/qwksearch-web/lib/utils/guest-model-filter.ts
```

Then redeploy.

## FAQ

### Q: Will this affect my current model selection?
**A:** No, if you've already selected a model, your choice is preserved in localStorage.

### Q: Can I still use Nemotron directly?
**A:** Yes, all models remain available in the model selector.

### Q: What if openrouter/free is unavailable?
**A:** The system automatically falls back to Nemotron 3 Super 120B, then other Nemotron models.

### Q: How do I know which model openrouter/free is using?
**A:** OpenRouter rotates among their best free models. Check their docs or API response for current model.

### Q: Does this change validation behavior?
**A:** No, validation still tests all free models including openrouter/free.

### Q: What about rate limits?
**A:** openrouter/free has the same rate limits as other free models (none on OpenRouter's side, but guest rate limiting still applies).

## Benefits Summary

✅ **Better UX** - Always get best available model  
✅ **More reliable** - Built-in fallback and load balancing  
✅ **Future-proof** - Auto-updates as new models are added  
✅ **Simpler** - No manual default updates needed  
✅ **Flexible** - Users can still choose specific models  

## Related Files

- Database: [packages/agent-toolkit/src/config/language-models-database.ts](../../packages/agent-toolkit/src/config/language-models-database.ts)
- Chat Config: [apps/qwksearch-web/components/ResearchAgent/hooks/useChat/chatConfig.ts](../components/ResearchAgent/hooks/useChat/chatConfig.ts)
- Guest Filter: [apps/qwksearch-web/lib/utils/guest-model-filter.ts](../lib/utils/guest-model-filter.ts)
- Validation: [apps/qwksearch-web/lib/utils/validate-openrouter-models.ts](../lib/utils/validate-openrouter-models.ts)
- Env Example: [apps/qwksearch-web/.env.example](../.env.example)
