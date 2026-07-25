/**
 * Shared mock data for Storybook stories.
 *
 * These fixtures let the chat components render in complete isolation — no
 * API calls, auth session, or chat provider required. Everything a story
 * needs (messages, sources, search progress, suggestions) is fabricated here.
 */
import type { Section } from '../types/chat';
import type {
  UserMessage,
  AssistantMessage,
  SourceMessage,
  SearchQuery,
} from '../components/ChatConversation/ChatWindow';

const CHAT_ID = 'mock-chat-1';

/** A user message fixed to 12:29 PM today so timestamps render predictably. */
export const mockUserMessage: UserMessage = {
  role: 'user',
  chatId: CHAT_ID,
  messageId: 'msg-user-1',
  createdAt: (() => {
    const d = new Date();
    d.setHours(12, 29, 0, 0);
    return d;
  })(),
  content: 'What are the latest breakthroughs in solid-state battery technology?',
};

export const mockAssistantMessage: AssistantMessage = {
  role: 'assistant',
  chatId: CHAT_ID,
  messageId: 'msg-assistant-1',
  createdAt: (() => {
    const d = new Date();
    d.setHours(12, 29, 18, 0);
    return d;
  })(),
  content:
    'Recent solid-state battery work has focused on sulfide electrolytes and ' +
    'lithium-metal anodes, with several pilot lines targeting production by 2027.',
  suggestions: [
    'Which companies are closest to mass production?',
    'How do solid-state cells compare on energy density?',
    'What are the main manufacturing challenges?',
  ],
};

export const mockSources: SourceMessage['sources'] = [
  {
    pageContent:
      'Solid-state batteries replace the liquid electrolyte with a solid one, ' +
      'improving safety and enabling higher energy density.',
    metadata: {
      title: 'Solid-state battery - Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Solid-state_battery',
    },
  },
  {
    pageContent:
      'QuantumScape reported new results from its multi-layer cells, showing ' +
      'strong cycle life at automotive-relevant rates.',
    metadata: {
      title: 'QuantumScape multi-layer cell results',
      url: 'https://www.quantumscape.com/',
    },
  },
  {
    pageContent:
      'Toyota outlined a roadmap to commercialize solid-state EV batteries with ' +
      'a 700+ mile range target.',
    metadata: {
      title: 'Toyota solid-state battery roadmap',
      url: 'https://global.toyota/en/',
    },
  },
] as SourceMessage['sources'];

export const mockSearchQueries: SearchQuery[] = [
  { query: 'solid-state battery breakthroughs 2026', category: 'Web', status: 'done' },
  { query: 'sulfide electrolyte lithium metal anode', category: 'Academic', status: 'done' },
  { query: 'QuantumScape Toyota production timeline', category: 'News', status: 'running' },
];

/** A fully-populated section (user turn + assistant response + sources). */
export const mockSection: Section = {
  userMessage: mockUserMessage,
  assistantMessage: mockAssistantMessage,
  parsedAssistantMessage: mockAssistantMessage.content,
  speechMessage: mockAssistantMessage.content,
  sourceMessage: {
    role: 'source',
    chatId: CHAT_ID,
    messageId: 'msg-source-1',
    createdAt: new Date(),
    sources: mockSources,
  },
  searchingMessage: {
    role: 'searching',
    chatId: CHAT_ID,
    messageId: 'msg-searching-1',
    createdAt: new Date(),
    queries: mockSearchQueries,
  },
  thinkingEnded: true,
  suggestions: mockAssistantMessage.suggestions,
};
