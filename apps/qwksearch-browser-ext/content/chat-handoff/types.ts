export type ChatProviderId =
  | 'chatgpt'
  | 'claude'
  | 'perplexity'
  | 'gemini'
  | 'grok'
  | 'deepseek'
  | 'copilot'
  | 'mistral'
  | 'poe';

export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  text: string;
}

/** Everything the extension needs to know about one chat site that is not DOM-specific. */
export interface ChatProvider {
  id: ChatProviderId;
  name: string;
  /** Hostnames (no port) the site is served from; matches the content-script `matches`. */
  hosts: string[];
  /** Content-script match patterns, kept as narrow as the hosts above. */
  matches: string[];
  /** Where a brand new chat starts. */
  newChatUrl: string;
  /** Query parameter that pre-fills the prompt box on `newChatUrl`, when the site has one. */
  prefillParam?: string;
}

/**
 * Per-site DOM knowledge. Selectors live here and nowhere else so a site
 * redesign means touching exactly one adapter file.
 */
export interface ChatAdapter {
  id: ChatProviderId;
  /** The prompt box the user types into. */
  findInput(doc: Document): HTMLElement | null;
  /**
   * The element the button is inserted after (the whole composer, so the
   * button lands under the box rather than inside it). Defaults to the form
   * or the input itself.
   */
  findAnchor?(doc: Document, input: HTMLElement): HTMLElement | null;
  /** Every turn currently rendered on the page, oldest first. */
  extractMessages(doc: Document): ChatMessage[];
}
