/**
 * @fileoverview Configuration Management Module
 *
 * Manages model providers, environment variables, and UI configuration
 * for the AI agent toolkit. Provides in-memory config storage with
 * support for multiple LLM providers and MCP servers.
 *
 * @module config
 * @author ai-research-agent contributors
 */

export { default as configManager } from "./config-manager";
export { default as ModelRegistry } from "./model-registry";
export { getEnv } from "./environment-variables";
export { LANGUAGE_MODELS } from "./language-models-database";
export { getModelProvidersUIConfigSection } from "./provider-ui-config";
export type {
  Config,
  ConfigModelProvider,
  MCPServerConfig,
  UIConfigSections,
  Model,
  ModelWithProvider,
} from "./config-types";
