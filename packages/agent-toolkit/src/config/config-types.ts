/**
 * @module research/models/types
 * @description Research library module.
 */
type Model = {
  name: string;
  key: string;
};

type ModelList = {
  chat: Model[];
};

type ProviderMetadata = {
  name: string;
  key: string;
};

type MinimalProvider = {
  id: string;
  name: string;
  chatModels: Model[];
};

type ModelWithProvider = {
  key?: string;
  providerId?: string;
};

export type ConfigModelProvider = {
  id: string;
  name: string;
  apiKey?: string;
  baseURL?: string;
  models?: string[];
};

export type MCPServerConfig = {
  command: string;
  args?: string[];
  env?: Record<string, string>;
};

export type Config = {
  modelProviders?: ConfigModelProvider[];
  search?: {
    searxngURL?: string;
    tavilyApiKey?: string;
    sourceScrapeCount?: number;
    sourceScrapeTimeout?: number;
  };
  mcpServers?: Record<string, MCPServerConfig>;
};

export type UIConfigSections = {
  providers: boolean;
  search: boolean;
  mcp: boolean;
};

export type {
  Model,
  ModelList,
  ProviderMetadata,
  MinimalProvider,
  ModelWithProvider,
};


