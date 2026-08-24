/**
 * @fileoverview Registry for managing and loading Vercel AI SDK model providers.
 *
 * Exposes the full API expected by the app's API routes and chat handler:
 * - `activeProviders` (sync getter) / `getActiveProviders()`
 * - `isProviderEnvBased(providerId)`
 * - `loadChatModel(providerId, modelKey)` — returns an AI SDK `LanguageModel`
 * - provider/model CRUD passthroughs to {@link configManager}
 */
import configManager from "./config-manager";
import { LANGUAGE_MODELS, getGuestSafeProviders } from "./language-models-database";
import { getModelProvidersUIConfigSection } from "./provider-ui-config";
import type { ConfigModelProvider, Model } from "./config-types";

// Maps a provider UI key to the matching `provider` name in the
// LANGUAGE_MODELS database (e.g. the "gemini" UI key ↔ "Google" model list).
const PROVIDER_KEY_TO_DB_NAME: Record<string, string> = {
  openai: "openai",
  anthropic: "anthropic",
  gemini: "google",
  groq: "groq",
  deepseek: "deepseek",
  nvidia: "nvidia",
  openrouter: "openrouter",
  anyapi: "anyapi",
};

/** Default chat models for a provider type from the LANGUAGE_MODELS database. */
const getDefaultChatModels = (providerType: string): Model[] => {
  const dbName = PROVIDER_KEY_TO_DB_NAME[providerType] ?? providerType;
  const entry = LANGUAGE_MODELS.find(
    (p) => p.provider.toLowerCase() === dbName.toLowerCase(),
  );
  if (!entry?.models) return [];
  return entry.models.map((m: any) => ({ name: m.name, key: m.id }));
};

/** Merges default and user-added models, deduplicated by model key. */
const mergeChatModels = (provider: ConfigModelProvider): Model[] => {
  const merged = new Map<string, Model>();
  for (const m of getDefaultChatModels(provider.type)) {
    merged.set(m.key, m);
  }
  for (const m of provider.chatModels || []) {
    merged.set(m.key, { key: m.key, name: m.name });
  }
  return [...merged.values()];
};

export default class ModelRegistry {
  /**
   * Currently configured providers (env-based + user-added).
   * Sync getter used by the chat handler for logging and lookups.
   */
  get activeProviders(): ConfigModelProvider[] {
    return configManager.getCurrentConfig().modelProviders;
  }

  /**
   * Providers with their full chat model lists (defaults merged with
   * user-added models), shaped for the settings/providers UI.
   */
  async getActiveProviders(guestMode: boolean = false) {
    const providers = this.activeProviders;
    const dbModels = guestMode ? getGuestSafeProviders() : LANGUAGE_MODELS;

    return providers.map((p) => ({
      id: p.id,
      name: p.name,
      type: p.type,
      chatModels: guestMode ? this.getGuestChatModels(p, dbModels) : mergeChatModels(p),
    })).filter((p) => p.chatModels.length > 0);
  }

  /**
   * Get guest-safe chat models for a provider (only tested working models).
   */
  private getGuestChatModels(provider: ConfigModelProvider, guestProviders: typeof LANGUAGE_MODELS): Model[] {
    const dbName = PROVIDER_KEY_TO_DB_NAME[provider.type.toLowerCase()];
    const dbEntry = guestProviders.find(
      (p) => p.provider.toLowerCase() === (dbName?.toLowerCase() || provider.type.toLowerCase()),
    );
    if (!dbEntry?.models) return [];
    return dbEntry.models.map((m: any) => ({ name: m.name, key: m.id }));
  }

  /**
   * Finds a provider by id, falling back to free providers in order:
   * OpenRouter (no daily limits, best for guests), Groq (fastest, daily limits),
   * AnyAPI (100,000 anyTokens/day free), then NVIDIA, then the first
   * configured provider.
   * Client-side provider ids are config hashes that go stale whenever
   * server env config changes, so a graceful fallback keeps existing
   * chat sessions working after a redeploy.
   */
  private findProvider(providerId?: string): ConfigModelProvider | undefined {
    const providers = this.activeProviders;
    let provider = providers.find((p) => p.id === providerId);

    if (!provider && providers.length > 0) {
      // Prioritize OpenRouter (no daily limits) over Groq (has daily limits)
      provider =
        providers.find((p) => p.name.toLowerCase().includes("openrouter")) ??
        providers.find((p) => p.name.toLowerCase().includes("groq")) ??
        providers.find((p) => p.name.toLowerCase().includes("anyapi")) ??
        providers.find((p) => p.name.toLowerCase().includes("nvidia")) ??
        providers[0];
    }

    return provider;
  }

  /** Whether the resolved provider was configured from environment variables. */
  isProviderEnvBased(providerId?: string): boolean {
    return this.findProvider(providerId)?.isEnvBased === true;
  }

