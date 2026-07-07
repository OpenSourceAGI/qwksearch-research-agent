/**
 * @fileoverview Language Generation Module
 *
 * Centralized exports for AI language model response generation using Vercel AI SDK.
 * Provides prompt templates, model registries, provider factories, and response
 * generation functions for 10+ LLM providers.
 *
 * @module language-generation
 * @author ai-research-agent contributors
 */

export {
  generateLanguageResponse,
  convertMarkdownToHTMLEscaped,
} from "./generate-response";

export type {
  LLMProviderName,
  GenerateLanguageOptions,
  GenerateLanguageResult,
} from "./generate-response";

export type {
  AgentPrompt,
  AgentTool,
} from "./generation-types";

export { AGENT_PROMPTS, extractJSONFromLanguageReply } from "./prompt-templates";
export {
  LANGUAGE_MODELS,
  LANGUAGE_PROVIDERS,
  getModelsByProvider,
  getAllModels,
  getModelsByCapability,
  getTextOnlyModels,
  getMultimodalModels,
} from "./language-model-registry";
export type { ModelCapability, ModelInfo } from "./language-model-registry";
export { createLLMProvider } from "./provider-factory";
export * from "./prompts";
