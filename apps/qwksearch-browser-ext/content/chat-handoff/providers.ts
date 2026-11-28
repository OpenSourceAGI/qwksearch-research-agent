import type { ChatProvider, ChatProviderId } from './types';

/**
 * The chat sites the "continue in another AI" button works on and hands
 * conversations to. `prefillParam` is only set where the site documents or is
 * widely known to honour a `?q=` style prompt parameter; everywhere else the
 * transcript is pasted by the content script on the destination tab.
 *
 * The Perplexity URL matches the "Perplexity" entry in `search-engines.ts`.
 */
export const CHAT_PROVIDERS: ChatProvider[] = [
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    hosts: ['chatgpt.com', 'chat.openai.com'],
    matches: ['https://chatgpt.com/*', 'https://chat.openai.com/*'],
    newChatUrl: 'https://chatgpt.com/',
    prefillParam: 'q',
  },
  {
    id: 'claude',
    name: 'Claude',
    hosts: ['claude.ai'],
    matches: ['https://claude.ai/*'],
    newChatUrl: 'https://claude.ai/new',
    prefillParam: 'q',
  },
  {
    id: 'perplexity',
    name: 'Perplexity',
    hosts: ['www.perplexity.ai'],
    matches: ['https://www.perplexity.ai/*'],
    newChatUrl: 'https://www.perplexity.ai/',
    prefillParam: 'q',
  },
  {
    id: 'gemini',
    name: 'Gemini',
    hosts: ['gemini.google.com'],
    matches: ['https://gemini.google.com/*'],
    newChatUrl: 'https://gemini.google.com/app',
  },
  {
    id: 'grok',
    name: 'Grok',
    hosts: ['grok.com'],
    matches: ['https://grok.com/*'],
    newChatUrl: 'https://grok.com/',
    prefillParam: 'q',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    hosts: ['chat.deepseek.com'],
    matches: ['https://chat.deepseek.com/*'],
    newChatUrl: 'https://chat.deepseek.com/',
  },
  {
    id: 'copilot',
    name: 'Copilot',
    hosts: ['copilot.microsoft.com'],
    matches: ['https://copilot.microsoft.com/*'],
    newChatUrl: 'https://copilot.microsoft.com/',
    prefillParam: 'q',
  },
  {
    id: 'mistral',
    name: 'Le Chat',
    hosts: ['chat.mistral.ai'],
    matches: ['https://chat.mistral.ai/*'],
    newChatUrl: 'https://chat.mistral.ai/chat',
    prefillParam: 'q',
  },
  {
    id: 'poe',
    name: 'Poe',
    hosts: ['poe.com'],
    matches: ['https://poe.com/*'],
    newChatUrl: 'https://poe.com/',
  },
];

export const CHAT_MATCHES = CHAT_PROVIDERS.flatMap((p) => p.matches);

export function getProvider(id: string): ChatProvider | undefined {
  return CHAT_PROVIDERS.find((p) => p.id === id);
}

export function providerForHost(hostname: string): ChatProvider | undefined {
  return CHAT_PROVIDERS.find((p) => p.hosts.includes(hostname));
}

/** Every provider except the one the user is on, in registry order. */
export function otherProviders(current: ChatProviderId | undefined): ChatProvider[] {
  return CHAT_PROVIDERS.filter((p) => p.id !== current);
}

/** Longest encoded prompt put in a URL; browsers and CDNs start refusing around 8 KB. */
export const MAX_PREFILL_URL_LENGTH = 6000;

/**
 * The URL that opens `provider` with `text` already in the prompt, or null
 * when the site has no prefill parameter or the text would not fit a URL.
 */
export function buildPrefillUrl(provider: ChatProvider, text: string): string | null {
  if (!provider.prefillParam) return null;
  const url = new URL(provider.newChatUrl);
  url.searchParams.set(provider.prefillParam, text);
  return url.toString().length <= MAX_PREFILL_URL_LENGTH ? url.toString() : null;
}
