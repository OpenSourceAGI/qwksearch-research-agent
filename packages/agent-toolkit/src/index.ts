/**
 * @fileoverview AI Agent Toolkit
 *
 * Multi-provider AI agent toolkit for generating language responses, searching the web,
 * extracting page content, and managing long-term memory across 10+ LLM providers.
 *
 * Built on Vercel AI SDK with prompt templates for research, summarization, citation
 * answering, query resolution, and knowledge-graph extraction.
 *
 * @module ai-research-agent
 * @author vtempest <grokthiscontact@gmail.com>
 * @license AGPL-3.0
 * @see {@link https://github.com/vtempest/ai-research-agent}
 */

export * from "write-language";
export * from "./prompts";
export * from "./memory";
export * from "./tools";
// Both write-language and ./tools export AGENT_TOOLS; this package's own wins.
export { AGENT_TOOLS } from "./tools";
export * from "./utils";
export { configManager, ModelRegistry, getEnv, getModelProvidersUIConfigSection } from "./config";
export type { Config, ConfigModelProvider, MCPServerConfig, UIConfigSections, Model, ModelWithProvider } from "./config";
export { cropProvider, cropProviderAsBlob, cropProviderAsDataURL, getProviderImage, getProviderNames } from "./utils/provider-image-cropper";
export type { Provider } from "./utils/provider-image-cropper";
