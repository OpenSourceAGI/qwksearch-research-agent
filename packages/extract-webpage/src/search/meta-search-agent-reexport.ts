/**
 * @fileoverview Re-exports MetaSearchAgent from chat-agent-toolkit
 * @deprecated Import from 'chat-agent-toolkit' instead
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
} from "chat-agent-toolkit";

export type {
  MetaSearchAgentType,
  Config,
  ChatTurnMessage,
  SearchingEvent,
  FewShotExample,
  Document,
} from "chat-agent-toolkit";

export {
  LineOutputParser,
  LineListOutputParser,
  formatChatHistoryAsString,
} from "chat-agent-toolkit";

export {
  webSearchResponsePrompt,
  webSearchRetrieverPrompt,
  webSearchRetrieverFewShots,
  writingAssistantPrompt,
} from "chat-agent-toolkit";
