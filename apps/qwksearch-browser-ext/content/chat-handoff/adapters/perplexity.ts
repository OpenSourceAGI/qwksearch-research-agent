import type { ChatAdapter } from '../types';
import { composerAround, extractByRole, pickFirst } from './shared';

export const perplexityAdapter: ChatAdapter = {
  id: 'perplexity',
  findInput: (doc) =>
    pickFirst(doc, ['#ask-input', 'textarea[placeholder*="Ask" i]', 'div[contenteditable="true"][role="textbox"]']),
  findAnchor: (_doc, input) => composerAround(input),
  extractMessages: (doc) =>
    extractByRole(doc, {
      user: '[class*="group/query"], [data-testid="thread-query"]',
      assistant: '[id^="markdown-content-"], [data-testid="thread-answer"]',
    }),
};
