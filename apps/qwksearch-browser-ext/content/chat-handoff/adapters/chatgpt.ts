import type { ChatAdapter, ChatRole } from '../types';
import { composerAround, extractByRole, pickFirst } from './shared';

export const chatgptAdapter: ChatAdapter = {
  id: 'chatgpt',
  findInput: (doc) =>
    pickFirst(doc, ['#prompt-textarea', 'textarea[name="prompt-textarea"]', 'form [contenteditable="true"]']),
  findAnchor: (_doc, input) => composerAround(input),
  extractMessages: (doc) =>
    extractByRole(doc, {
      both: {
        selector: '[data-message-author-role]',
        roleOf: (el) => {
          const role = el.getAttribute('data-message-author-role');
          return role === 'user' || role === 'assistant' ? (role as ChatRole) : null;
        },
      },
      content: (el, role) =>
        role === 'assistant' ? el.querySelector('.markdown') : el.querySelector('.whitespace-pre-wrap'),
    }),
};
