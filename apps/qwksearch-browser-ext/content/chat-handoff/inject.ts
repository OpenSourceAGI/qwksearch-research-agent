import { ADAPTERS } from './adapters';
import { copyText } from './clipboard';
import type { OpenResponse } from './handoff';
import { otherProviders, providerForHost } from './providers';
import { isDarkPage } from './theme';
import {
  HARD_LIMIT_CHARS,
  SOFT_LIMIT_CHARS,
  buildHandoffPrompt,
  estimateTokens,
  formatTranscript,
  normalizeMessages,
  truncateMessages,
} from './transcript';
import { HOST_ID, HandoffWidget, Toast, type ChatSummary } from './ui';
import type { ChatAdapter, ChatMessage, ChatProvider } from './types';

/** Inserts `host` right after `anchor`, moving it if it already sits somewhere else. Idempotent. */
export function placeAfter(host: HTMLElement, anchor: HTMLElement): void {
  if (anchor.nextElementSibling === host) return;
  anchor.insertAdjacentElement('afterend', host);
}

/**
 * Keeps one "Ask AI" button under the chat box of the current site. The
 * sites are single-page apps that rebuild the composer on navigation, so a
 * MutationObserver re-checks after DOM changes; the check is idempotent and
 * debounced.
 */
export class ChatHandoffController {
  private provider: ChatProvider;
  private adapter: ChatAdapter;
  private widget: HandoffWidget;
  private toast: Toast;
  private observer?: MutationObserver;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private collected: { messages: ChatMessage[] } | null = null;

  constructor(private doc: Document, provider: ChatProvider, toast = new Toast(doc)) {
    this.provider = provider;
    this.adapter = ADAPTERS[provider.id];
    this.toast = toast;
    this.widget = new HandoffWidget(doc, {
      providers: otherProviders(provider.id),
      collect: () => this.collect(),
      pick: (target, truncate) => this.pick(target, truncate),
    });
  }

  static forDocument(doc: Document, toast?: Toast): ChatHandoffController | null {
    const provider = providerForHost(doc.location.hostname);
    return provider ? new ChatHandoffController(doc, provider, toast) : null;
  }

  start() {
    this.ensureInjected();
    this.observer = new MutationObserver(() => this.schedule());
    this.observer.observe(this.doc.documentElement, { childList: true, subtree: true });
    this.doc.defaultView?.addEventListener('popstate', () => this.schedule());
    this.doc.defaultView?.addEventListener('resize', () => this.schedule());
    (this.doc.defaultView as (Window & { navigation?: EventTarget }) | null)?.navigation?.addEventListener(
      'navigatesuccess',
      () => this.schedule()
    );
  }

  stop() {
    this.observer?.disconnect();
    clearTimeout(this.timer);
    this.widget.destroy();
  }

  private schedule() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.ensureInjected(), 150);
  }

  /** Public for tests: place (or re-place) the button under the current chat box. */
  ensureInjected(): boolean {
    const input = this.adapter.findInput(this.doc);
    const anchor = input ? this.adapter.findAnchor?.(this.doc, input) ?? input : null;
    const existing = this.doc.getElementById(HOST_ID);
    if (!anchor) {
      if (existing) this.widget.close(false);
      existing?.remove();
      return false;
    }
    if (existing && existing !== this.widget.host) existing.remove();
    placeAfter(this.widget.host, anchor);
    this.widget.setDark(isDarkPage(this.doc));
    this.widget.alignTo(anchor);
    return true;
  }

  private async collect(): Promise<ChatSummary | null> {
    const messages = normalizeMessages(this.adapter.extractMessages(this.doc));
    if (!messages.length) {
      this.toast.show('No chat messages found on this page yet.', { dark: isDarkPage(this.doc) });
      return null;
    }
    this.collected = { messages };
    const transcript = formatTranscript(messages, { source: this.provider.name });
    const copied = await copyText(transcript, this.doc);
    if (!copied) {
      this.toast.show('Could not copy to the clipboard. Allow clipboard access for this site and try again.', {
        dark: isDarkPage(this.doc),
      });
    }
    const chars = transcript.length;
    return {
      messageCount: messages.length,
      chars,
      tokens: estimateTokens(chars),
      long: chars > SOFT_LIMIT_CHARS,
      tooLong: chars > HARD_LIMIT_CHARS,
      keepChars: SOFT_LIMIT_CHARS,
    };
  }

  private async pick(target: ChatProvider, truncate: boolean) {
    const dark = isDarkPage(this.doc);
    const messages = this.collected?.messages;
    if (!messages?.length) return;
    const kept = truncate ? truncateMessages(messages) : { messages, omitted: 0 };
    const transcript = formatTranscript(kept.messages, { source: this.provider.name, omitted: kept.omitted });
    const text = buildHandoffPrompt(transcript, this.provider.name);
    // The clipboard is the safety net on the destination tab, so refresh it while the click still counts as a user gesture.
    await copyText(text, this.doc);
    const response: OpenResponse | undefined = await chrome.runtime
      .sendMessage({ type: 'chatHandoff:open', providerId: target.id, text })
      .catch(() => undefined);
    if (!response?.ok) {
      this.toast.show(`Could not open ${target.name}. The chat is on your clipboard.`, { dark });
    }
  }
}
