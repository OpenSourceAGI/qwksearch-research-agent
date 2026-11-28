import type { ChatAdapter, ChatRole } from '../types';
import { composerAround, extractByRole, pickFirst } from './shared';

export const mistralAdapter: ChatAdapter = {
  id: 'mistral',
  findInput: (doc) =>
    pickFirst(doc, ['div.ProseMirror[contenteditable="true"]', 'form textarea', 'textarea']),
  findAnchor: (_doc, input) => composerAround(input),
  extractMessages: (doc) =>
    extractByRole(doc, {
      both: {
        selector: '[data-message-author-role], [data-testid="user-message"], [data-testid="assistant-message"]',
        roleOf: (el): ChatRole | null => {
          const role = el.getAttribute('data-message-author-role');
          if (role === 'user' || role === 'assistant') return role;
          const id = el.getAttribute('data-testid');
          return id === 'user-message' ? 'user' : id === 'assistant-message' ? 'assistant' : null;
        },
      },
    }),
};
