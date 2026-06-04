/**
 * @fileoverview Registry for managing and loading LangChain AI model providers.
 * Provides backwards compatibility for apps/qwksearch-web and apps/qwksearch-api.
 */
import configManager from "../config";
import { LANGUAGE_MODELS } from "../config/models";
import { getModelProvidersUIConfigSection } from "../config/ui-config";

class ModelRegistry {
  get activeProviders() {
    return configManager.currentConfig.modelProviders;
  }

  async getActiveProviders() {
    const providers = configManager.currentConfig.modelProviders;
    return providers.map((p) => {
      const defaultEntry = LANGUAGE_MODELS.find(
        (m) => m.provider.toLowerCase() === p.type.toLowerCase()
      );
      const defaultModels = defaultEntry
        ? defaultEntry.models.map((m) => ({ key: m.id, name: m.name }))
        : [];
      const chatModels = [
        ...defaultModels,
        ...(p.chatModels || []).map((m: any) => ({ key: m.key, name: m.name })),
      ];
      return {
        id: p.id,
        name: p.name,
        chatModels,
      };
    });
  }

  async loadChatModel(providerId: string, modelName: string): Promise<any> {
    let provider = configManager.currentConfig.modelProviders.find((p) => p.id === providerId);
    
    if (!provider && configManager.currentConfig.modelProviders.length > 0) {
      provider = configManager.currentConfig.modelProviders.find((p) =>
        p.name.toLowerCase().includes('nvidia'),
      );
      if (!provider) {
        provider = configManager.currentConfig.modelProviders.find((p) =>
          p.name.toLowerCase().includes('groq'),
        );
      }
      if (!provider) {
        provider = configManager.currentConfig.modelProviders[0];
      }
    }

    if (!provider) {
      throw new Error(
        'No model providers configured. Please add a provider in settings.',
      );
    }

    const type = provider.type.toLowerCase();
    const config = provider.config || {};
    const apiKey = config.apiKey || "";

    switch (type) {
      case "openai": {
        const { ChatOpenAI } = await import("@langchain/openai");
        return new ChatOpenAI({
          apiKey,
          modelName,
          temperature: 0.7,
          configuration: {
            baseURL: config.baseURL || "https://api.openai.com/v1",
          },
        });
      }
      case "togetherai": {
        const { ChatOpenAI } = await import("@langchain/openai");
        return new ChatOpenAI({
          apiKey,
          modelName,
          temperature: 0.7,
          configuration: {
            baseURL: config.baseURL || "https://api.together.xyz/v1",
          },
        });
      }
      case "perplexity": {
        const { ChatOpenAI } = await import("@langchain/openai");
        return new ChatOpenAI({
          apiKey,
          modelName,
          temperature: 0.7,
          configuration: {
            baseURL: config.baseURL || "https://api.perplexity.ai",
          },
        });
      }
      case "nvidia": {
        const { ChatOpenAI } = await import("@langchain/openai");
        return new ChatOpenAI({
          apiKey,
          modelName,
          temperature: 0.7,
          configuration: {
            baseURL: config.baseURL || "https://integrate.api.nvidia.com/v1",
          },
        });
      }
      case "openrouter": {
        const { ChatOpenAI } = await import("@langchain/openai");
        return new ChatOpenAI({
          apiKey,
          modelName,
          temperature: 0.7,
          configuration: {
            baseURL: config.baseURL || "https://openrouter.ai/api/v1",
          },
        });
      }
      case "deepseek": {
        const { ChatOpenAI } = await import("@langchain/openai");
        return new ChatOpenAI({
          apiKey,
          modelName,
          temperature: 0.7,
          configuration: {
            baseURL: config.baseURL || "https://api.deepseek.com",
          },
        });
      }
      case "xai": {
        const { ChatOpenAI } = await import("@langchain/openai");
        return new ChatOpenAI({
          apiKey,
          modelName,
          temperature: 0.7,
          configuration: {
            baseURL: config.baseURL || "https://api.x.ai/v1",
          },
        });
      }
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
        return new ChatGroq({
          apiKey,
          model: modelName,
          temperature: 0.7,
        });
      }
      case "anthropic": {
        const { ChatAnthropic } = await import("@langchain/anthropic");
        return new ChatAnthropic({
          apiKey,
          model: modelName,
          temperature: 0.7,
        });
      }
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

  isProviderEnvBased(providerId: string): boolean {
    let provider = configManager.currentConfig.modelProviders.find((p) => p.id === providerId);
    if (!provider && configManager.currentConfig.modelProviders.length > 0) {
      provider = configManager.currentConfig.modelProviders.find((p) =>
        p.name.toLowerCase().includes('nvidia'),
      );
      if (!provider) {
        provider = configManager.currentConfig.modelProviders.find((p) =>
          p.name.toLowerCase().includes('groq'),
        );
      }
      if (!provider) {
        provider = configManager.currentConfig.modelProviders[0];
      }
    }
    return provider?.isEnvBased === true;
  }

  async addProvider(type: string, nameOrConfig: any, config?: any) {
    let name: string;
    let finalConfig: Record<string, any>;
    if (typeof nameOrConfig === "object" && !config) {
      finalConfig = nameOrConfig;
      const section = getModelProvidersUIConfigSection().find(s => s.key === type);
      name = section?.name || type.toUpperCase();
    } else {
      name = nameOrConfig as string;
      finalConfig = config!;
    }
    
    const newProvider = configManager.addModelProvider(type, name, finalConfig);
    
    // Return with chatModels populated
    const defaultEntry = LANGUAGE_MODELS.find(
      (m) => m.provider.toLowerCase() === type.toLowerCase()
    );
    const defaultModels = defaultEntry
      ? defaultEntry.models.map((m) => ({ key: m.id, name: m.name }))
      : [];
      
    return {
      ...newProvider,
      chatModels: defaultModels,
    };
  }

  async removeProvider(providerId: string) {
    configManager.removeModelProvider(providerId);
  }

  async updateProvider(providerId: string, nameOrConfig: any, config?: any) {
    let name: string;
    let finalConfig: Record<string, any>;
    if (typeof nameOrConfig === "object" && !config) {
      finalConfig = nameOrConfig;
      const existing = configManager.currentConfig.modelProviders.find(p => p.id === providerId);
      name = existing?.name || providerId;
    } else {
      name = nameOrConfig as string;
      finalConfig = config!;
    }
    
    const updated = await configManager.updateModelProvider(providerId, name, finalConfig);
    
    const defaultEntry = LANGUAGE_MODELS.find(
      (m) => m.provider.toLowerCase() === updated.type.toLowerCase()
    );
    const defaultModels = defaultEntry
      ? defaultEntry.models.map((m) => ({ key: m.id, name: m.name }))
      : [];
      
    return {
      ...updated,
      chatModels: [
        ...defaultModels,
        ...(updated.chatModels || []).map((m: any) => ({ key: m.key, name: m.name })),
      ],
    };
  }

  async addProviderModel(providerId: string, type: 'chat', model: any) {
    return configManager.addProviderModel(providerId, type, model);
  }

  async removeProviderModel(providerId: string, type: 'chat', modelKey: string) {
    configManager.removeProviderModel(providerId, type, modelKey);
  }
}

export default ModelRegistry;
