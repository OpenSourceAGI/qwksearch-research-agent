import type { ChatAdapter } from '../types';
import { composerAround, extractByRole, pickFirst } from './shared';

export const claudeAdapter: ChatAdapter = {
  id: 'claude',
  findInput: (doc) =>
    pickFirst(doc, [
      '[data-testid="chat-input"]',
      'div.ProseMirror[contenteditable="true"]',
      'fieldset [contenteditable="true"]',
    ]),
  findAnchor: (_doc, input) => composerAround(input, ['fieldset']),
  extractMessages: (doc) =>
    extractByRole(doc, {
      user: '[data-testid="user-message"]',
      assistant: '.font-claude-response, .font-claude-message',
      exclude: '[data-testid="action-bar-copy"], [class*="thinking" i]',
    }),
};
