/**
 * @fileoverview Simplified ConfigManager for the research-agent package.
 * Manages model providers and search config in memory.
 */
import type { ConfigModelProvider, MCPServerConfig, Config, UIConfigSections } from "./types";
import { getModelProvidersUIConfigSection } from "../models/providers";
import { getEnv } from "./env";

const hashObj = (obj: { [key: string]: any }) => {
  const str = JSON.stringify(obj, Object.keys(obj).sort());
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return String(Math.abs(hash).toString(36));
};

class ConfigManager {
  configVersion = 1;
  currentConfig: Config = {
    version: this.configVersion,
    setupComplete: getEnv("SETUP_COMPLETE") === "true" || false,
    preferences: {},
    personalization: {},
    modelProviders: [],
    mcpServers: [],
    search: {
      searxngURL: "",
      tavilyApiKey: "",
      sourceScrapeCount: 3,
      sourceScrapeTimeout: 5,
    },
  };
  uiConfigSections: UIConfigSections = {
    preferences: [],
    personalization: [],
    modelProviders: [],
    mcpServers: [],
    search: [
      {
        name: "SearXNG URL",
        key: "searxngURL",
        type: "string",
        required: false,
        description: "The URL of your SearXNG instance",
        placeholder: "http://localhost:4000",
        default: "",
        scope: "server",
        env: "SEARXNG_API_URL",
      },
      {
        name: "Tavily API Key",
        key: "tavilyApiKey",
        type: "password",
        required: false,
        description:
          "Optional. Enter your own Tavily API key to override the site default.",
        placeholder: "tvly-...",
        default: "",
        scope: "server",
        env: "TAVILY_API_KEY",
      },
      {
        name: "Source pages to scrape",
        key: "sourceScrapeCount",
        type: "select",
        options: [
          { name: "Disabled (snippet only)", value: "0" },
          { name: "1 page", value: "1" },
          { name: "2 pages", value: "2" },
          { name: "3 pages (default)", value: "3" },
          { name: "5 pages", value: "5" },
        ],
        required: false,
        description: "Number of top search result URLs to fully scrape.",
        default: "3",
        scope: "server",
      },
      {
        name: "Scrape timeout (seconds)",
        key: "sourceScrapeTimeout",
        type: "select",
        options: [
          { name: "3 seconds", value: "3" },
          { name: "5 seconds (default)", value: "5" },
          { name: "10 seconds", value: "10" },
          { name: "15 seconds", value: "15" },
          { name: "20 seconds", value: "20" },
        ],
        required: false,
        description: "Maximum time to wait when scraping each source URL.",
        default: "5",
        scope: "server",
      },
    ],
  };

  private initialized = false;

  constructor() {
    // Don't initialize in constructor to avoid circular dependency
    // Initialize lazily when config is first accessed
  }

  private ensureInitialized() {
    if (this.initialized) return;
    this.initialize();
    this.initialized = true;
  }

  private initialize() {
    const providerConfigSections = getModelProvidersUIConfigSection();
    this.uiConfigSections.modelProviders = providerConfigSections;

    const newProviders: ConfigModelProvider[] = [];

    providerConfigSections.forEach((provider) => {
      const tempConfig: Record<string, any> = {};
      const required: string[] = [];

      provider.fields.forEach((field) => {
        tempConfig[field.key] =
          getEnv(field.env!) || field.default || "";
        if (field.required) required.push(field.key);
      });

      let configured = true;
      required.forEach((r) => {
        if (!tempConfig[r]) configured = false;
      });

      if (configured) {
        const hash = hashObj(tempConfig);
        const exists = this.currentConfig.modelProviders.find(
          (p) => p.hash === hash,
        );

        if (!exists) {
          newProviders.push({
            id: hash,
            name: `${provider.name}`,
            type: provider.key,
            chatModels: [],
            config: tempConfig,
            hash: hash,
            isEnvBased: true,
          });
        }
      }
    });

    if (newProviders.length > 0) {
      this.currentConfig.modelProviders.push(...newProviders);
    }

    // Search config from env
    this.uiConfigSections.search.forEach((f) => {
      if (f.env && !this.currentConfig.search[f.key]) {
        this.currentConfig.search[f.key] =
          getEnv(f.env) ?? f.default ?? "";
      }
    });
  }

  public getConfig(key: string, defaultValue?: any): any {
    this.ensureInitialized();
    const nested = key.split(".");
    let obj: any = this.currentConfig;

    for (let i = 0; i < nested.length; i++) {
      const part = nested[i];
      if (obj == null) return defaultValue;
      obj = obj[part];
    }

    return obj === undefined ? defaultValue : obj;
  }

  public updateConfig(key: string, val: any) {
    const parts = key.split(".");
    if (parts.length === 0) return;

    let target: any = this.currentConfig;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (target[part] === null || typeof target[part] !== "object") {
        target[part] = {};
      }
      target = target[part];
    }

    const finalKey = parts[parts.length - 1];
    target[finalKey] = val;
  }

  public addModelProvider(type: string, config: any) {
    this.ensureInitialized();
    const hash = hashObj(config);
    const section = this.uiConfigSections.modelProviders.find(s => s.key === type);
    const name = section?.name || type;

    const newModelProvider: ConfigModelProvider = {
      id: hash,
      name,
      type,
      config,
      chatModels: [],
      hash: hash,
    };

    this.currentConfig.modelProviders.push(newModelProvider);
    return newModelProvider;
  }

  public removeModelProvider(id: string) {
    this.currentConfig.modelProviders =
      this.currentConfig.modelProviders.filter((p) => p.id !== id);
  }

  public async updateModelProvider(id: string, config: any) {
    const provider = this.currentConfig.modelProviders.find(
      (p) => p.id === id,
    );
    if (!provider) throw new Error("Provider not found");

    provider.config = config;
    return provider;
  }

  public addProviderModel(providerId: string, type: "chat", model: any) {
    const provider = this.currentConfig.modelProviders.find(
      (p) => p.id === providerId,
    );
    if (!provider) throw new Error("Invalid provider id");

    delete model.type;
    provider.chatModels.push(model);
    return model;
  }

  public removeProviderModel(
    providerId: string,
    type: "chat",
    modelKey: string,
  ) {
    const provider = this.currentConfig.modelProviders.find(
      (p) => p.id === providerId,
    );
    if (!provider) throw new Error("Invalid provider id");

    provider.chatModels = provider.chatModels.filter((m) => m.key !== modelKey);
  }

  public isSetupComplete() {
    return this.currentConfig.setupComplete;
  }

  public markSetupComplete() {
    if (!this.currentConfig.setupComplete) {
      this.currentConfig.setupComplete = true;
    }
  }

  public getUIConfigSections(): UIConfigSections {
    this.ensureInitialized();
    return this.uiConfigSections;
  }

  public getCurrentConfig(): Config {
    this.ensureInitialized();
    return JSON.parse(JSON.stringify(this.currentConfig));
  }
}

const configManager = new ConfigManager();

export default configManager;
