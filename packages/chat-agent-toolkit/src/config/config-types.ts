/**
 * @module research/models/types
 * @description Shared types for the config system and model registry.
 */

/** A chat model entry as shown in provider model lists. */
export type Model = {
  name: string;
  key: string;
};

/** Provider shape consumed by model-selector UI components. */
export type MinimalProvider = {
  id: string;
  name: string;
  chatModels: Model[];
};

/** Client-side model selection: which provider and model key to use. */
export type ModelWithProvider = {
  key?: string;
  providerId?: string;
};

/** A configured model provider (env-based or user-added). */
export type ConfigModelProvider = {
  id: string;
  name: string;
  /** Provider type key, e.g. "openai", "anthropic", "gemini". */
  type: string;
  /** User-added chat models (defaults come from LANGUAGE_MODELS). */
  chatModels: Model[];
  /** Provider connection config, e.g. { apiKey, baseURL }. */
  config: Record<string, any>;
  /** Hash of the config, used as the provider id. */
  hash: string;
  /** True when the provider was configured from environment variables. */
  isEnvBased?: boolean;
};

export type MCPServerConfig = {
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  [key: string]: any;
};

export type Config = {
  version: number;
  setupComplete: boolean;
  preferences: Record<string, any>;
  personalization: Record<string, any>;
  modelProviders: ConfigModelProvider[];
  mcpServers: MCPServerConfig[];
  search: Record<string, any>;
};

/** UI field/section definitions consumed by the settings screens. */
export type UIConfigSections = {
  preferences: any[];
  personalization: any[];
  modelProviders: any[];
  mcpServers: any[];
  search: any[];
};
