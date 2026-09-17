/**
 * @fileoverview Orchestrator for complex research queries.
 * Manages query expansion, web search execution, and result synthesis using
 * LLMs through the Vercel AI SDK (generateText/streamText).
 */
import { type LanguageModel } from "ai";
import type { Config, ChatTurnMessage, DrainableEmitter, MetaSearchAgentType } from "./meta-search-types";
export type { MetaSearchAgentType, Config, DrainableEmitter } from "./meta-search-types";
declare class MetaSearchAgent implements MetaSearchAgentType {
    private config;
    constructor(config: Config);
    /**
     * Rephrases the user's query into a standalone search question (and any
     * URLs to summarize), runs the web search, and returns the documents to
     * use as answer context.
     */
    private retrieveSearchDocs;
    /**
     * Runs the full search-and-answer pipeline, emitting "sources",
     * "response", "searching", "end", and "error" events on the emitter.
     */
    private runPipeline;
    searchAndAnswer(message: string, history: ChatTurnMessage[], llm: LanguageModel, optimizationMode: "speed" | "balanced" | "quality", fileIds: string[], systemInstructions: string, category?: string, sourceExtractionEnabled?: boolean, thinkingTimeLimit?: number, queryExpansionPrompt?: string): Promise<DrainableEmitter>;
}
export default MetaSearchAgent;
