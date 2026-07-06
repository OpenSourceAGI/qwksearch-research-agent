/**
 * EXAMPLE: How to integrate guest model filtering into providers route
 *
 * This file shows how to modify app/api/agent/providers/route.ts to filter
 * OpenRouter models for guest users.
 *
 * DO NOT use this file directly - it's a reference implementation.
 */

import ModelRegistry from "ai-research-agent/models/registry";
import { NextRequest } from "next/server";
import { filterModelsForGuests } from "@/lib/utils/guest-model-filter";

/**
 * Example GET handler with guest filtering
 */
export const GET_EXAMPLE = async (req: Request) => {
  try {
    const registry = new ModelRegistry();
    const activeProviders = await registry.getActiveProviders();

    // Remove providers with errors
    const filteredProviders = activeProviders.filter((p) => {
      return !p.chatModels.some((m) => m.key === "error");
    });

    // Apply guest filtering for OpenRouter
    const guestFilteredProviders = filteredProviders.map(provider => {
      // Only filter OpenRouter with env-based API key
      if (
        provider.type === 'openrouter' &&
        isEnvBasedProvider(provider.id, registry)
      ) {
        return {
          ...provider,
          chatModels: filterModelsForGuests(
            provider.chatModels,
            provider.type,
            {
              strictMode: false, // Fallback to all models if validation fails
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

/**
 * Helper: Check if provider uses environment-based API key
 * (means it's shared with guests)
 */
function isEnvBasedProvider(providerId: string, registry: ModelRegistry): boolean {
  return registry.isProviderEnvBased(providerId);
}

/**
 * ALTERNATIVE: More advanced with cached validation
 */
export const GET_WITH_CACHE_EXAMPLE = async (req: Request) => {
  try {
    const registry = new ModelRegistry();
    const activeProviders = await registry.getActiveProviders();

    // Get cached validation results
    const validationResponse = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/agent/validate-openrouter`
    );

    let validatedModelIds: string[] | undefined;
    if (validationResponse.ok) {
      const validationData = await validationResponse.json();
      validatedModelIds = validationData.availableModels.map((m: any) => m.modelId);
    }

    // Filter providers
    const filteredProviders = activeProviders
      .filter((p) => !p.chatModels.some((m) => m.key === "error"))
      .map(provider => {
        if (
          provider.type === 'openrouter' &&
          isEnvBasedProvider(provider.id, registry)
        ) {
          return {
            ...provider,
            chatModels: filterModelsForGuests(
              provider.chatModels,
              provider.type,
              {
                validatedModelIds, // Use cached validation
                strictMode: false,
              }
            )
          };
        }
        return provider;
      });

    return Response.json(
      {
        providers: filteredProviders,
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

/**
 * MINIMAL INTEGRATION: Just add these lines to existing route.ts
 */
/*

// Add this import at the top
import { filterModelsForGuests } from "@/lib/utils/guest-model-filter";

// Then replace the return statement in GET handler with:
const guestFilteredProviders = filteredProviders.map(provider => {
  if (provider.type === 'openrouter' && registry.isProviderEnvBased(provider.id)) {
    return {
      ...provider,
      chatModels: filterModelsForGuests(provider.chatModels, provider.type)
    };
  }
  return provider;
});

return Response.json({ providers: guestFilteredProviders }, { status: 200 });

*/
