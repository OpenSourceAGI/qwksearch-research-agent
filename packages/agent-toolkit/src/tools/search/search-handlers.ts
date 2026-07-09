/**
 * @module research/search/index
 * @description Research library module.
 *
 * Note: To use these search handlers, you need to provide search functions
 * (searchSearxng, searchTavily, etc.) from extract-webpage package.
 * See extract-webpage/src/search/index.ts for an example.
 */
import MetaSearchAgent from "./metaSearchAgent";
import {
  webSearchRetrieverPrompt,
  webSearchResponsePrompt,
  webSearchRetrieverFewShots,
  writingAssistantPrompt,
} from "write-language";
import type { Config } from "./meta-search-types";

const prompts = {
  webSearchRetrieverPrompt,
  webSearchResponsePrompt,
  webSearchRetrieverFewShots,
  writingAssistantPrompt,
};

/**
 * Creates search handler instances with provided search functions.
 * Pass in search functions from extract-webpage to enable web search.
 */
export const createSearchHandlers = (searchFunctions?: Partial<Config>) => ({
  webSearch: new MetaSearchAgent({
    activeEngines: [],
    queryGeneratorPrompt: prompts.webSearchRetrieverPrompt,
    responsePrompt: prompts.webSearchResponsePrompt,
    queryGeneratorFewShots: prompts.webSearchRetrieverFewShots,
    rerank: true,
    rerankThreshold: 0.3,
    searchWeb: true,
    ...searchFunctions,
  }),
  academicSearch: new MetaSearchAgent({
    activeEngines: ["arxiv", "google scholar", "pubmed"],
    queryGeneratorPrompt: prompts.webSearchRetrieverPrompt,
    responsePrompt: prompts.webSearchResponsePrompt,
    queryGeneratorFewShots: prompts.webSearchRetrieverFewShots,
    rerank: true,
    rerankThreshold: 0,
    searchWeb: true,
    ...searchFunctions,
  }),
  writingAssistant: new MetaSearchAgent({
    activeEngines: [],
    queryGeneratorPrompt: "",
    queryGeneratorFewShots: [],
    responsePrompt: prompts.writingAssistantPrompt,
    rerank: true,
    rerankThreshold: 0,
    searchWeb: true,
    ...searchFunctions,
  }),
  wolframAlphaSearch: new MetaSearchAgent({
    activeEngines: ["wolframalpha"],
    queryGeneratorPrompt: prompts.webSearchRetrieverPrompt,
    responsePrompt: prompts.webSearchResponsePrompt,
    queryGeneratorFewShots: prompts.webSearchRetrieverFewShots,
    rerank: false,
    rerankThreshold: 0,
    searchWeb: true,
    ...searchFunctions,
  }),
  youtubeSearch: new MetaSearchAgent({
    activeEngines: ["youtube"],
    queryGeneratorPrompt: prompts.webSearchRetrieverPrompt,
    responsePrompt: prompts.webSearchResponsePrompt,
    queryGeneratorFewShots: prompts.webSearchRetrieverFewShots,
    rerank: true,
    rerankThreshold: 0.3,
    searchWeb: true,
    ...searchFunctions,
  }),
  redditSearch: new MetaSearchAgent({
    activeEngines: ["reddit"],
    queryGeneratorPrompt: prompts.webSearchRetrieverPrompt,
    responsePrompt: prompts.webSearchResponsePrompt,
    queryGeneratorFewShots: prompts.webSearchRetrieverFewShots,
    rerank: true,
    rerankThreshold: 0.3,
    searchWeb: true,
    ...searchFunctions,
  }),
});

/**
 * Default search handlers without search functions.
 * These will not perform actual web searches unless search functions are added to the Config.
 * @deprecated Use createSearchHandlers() with search functions instead
 */
export const searchHandlers = createSearchHandlers();
