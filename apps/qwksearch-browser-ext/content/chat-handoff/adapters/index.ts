import type { ChatAdapter, ChatProviderId } from '../types';
import { chatgptAdapter } from './chatgpt';
import { claudeAdapter } from './claude';
import { copilotAdapter } from './copilot';
import { deepseekAdapter } from './deepseek';
import { geminiAdapter } from './gemini';
import { grokAdapter } from './grok';
import { mistralAdapter } from './mistral';
import { perplexityAdapter } from './perplexity';
import { poeAdapter } from './poe';

export const ADAPTERS: Record<ChatProviderId, ChatAdapter> = {
  chatgpt: chatgptAdapter,
  claude: claudeAdapter,
  perplexity: perplexityAdapter,
  gemini: geminiAdapter,
  grok: grokAdapter,
  deepseek: deepseekAdapter,
  copilot: copilotAdapter,
  mistral: mistralAdapter,
  poe: poeAdapter,
};
