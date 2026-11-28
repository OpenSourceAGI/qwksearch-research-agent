import type { ChatAdapter } from '../types';
import { composerAround, extractByRole, pickFirst } from './shared';

export const deepseekAdapter: ChatAdapter = {
  id: 'deepseek',
  findInput: (doc) => pickFirst(doc, ['textarea#chat-input', 'textarea[placeholder*="DeepSeek" i]', 'textarea']),
  findAnchor: (_doc, input) => composerAround(input),
  extractMessages: (doc) =>
    extractByRole(doc, {
      both: {
        selector: '.ds-message',
        roleOf: (el) => (el.querySelector('.ds-markdown') ? 'assistant' : 'user'),
      },
      content: (el, role) => (role === 'assistant' ? el.querySelector('.ds-markdown') ?? el : el),
      exclude: '.ds-think-content, [class*="think" i]',
    }),
};
