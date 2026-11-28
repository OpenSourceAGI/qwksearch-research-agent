import type { ChatAdapter, ChatRole } from '../types';
import { composerAround, extractByRole, pickFirst } from './shared';

export const grokAdapter: ChatAdapter = {
  id: 'grok',
  findInput: (doc) =>
    pickFirst(doc, [
      'textarea[aria-label*="Grok" i]',
      'div.tiptap.ProseMirror[contenteditable="true"]',
      'form textarea',
      'form [contenteditable="true"]',
    ]),
  findAnchor: (_doc, input) => composerAround(input),
  extractMessages: (doc) =>
    extractByRole(doc, {
      both: {
        selector: '.message-bubble',
        roleOf: (el): ChatRole | null =>
          el.closest('.items-end') ? 'user' : el.closest('.items-start') ? 'assistant' : null,
      },
      content: (el, role) => (role === 'assistant' ? el.querySelector('.response-content-markdown') ?? el : el),
    }),
};
