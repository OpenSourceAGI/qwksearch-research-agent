/**
 * @fileoverview Guest and new user model filtering
 *
 * Filters chat models to only show working free models for guests and new users.
 * Uses cached validation results to avoid testing on every request.
 */

import { LANGUAGE_MODELS } from "chat-agent-toolkit/config/language-models-database";

export interface GuestModelFilterOptions {
  /** Whether to enable strict filtering (only validated models) */
  strictMode?: boolean;
  /** Custom list of validated model IDs (if not provided, uses default free models) */
  validatedModelIds?: string[];
}

/**
 * Get OpenRouter free models that should be available to guests
 */
export function getGuestAccessibleOpenRouterModels(): string[] {
  const openRouterProvider = LANGUAGE_MODELS.find(
    (p) => p.provider.toLowerCase() === "openrouter"
  );

  if (!openRouterProvider) {
    return [];
  }

  // Return all free models by default
  // In production, this should be replaced with validated models from cache/KV
  return openRouterProvider.models
    .filter((m) => m.free === true && m.type === "text-generation")
    .map((m) => m.id);
}

/**
 * Filter models to only include those accessible to guests
 * This is the main function used by the providers API
 */
export function filterModelsForGuests<T extends { key: string; name: string }>(
  models: T[],
  providerType: string,
  options: GuestModelFilterOptions = {}
): T[] {
  const { strictMode = false, validatedModelIds } = options;

  // Only filter OpenRouter for now (other providers require user's own API key)
  if (providerType.toLowerCase() !== "openrouter") {
    return models;
  }

  // Get list of allowed model IDs
  const allowedModelIds = validatedModelIds || getGuestAccessibleOpenRouterModels();

  // Filter models
  const filtered = models.filter((m) => allowedModelIds.includes(m.key));

  // In non-strict mode, if all models are filtered out, return original list
  // This prevents breaking the app if validation fails
  if (!strictMode && filtered.length === 0) {
    console.warn(
      `[guest-model-filter] All models filtered out for ${providerType}, returning original list`
    );
    return models;
  }

  return filtered;
}

/**
 * Check if a specific model should be accessible to guests
 */
export function isModelAccessibleToGuests(
  modelKey: string,
  providerType: string,
  validatedModelIds?: string[]
): boolean {
  if (providerType.toLowerCase() !== "openrouter") {
    // Non-OpenRouter models require user's own API key
    return false;
  }

  const allowedModelIds = validatedModelIds || getGuestAccessibleOpenRouterModels();
  return allowedModelIds.includes(modelKey);
}

/**
 * Get metadata about guest-accessible models
 */
export interface GuestModelInfo {
  provider: string;
  totalFreeModels: number;
  guestAccessibleModels: number;
  modelIds: string[];
}

export function getGuestModelInfo(
  validatedModelIds?: string[]
): GuestModelInfo {
  const openRouterProvider = LANGUAGE_MODELS.find(
    (p) => p.provider.toLowerCase() === "openrouter"
  );

  if (!openRouterProvider) {
    return {
      provider: "OpenRouter",
      totalFreeModels: 0,
      guestAccessibleModels: 0,
      modelIds: [],
    };
  }

  const allFreeModels = openRouterProvider.models.filter(
    (m) => m.free === true && m.type === "text-generation"
  );

  const accessibleModelIds =
    validatedModelIds || getGuestAccessibleOpenRouterModels();

  return {
    provider: "OpenRouter",
    totalFreeModels: allFreeModels.length,
    guestAccessibleModels: accessibleModelIds.length,
    modelIds: accessibleModelIds,
  };
}

/**
 * Recommended models for guests (prioritized list)
 * These are the best-performing free models that should be suggested first
 */
export const RECOMMENDED_GUEST_MODELS = [
  "openrouter/free", // 200K context, auto-router (DEFAULT - rotates among best free models)
  "nvidia/nemotron-3-super-120b-a12b:free", // 1M context, best overall
  "nvidia/nemotron-3-ultra-550b-a55b:free", // 1M context, most capable
  "qwen/qwen3-coder:free", // 1M context, best for code
  "meta-llama/llama-3.3-70b-instruct:free", // 131K context, reliable
];

/**
 * Get the recommended default model for guests
 */
export function getDefaultGuestModel(
  validatedModelIds?: string[]
): string | null {
  const allowedModelIds = validatedModelIds || getGuestAccessibleOpenRouterModels();

  // Find the first recommended model that's available
  for (const modelId of RECOMMENDED_GUEST_MODELS) {
    if (allowedModelIds.includes(modelId)) {
      return modelId;
    }
  }

  // Fallback to any available model
  return allowedModelIds[0] || null;
}
