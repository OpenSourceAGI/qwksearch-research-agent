/**
 * @module research/search/meta-search-types
 * @description Shared types for the MetaSearchAgent.
 */
import type { LanguageModel } from "ai";
import type EventEmitter from "events";

/** A single conversation turn, matching the Vercel AI SDK message shape. */
export interface ChatTurnMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

/** A `[role, content]` tuple used for few-shot prompt examples. */
export type FewShotExample = [role: "user" | "assistant", content: string];

export interface MetaSearchAgentType {
  searchAndAnswer: (
    message: string,
    history: ChatTurnMessage[],
    llm: LanguageModel,
    optimizationMode: "speed" | "balanced" | "quality",
    fileIds: string[],
    systemInstructions: string,
    category?: string,
    sourceExtractionEnabled?: boolean,
    thinkingTimeLimit?: number,
  ) => Promise<EventEmitter>;
}

/** Emitted on the EventEmitter data channel to report live search progress. */
export interface SearchingEvent {
  query: string;
  /** Display label shown in the UI (e.g. "Academic · max 10"). */
  category?: string;
  status: "running" | "done";
}

export interface Config {
  searchWeb: boolean;
  rerank: boolean;
  rerankThreshold: number;
  queryGeneratorPrompt: string;
  queryGeneratorFewShots: FewShotExample[];
  responsePrompt: string;
  activeEngines: string[];
  /** Optional: Function to fetch documents from URLs */
  getDocumentsFromLinks?: (options: { links: string[] }) => Promise<any[]>;
  /** Optional: Function to search via SearXNG */
  searchSearxng?: (query: string, options: any) => Promise<{ results: any[]; suggestions: string[] }>;
  /** Optional: Function to search via Tavily */
  searchTavily?: (query: string, options: any) => Promise<{ results: any[]; suggestions: string[] }>;
  /** Optional: Function to check if Tavily is configured */
  isTavilyConfigured?: () => boolean;
  /** Optional: Function to scrape a URL */
  scrapeURL?: (url: string, options: any) => Promise<string>;
}

export type BasicChainInput = {
  chat_history: ChatTurnMessage[];
  query: string;
};
