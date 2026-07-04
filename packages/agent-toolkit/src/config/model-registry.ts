/**
 * @fileoverview Registry for managing and loading LangChain AI model providers.
 *
 * Exposes the full API expected by the app's API routes and chat handler:
 * - `activeProviders` (sync getter) / `getActiveProviders()`
 * - `isProviderEnvBased(providerId)`
 * - `loadChatModel(providerId, modelKey)`
 * - provider/model CRUD passthroughs to {@link configManager}
 */
import configManager from "./config-manager";
import { LANGUAGE_MODELS } from "./language-models-database";
import { getModelProvidersUIConfigSection } from "./provider-ui-config";
import type { ConfigModelProvider, Model } from "./config-types";

// Maps a provider UI key to the matching `provider` name in the
// LANGUAGE_MODELS database (e.g. the "gemini" UI key ↔ "Google" model list).
const PROVIDER_KEY_TO_DB_NAME: Record<string, string> = {
  openai: "openai",
  ollama: "ollama",
  anthropic: "anthropic",
  gemini: "google",
  groq: "groq",
  deepseek: "deepseek",
  nvidia: "nvidia",
  openrouter: "openrouter",
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
  async getActiveProviders() {
    return this.activeProviders.map((p) => ({
      id: p.id,
      name: p.name,
      type: p.type,
      chatModels: mergeChatModels(p),
    }));
  }

  /**
   * Finds a provider by id, falling back to NVIDIA, then Groq, then the
   * first configured provider. Client-side provider ids are config hashes
   * that go stale whenever server env config changes, so a graceful
   * fallback keeps existing chat sessions working after a redeploy.
   */
  private findProvider(providerId?: string): ConfigModelProvider | undefined {
    const providers = this.activeProviders;
    let provider = providers.find((p) => p.id === providerId);

    if (!provider && providers.length > 0) {
      provider =
        providers.find((p) => p.name.toLowerCase().includes("nvidia")) ??
        providers.find((p) => p.name.toLowerCase().includes("groq")) ??
        providers[0];
    }

    return provider;
  }

  /** Whether the resolved provider was configured from environment variables. */
  isProviderEnvBased(providerId?: string): boolean {
    return this.findProvider(providerId)?.isEnvBased === true;
  }

  /**
   * Instantiates a LangChain chat model for the given provider and model key.
   * Falls back to the provider's first/default model when no key is given.
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
    const modelName =
      modelKey || mergeChatModels(provider)[0]?.key || "";

    if (!modelName) {
      throw new Error(`No chat models available for provider "${provider.name}"`);
    }

    // OpenAI-compatible providers differ only by base URL.
    const openAICompatibleBaseURLs: Record<string, string> = {
      openai: "https://api.openai.com/v1",
      togetherai: "https://api.together.xyz/v1",
      perplexity: "https://api.perplexity.ai",
      nvidia: "https://integrate.api.nvidia.com/v1",
      openrouter: "https://openrouter.ai/api/v1",
      deepseek: "https://api.deepseek.com",
      xai: "https://api.x.ai/v1",
    };

    if (type in openAICompatibleBaseURLs) {
      const { ChatOpenAI } = await import("@langchain/openai");
      return new ChatOpenAI({
        apiKey,
        modelName,
        temperature: 0.7,
        configuration: {
          baseURL: config.baseURL || openAICompatibleBaseURLs[type],
        },
      });
    }

    switch (type) {
      case "ollama": {
        const { ChatOpenAI } = await import("@langchain/openai");
        return new ChatOpenAI({
          apiKey: "ollama",
          modelName,
          temperature: 0.7,
          configuration: {
            baseURL: config.baseURL || "http://localhost:11434/v1",
          },
        });
      }
      case "cloudflare": {
        const { ChatOpenAI } = await import("@langchain/openai");
        const [cfApiToken, accountId] = apiKey.split(":");
        return new ChatOpenAI({
          apiKey: cfApiToken,
          modelName,
          temperature: 0.7,
          configuration: {
            baseURL: `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1`,
          },
        });
      }
      case "groq": {
        const { ChatGroq } = await import("@langchain/groq");
        return new ChatGroq({ apiKey, model: modelName, temperature: 0.7 });
      }
      case "anthropic": {
        const { ChatAnthropic } = await import("@langchain/anthropic");
        return new ChatAnthropic({ apiKey, model: modelName, temperature: 0.7 });
      }
      case "gemini":
      case "google": {
        const { ChatGoogleGenerativeAI } = await import("@langchain/google-genai");
        return new ChatGoogleGenerativeAI({
          apiKey,
          model: modelName,
          temperature: 0.7,
        });
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
