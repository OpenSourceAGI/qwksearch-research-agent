/**
 * @module extract-webpage/search
 * @description Re-exports MetaSearchAgent from agent-toolkit with search functions
 */

import { createSearchHandlers } from "chat-agent-toolkit";
import { searchSearxng } from "./public-searxng";
import { searchTavily, isTavilyConfigured } from "./tavily";
import { scrapeURL } from "./url-to-html";
import { getDocumentsFromLinks } from "../utils/documents";

// Export search handlers with actual search functions
export const searchHandlers = createSearchHandlers({
  searchSearxng,
  searchTavily,
  isTavilyConfigured,
  scrapeURL,
  getDocumentsFromLinks,
});

// Re-export everything from agent-toolkit for convenience
export {
  MetaSearchAgent,
  generateSuggestions,
  groupAndSummarizeDocs,
  buildFallbackDocs,
  rerankDocs,
  processDocs,
  normalizeSourcesOutput,
  splitTextIntoChunks,
  LineOutputParser,
  LineListOutputParser,
  formatChatHistoryAsString,
} from "chat-agent-toolkit";

export type {
  MetaSearchAgentType,
  Config,
  ChatTurnMessage,
  SearchingEvent,
  FewShotExample,
  Document,
} from "chat-agent-toolkit";
