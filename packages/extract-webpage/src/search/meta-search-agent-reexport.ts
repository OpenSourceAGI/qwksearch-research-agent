/**
 * @fileoverview Re-exports MetaSearchAgent from agent-toolkit
 * @deprecated Import from 'agent-toolkit' instead
 */

export {
  MetaSearchAgent as default,
  searchHandlers,
  generateSuggestions,
  groupAndSummarizeDocs,
  buildFallbackDocs,
  rerankDocs,
  processDocs,
  normalizeSourcesOutput,
  splitTextIntoChunks,
} from "agent-toolkit/tools/search";

export type {
  MetaSearchAgentType,
  Config,
  ChatTurnMessage,
  SearchingEvent,
  FewShotExample,
  Document,
} from "agent-toolkit/tools/search";

export {
  LineOutputParser,
  LineListOutputParser,
  formatChatHistoryAsString,
} from "agent-toolkit/utils";

export {
  webSearchResponsePrompt,
  webSearchRetrieverPrompt,
  webSearchRetrieverFewShots,
  writingAssistantPrompt,
} from "agent-toolkit/language-generation/prompts/search-prompts";
