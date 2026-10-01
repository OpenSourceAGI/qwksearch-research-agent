/**
 * @fileoverview Orchestrator for complex research queries.
 * Runs the web search, streams the result list to the client, and synthesizes
 * an answer from the result titles and snippets. LLM query expansion before
 * the search is opt-in.
 */
import { type LanguageModel } from "ai";
import type { Config, ChatTurnMessage, DrainableEmitter, MetaSearchAgentType } from "./meta-search-types";
export type { MetaSearchAgentType, Config, DrainableEmitter } from "./meta-search-types";
declare class MetaSearchAgent implements MetaSearchAgentType {
    private config;
    constructor(config: Config);
    /**
     * Asks the LLM to rephrase the message into a standalone search question,
     * and to pick out any URLs to summarize. Only runs when query expansion is on.
     */
    private expandQuery;
    /**
     * Runs the web search and returns its results as answer-context documents:
     * each one the result's title and search snippet, nothing fetched yet.
     */
    private retrieveSearchDocs;
    /**
     * Replaces the search snippets of the top web results with text fetched
     * from their pages, after the result list has been sent to the client.
     */
    private extractTopSources;
    /**
     * Runs the full search-and-answer pipeline, emitting "sources",
     * "response", "searching", "end", and "error" events on the emitter.
     */
    private runPipeline;
    searchAndAnswer(message: string, history: ChatTurnMessage[], llm: LanguageModel, optimizationMode: "speed" | "balanced" | "quality", fileIds: string[], systemInstructions: string, category?: string, sourceExtractionEnabled?: boolean, thinkingTimeLimit?: number, queryExpansionPrompt?: string, queryExpansionEnabled?: boolean): Promise<DrainableEmitter>;
}
export default MetaSearchAgent;
