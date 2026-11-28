import type { ChatAdapter } from '../types';
import { composerAround, extractByRole, pickFirst } from './shared';

export const poeAdapter: ChatAdapter = {
  id: 'poe',
  findInput: (doc) => pickFirst(doc, ['textarea[class*="GrowingTextArea_textArea"]', 'footer textarea', 'textarea']),
  findAnchor: (_doc, input) => composerAround(input, ['[class*="ChatMessageInputContainer"]', 'footer']),
  extractMessages: (doc) =>
    extractByRole(doc, {
      user: '[class*="Message_rightSideMessageBubble"], [class*="Message_humanMessageBubble"]',
      assistant: '[class*="Message_leftSideMessageBubble"], [class*="Message_botMessageBubble"]',
    }),
};
