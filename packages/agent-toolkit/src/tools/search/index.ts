/**
 * @module agent-toolkit/tools/search
 * @description Meta search agent tools for AI-powered web search and research
 */

export { default as MetaSearchAgent } from "./metaSearchAgent";
export type { MetaSearchAgentType, Config, ChatTurnMessage, SearchingEvent, FewShotExample } from "./meta-search-types";
export { searchHandlers, createSearchHandlers } from "./search-handlers";
export { default as generateSuggestions } from "./suggestionGeneratorAgent";
export { groupAndSummarizeDocs } from "./link-summarizer";
export type { Document } from "./document";
export { splitTextIntoChunks } from "./document";
export { buildFallbackDocs, rerankDocs, processDocs, normalizeSourcesOutput, registerUploadFileLoader } from "./doc-utils";
export type { UploadFileLoader } from "./doc-utils";
