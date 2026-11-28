import type { ChatAdapter } from '../types';
import { extractByRole, pickFirst } from './shared';

export const geminiAdapter: ChatAdapter = {
  id: 'gemini',
  findInput: (doc) =>
    pickFirst(doc, [
      'rich-textarea .ql-editor[contenteditable="true"]',
      'div.ql-editor[contenteditable="true"]',
      '[contenteditable="true"][role="textbox"]',
    ]),
  findAnchor: (_doc, input) =>
    input.closest<HTMLElement>('input-area-v2, .input-area-container, .input-area') ??
    input.closest<HTMLElement>('rich-textarea')?.parentElement ??
    input.parentElement,
  extractMessages: (doc) =>
    extractByRole(doc, {
      user: 'user-query',
      exclude: '.code-block-decoration',
      assistant: 'model-response',
      content: (el, role) =>
        role === 'user'
          ? el.querySelector('.query-text') ?? el
          : el.querySelector('message-content, .markdown') ?? el,
    }),
};