  /**
   * Instantiates a Vercel AI SDK language model for the given provider and
   * model key. Falls back to the provider's first/default model when no key
   * is given. Temperature is a per-call setting in the AI SDK, so callers
   * pass it to generateText/streamText rather than the model instance.
   */
  async loadChatModel(providerId?: string, modelKey?: string): Promise<any> {
    const provider = this.findProvider(providerId);

    if (!provider) {
      throw new Error(
        "No model providers configured. Please add a provider in settings.",
      );
    }

    const type = provider.type.toLowerCase();
    const config = provider.config || {};
    const apiKey = config.apiKey || "";
    const availableModels = mergeChatModels(provider);
    const modelName =
      modelKey || availableModels[0]?.key || "";

    console.log(
      `[ModelRegistry] loadChatModel: providerId=${providerId} provider=${provider.name} type=${type} requestedModel=${modelKey ?? "(default)"} resolvedModel=${modelName}`,
    );

    if (!modelName) {
      throw new Error(`No chat models available for provider "${provider.name}"`);
    }

    // Validate that the requested model exists in the provider's model list
    if (modelKey && !availableModels.some((m) => m.key === modelKey)) {
      console.warn(
        `[ModelRegistry] Requested model "${modelKey}" not found in provider "${provider.name}". Available models: ${availableModels.map((m) => m.key).join(", ")}`,
      );
      throw new Error(
        `Model "${modelKey}" is not available for provider "${provider.name}". Please select a different model in Settings.`,
      );
    }

    // Validate API key is present
    if (!apiKey) {
      throw new Error(
        `No API key configured for provider "${provider.name}". Please add your API key in Settings → Model Providers.`,
      );
    }

    // OpenAI-compatible providers differ only by base URL.
    const openAICompatibleBaseURLs: Record<string, string> = {
      openai: "https://api.openai.com/v1",
      togetherai: "https://api.together.xyz/v1",
      perplexity: "https://api.perplexity.ai",
      nvidia: "https://integrate.api.nvidia.com/v1",
      openrouter: "https://openrouter.ai/api/v1",
      anyapi: "https://api.anyapi.ai/v1",
      deepseek: "https://api.deepseek.com",
      xai: "https://api.x.ai/v1",
    };

    if (type in openAICompatibleBaseURLs) {
      const { createOpenAI } = await import("@ai-sdk/openai");
      return createOpenAI({
        apiKey,
        baseURL: config.baseURL || openAICompatibleBaseURLs[type],
        // OpenRouter attributes usage to the calling app on its public app
        // rankings page (https://openrouter.ai/apps) when these headers are
        // present; see https://openrouter.ai/docs for the convention.
        ...(type === "openrouter" && {
          headers: {
            "HTTP-Referer": process.env.QWKSEARCH_URL || "https://qwksearch.com",
            "X-Title": process.env.QWKSEARCH_APP_NAME || "QwkSearch",
          },
        }),
      }).chat(modelName);
    }

    switch (type) {
      case "cloudflare": {
        const { createOpenAI } = await import("@ai-sdk/openai");
        const [cfApiToken, accountId] = apiKey.split(":");
        return createOpenAI({
          apiKey: cfApiToken,
          baseURL: `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1`,
        }).chat(modelName);
      }
      case "groq": {
        const { createGroq } = await import("@ai-sdk/groq");
        return createGroq({ apiKey })(modelName);
      }
      case "anthropic": {
        const { createAnthropic } = await import("@ai-sdk/anthropic");
        return createAnthropic({ apiKey })(modelName);
      }
      case "gemini":
      case "google": {
        const { createGoogleGenerativeAI } = await import("@ai-sdk/google");
        return createGoogleGenerativeAI({ apiKey })(modelName);
      }
      default:
        throw new Error(`Unsupported provider type: ${type}`);
    }
  }

  /**
   * Registers a new provider. Accepts both `(type, config)` — used by the
   * providers API route — and `(type, name, config)`.
   */
  async addProvider(type: string, nameOrConfig: any, config?: Record<string, any>) {
    let name: string;
    let finalConfig: Record<string, any>;
    if (typeof nameOrConfig === "object" && nameOrConfig !== null && !config) {
      finalConfig = nameOrConfig;
      const section = getModelProvidersUIConfigSection().find(
        (s) => s.key === type,
      );
      name = section?.name || type.toUpperCase();
    } else {
      name = String(nameOrConfig);
      finalConfig = config || {};
    }

    const newProvider = configManager.addModelProvider(type, name, finalConfig);
    return {
      ...newProvider,
      chatModels: getDefaultChatModels(type),
    };
  }

  async removeProvider(providerId: string) {
    configManager.removeModelProvider(providerId);
  }

  /**
   * Updates a provider's config. Accepts both `(id, config)` — used by the
   * providers API route — and `(id, name, config)`.
   */
  async updateProvider(providerId: string, nameOrConfig: any, config?: Record<string, any>) {
    let name: string;
    let finalConfig: Record<string, any>;
    if (typeof nameOrConfig === "object" && nameOrConfig !== null && !config) {
      finalConfig = nameOrConfig;
      const existing = this.activeProviders.find((p) => p.id === providerId);
      name = existing?.name || providerId;
    } else {
      name = String(nameOrConfig);
      finalConfig = config || {};
    }

    const updated = await configManager.updateModelProvider(
      providerId,
      name,
      finalConfig,
    );
    return {
      ...updated,
      chatModels: mergeChatModels(updated),
    };
  }

  async addProviderModel(providerId: string, type: "chat", model: any) {
    return configManager.addProviderModel(providerId, type, model);
  }

  async removeProviderModel(providerId: string, type: "chat", modelKey: string) {
    configManager.removeProviderModel(providerId, type, modelKey);
  }
}
