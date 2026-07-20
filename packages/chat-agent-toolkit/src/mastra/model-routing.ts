/**
 * @fileoverview Mastra Model Routing
 *
 * Multi-provider model routing with strategy selection:
 * cost-optimized, latency-optimized, capability-based, or round-robin.
 */

import { Agent } from "@mastra/core/agent";

export type RoutingStrategy = "cost" | "latency" | "capability" | "round-robin";

export interface ModelRouterConfig {
  providers: Array<{
    id: string;
    model: any;
    costPer1kTokens?: number;
    avgLatencyMs?: number;
    capabilities?: string[];
    priority?: number;
  }>;
  strategy: RoutingStrategy;
  fallbackProviderId?: string;
}

/**
 * Model router that selects providers based on configurable strategies.
 *
 * @example
 * ```ts
 * import { createModelRouter } from "chat-agent-toolkit/mastra";
 * import { openai } from "@ai-sdk/openai";
 * import { anthropic } from "@ai-sdk/anthropic";
 *
 * const router = createModelRouter({
 *   providers: [
 *     { id: "openai", model: openai("gpt-4o"), costPer1kTokens: 0.005 },
 *     { id: "anthropic", model: anthropic("claude-sonnet-4-20250514"), costPer1kTokens: 0.003 },
 *     { id: "fast", model: openai("gpt-4o-mini"), costPer1kTokens: 0.0002, avgLatencyMs: 200 },
 *   ],
 *   strategy: "cost",
 * });
 *
 * const model = router.select(); // cheapest provider
 * const model2 = router.select({ capabilities: ["vision"] }); // capability match
 * ```
 */
export function createModelRouter(config: ModelRouterConfig) {
  let roundRobinIndex = 0;

  return {
    select(options?: {
      capabilities?: string[];
      maxCost?: number;
      maxLatency?: number;
    }): any {
      let candidates = [...config.providers];

      if (options?.capabilities) {
        candidates = candidates.filter((p) =>
          options.capabilities!.every(
            (cap) => p.capabilities?.includes(cap)
          )
        );
      }

      if (options?.maxCost) {
        candidates = candidates.filter(
          (p) => (p.costPer1kTokens ?? Infinity) <= options.maxCost!
        );
      }

      if (options?.maxLatency) {
        candidates = candidates.filter(
          (p) => (p.avgLatencyMs ?? Infinity) <= options.maxLatency!
        );
      }

      if (candidates.length === 0) {
        const fallback = config.providers.find(
          (p) => p.id === config.fallbackProviderId
        );
        if (fallback) return fallback.model;
        return config.providers[0]?.model;
      }

      switch (config.strategy) {
        case "cost":
          candidates.sort(
            (a, b) => (a.costPer1kTokens ?? 0) - (b.costPer1kTokens ?? 0)
          );
          return candidates[0].model;

        case "latency":
          candidates.sort(
            (a, b) => (a.avgLatencyMs ?? 0) - (b.avgLatencyMs ?? 0)
          );
          return candidates[0].model;

        case "capability":
          candidates.sort(
            (a, b) => (b.capabilities?.length ?? 0) - (a.capabilities?.length ?? 0)
          );
          return candidates[0].model;

        case "round-robin":
          const selected = candidates[roundRobinIndex % candidates.length];
          roundRobinIndex++;
          return selected.model;

        default:
          return candidates[0].model;
      }
    },

    createAgent(
      agentConfig: { id: string; name: string; instructions: string; tools?: Record<string, any> },
      routingOptions?: { capabilities?: string[]; maxCost?: number; maxLatency?: number }
    ): Agent {
      const model = this.select(routingOptions);
      return new Agent({
        id: agentConfig.id,
        name: agentConfig.name,
        instructions: agentConfig.instructions,
        model,
        tools: agentConfig.tools || {},
      });
    },
  };
}

/**
 * Load a Mastra-compatible model from a provider string.
 * Convenience wrapper around Vercel AI SDK provider imports.
 *
 * @example
 * ```ts
 * const model = await loadMastraModel("openai", "gpt-4o");
 * const model2 = await loadMastraModel("anthropic", "claude-sonnet-4-20250514");
 * const model3 = await loadMastraModel("groq", "llama-3.3-70b-versatile");
 * ```
 */
export async function loadMastraModel(
  provider: "openai" | "anthropic" | "groq" | "google",
  modelId: string
): Promise<any> {
  switch (provider) {
    case "openai": {
      const { openai } = await import("@ai-sdk/openai");
      return openai(modelId);
    }
    case "anthropic": {
      const { anthropic } = await import("@ai-sdk/anthropic");
      return anthropic(modelId);
    }
    case "groq": {
      const { createGroq } = await import("@ai-sdk/groq");
      return createGroq({})(modelId);
    }
    case "google": {
      const { google } = await import("@ai-sdk/google");
      return google(modelId);
    }
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}
