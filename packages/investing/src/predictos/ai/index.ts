/**
 * AI provider clients and prompt builders for the PredictOS pipeline.
 */

export * from "./types.js";
export * from "./http.js";
export { callOpenAIResponses } from "./callOpenAI.js";
export type { OpenAICallOptions } from "./callOpenAI.js";
export { callGrokResponses } from "./callGrok.js";
export type { GrokToolType, GrokCallOptions } from "./callGrok.js";
export {
  callBlockRunResponses,
  isBlockRunModel,
  listBlockRunModels,
  BLOCKRUN_MODELS,
} from "./callBlockRun.js";
export type { BlockRunCallOptions } from "./callBlockRun.js";

// Prompt builders
export { analyzeEventMarketsPrompt } from "./prompts/analyzeEventMarkets.js";
export { bookmakerAnalysisPrompt } from "./prompts/bookmakerAnalysis.js";
export type { AgentAnalysis, X402ResultInput as BookmakerX402ResultInput } from "./prompts/bookmakerAnalysis.js";
export { arbitrageAnalysisPrompt } from "./prompts/arbitrageAnalysis.js";
export type { ArbitragePromptInput } from "./prompts/arbitrageAnalysis.js";
export { searchQueryGeneratorPrompt } from "./prompts/searchQueryGenerator.js";
export type { SearchQueryGeneratorInput } from "./prompts/searchQueryGenerator.js";
