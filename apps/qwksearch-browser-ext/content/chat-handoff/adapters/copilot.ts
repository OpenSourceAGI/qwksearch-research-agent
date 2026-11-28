import type { ChatAdapter } from '../types';
import { composerAround, extractByRole, pickFirst } from './shared';

export const copilotAdapter: ChatAdapter = {
  id: 'copilot',
  findInput: (doc) =>
    pickFirst(doc, ['textarea#userInput', 'textarea[placeholder*="Copilot" i]', '[data-testid="composer-input"]']),
  findAnchor: (_doc, input) => composerAround(input, ['[data-testid="composer"]']),
  extractMessages: (doc) =>
    extractByRole(doc, {
      user: '[data-content="user-message"]',
      assistant: '[data-content="ai-message"]',
    }),
};
