import type { ChatProvider } from './types';

export const HOST_ID = 'qwksearch-chat-handoff';
export const TOAST_HOST_ID = 'qwksearch-chat-handoff-toast';

/* Sizing and colours follow the side panel's "Ask AI" header button (AppHeader.tsx):
   h-8, rounded-md, px-2, text-sm, gray-700 on gray-200 hover, orange-500 sparkles. */
const STYLES = `
:host { all: initial; display: block; }
.wrap { position: relative; display: flex; justify-content: flex-start; padding: 6px 4px 0; box-sizing: border-box;
  font: 14px/1.4 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
.wrap {
  --fg: #374151; --fg-strong: #111827; --muted: #6b7280; --bg: #ffffff; --hover: #e5e7eb;
  --border: rgba(0,0,0,.14); --accent: #f97316; --shadow: 0 8px 24px rgba(0,0,0,.18);
}
:host(.dark) .wrap {
  --fg: #e5e7eb; --fg-strong: #ffffff; --muted: #9ca3af; --bg: #1f2937; --hover: rgba(255,255,255,.12);
  --border: rgba(255,255,255,.2); --shadow: 0 8px 24px rgba(0,0,0,.5);
}
button { font: inherit; color: inherit; background: none; border: 0; cursor: pointer; margin: 0; }
.trigger { display: inline-flex; align-items: center; gap: 4px; height: 32px; padding: 0 8px; border-radius: 6px;
  color: var(--fg); font-weight: 500; border: 1px solid var(--border); }
.trigger:hover, .trigger[aria-expanded="true"] { background: var(--hover); color: var(--fg-strong); }
.trigger:disabled { opacity: .6; cursor: progress; }
button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
svg { width: 15px; height: 15px; flex: none; }
.sparkle { color: var(--accent); }
.menu { position: fixed; z-index: 2147483646; min-width: 240px; max-width: 320px; padding: 4px; border-radius: 8px;
  background: var(--bg); color: var(--fg); border: 1px solid var(--border); box-shadow: var(--shadow); box-sizing: border-box; }
.menu[hidden] { display: none; }
.info { padding: 6px 8px 6px; font-size: 12px; color: var(--muted); }
.warn { padding: 6px 8px; font-size: 12px; color: #b45309; }
:host(.dark) .warn { color: #fbbf24; }
.item { display: flex; align-items: center; justify-content: space-between; gap: 12px; width: 100%; text-align: left;
  padding: 0 8px; height: 32px; border-radius: 6px; color: var(--fg); }
.item:hover, .item:focus-visible { background: var(--hover); color: var(--fg-strong); outline: none; }
.item:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }
.item .hint { font-size: 11px; color: var(--muted); }
.sep { height: 1px; margin: 4px 0; background: var(--border); }
.check { width: 14px; display: inline-block; }
`;

const SPARKLES_SVG =
  '<svg class="sparkle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/></svg>';

const ARROW_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>';

export interface ChatSummary {
  messageCount: number;
  chars: number;
  tokens: number;
  /** Over the soft limit: offer to send only the newest turns. */
  long: boolean;
  /** Over the hard limit: nothing is auto-filled; the clipboard is the only route. */
  tooLong: boolean;
  /** Characters kept when truncating. */
  keepChars: number;
}

export interface WidgetDeps {
  providers: ChatProvider[];
  /** Gathers and copies the chat; null (after telling the user) aborts opening the menu. */
  collect(): Promise<ChatSummary | null>;
  pick(provider: ChatProvider, truncate: boolean): void | Promise<void>;
}

function el<K extends keyof HTMLElementTagNameMap>(doc: Document, tag: K, cls?: string, text?: string) {
  const node = doc.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** The button and its menu, drawn in a shadow root so the site's CSS cannot restyle them. */
export class HandoffWidget {
  readonly host: HTMLElement;
  private root: ShadowRoot;
  private trigger: HTMLButtonElement;
  private menu: HTMLElement;
  private truncate = true;
  private busy = false;
  private outsideHandler = (event: Event) => {
    if (!event.composedPath().includes(this.host)) this.close(false);
  };

  constructor(private doc: Document, private deps: WidgetDeps) {
    this.host = el(doc, 'div');
    this.host.id = HOST_ID;
    this.root = this.host.attachShadow({ mode: 'open' });
    const style = el(doc, 'style');
    style.textContent = STYLES;

    const wrap = el(doc, 'div', 'wrap');
    this.trigger = el(doc, 'button', 'trigger') as HTMLButtonElement;
    this.trigger.type = 'button';
    this.trigger.setAttribute('aria-haspopup', 'menu');
    this.trigger.setAttribute('aria-expanded', 'false');
    this.trigger.title = 'Copy this chat and continue it in another AI';
    this.trigger.innerHTML = `${SPARKLES_SVG}<span>Ask AI</span>`;
    this.trigger.addEventListener('click', () => (this.isOpen ? this.close(true) : void this.open()));
    this.trigger.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' && !this.isOpen) {
        e.preventDefault();
        void this.open();
      }
    });

    this.menu = el(doc, 'div', 'menu');
    this.menu.setAttribute('role', 'menu');
    this.menu.setAttribute('aria-label', 'Continue this chat in');
    this.menu.hidden = true;
    this.menu.addEventListener('keydown', (e) => this.onMenuKey(e));

    wrap.append(this.trigger, this.menu);
    this.root.append(style, wrap);
  }

  get isOpen() {
    return !this.menu.hidden;
  }

  setDark(dark: boolean) {
    this.host.classList.toggle('dark', dark);
  }

  /** Lines the button up with the left edge of the composer it sits under. */
  alignTo(anchor: HTMLElement) {
    const width = anchor.getBoundingClientRect().width;
    if (!width) return;
    const view = this.doc.defaultView;
    const style = view?.getComputedStyle(anchor);
    this.host.style.width = `${width}px`;
    this.host.style.maxWidth = '100%';
    this.host.style.marginLeft = style?.marginLeft && style.marginLeft !== 'auto' ? style.marginLeft : '';
    this.host.style.boxSizing = 'border-box';
  }

  private items(): HTMLButtonElement[] {
    return Array.from(this.menu.querySelectorAll<HTMLButtonElement>('[role^="menuitem"]'));
  }

  async open() {
    if (this.busy) return;
    this.busy = true;
    this.trigger.disabled = true;
    let summary: ChatSummary | null = null;
    try {
      summary = await this.deps.collect();
    } finally {
      this.busy = false;
      this.trigger.disabled = false;
    }
    if (!summary) {
      this.trigger.focus();
      return;
    }
    this.truncate = true;
    this.renderMenu(summary);
    this.menu.hidden = false;
    this.trigger.setAttribute('aria-expanded', 'true');
    this.position();
    this.items()[0]?.focus();
    this.doc.addEventListener('pointerdown', this.outsideHandler, true);
  }

  close(refocus: boolean) {
    if (!this.isOpen) return;
    this.menu.hidden = true;
    this.trigger.setAttribute('aria-expanded', 'false');
    this.doc.removeEventListener('pointerdown', this.outsideHandler, true);
    if (refocus) this.trigger.focus();
  }

  destroy() {
    this.close(false);
    this.host.remove();
  }

  private renderMenu(summary: ChatSummary) {
    const doc = this.doc;
    this.menu.replaceChildren();
    const turns = `${summary.messageCount} message${summary.messageCount === 1 ? '' : 's'}`;
    this.menu.append(el(doc, 'div', 'info', `Copied ${turns} to your clipboard. Continue in:`));

    if (summary.tooLong) {
      this.menu.append(
        el(doc, 'div', 'warn', `This chat is very long (~${summary.tokens.toLocaleString()} tokens). It will not be auto-filled; paste it from the clipboard.`)
      );
    } else if (summary.long) {
      this.menu.append(
        el(doc, 'div', 'warn', `Long chat (~${summary.tokens.toLocaleString()} tokens). Many sites cut off long pastes.`)
      );
    }

    for (const provider of this.deps.providers) {
      const item = el(doc, 'button', 'item') as HTMLButtonElement;
      item.type = 'button';
      item.tabIndex = -1;
      item.setAttribute('role', 'menuitem');
      const label = el(doc, 'span', undefined, provider.name);
      const icon = el(doc, 'span');
      icon.innerHTML = ARROW_SVG;
      item.append(label, icon);
      item.addEventListener('click', () => {
        this.close(false);
        void this.deps.pick(provider, summary.long && !summary.tooLong && this.truncate);
      });
      this.menu.append(item);
    }

    if (summary.long && !summary.tooLong) {
      this.menu.append(el(doc, 'div', 'sep'));
      const toggle = el(doc, 'button', 'item') as HTMLButtonElement;
      toggle.type = 'button';
      toggle.tabIndex = -1;
      toggle.setAttribute('role', 'menuitemcheckbox');
      const paint = () => {
        toggle.setAttribute('aria-checked', String(this.truncate));
        toggle.replaceChildren(
          el(doc, 'span', undefined, `${this.truncate ? '\u2713 ' : '\u2003'}Send only the newest part`),
          el(doc, 'span', 'hint', `~${Math.round(summary.keepChars / 1000)}k chars`)
        );
      };
      paint();
      toggle.addEventListener('click', () => {
        this.truncate = !this.truncate;
        paint();
      });
      this.menu.append(toggle);
    }
  }

  private position() {
    const rect = this.trigger.getBoundingClientRect();
    const height = this.menu.offsetHeight || 0;
    const view = this.doc.defaultView;
    const vh = view?.innerHeight ?? 0;
    const above = rect.top - height - 6;
    const top = above >= 8 || !vh ? Math.max(8, above) : Math.min(rect.bottom + 6, vh - height - 8);
    this.menu.style.top = `${top}px`;
    this.menu.style.left = `${Math.max(8, rect.left)}px`;
  }

  private onMenuKey(e: KeyboardEvent) {
    const items = this.items();
    const index = items.indexOf(this.root.activeElement as HTMLButtonElement);
    const focus = (i: number) => items[(i + items.length) % items.length]?.focus();
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        focus(index + 1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        focus(index - 1);
        break;
      case 'Home':
        e.preventDefault();
        focus(0);
        break;
      case 'End':
        e.preventDefault();
        focus(items.length - 1);
        break;
      case 'Escape':
        e.preventDefault();
        e.stopPropagation();
        this.close(true);
        break;
      case 'Tab':
        this.close(false);
        break;
    }
  }
}

/** A short message in the corner of the page, announced to screen readers. */
export class Toast {
  private host: HTMLElement | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor(private doc: Document = document) {}

  show(message: string, opts: { dark?: boolean; ms?: number } = {}) {
    const doc = this.doc;
    this.host?.remove();
    clearTimeout(this.timer);
    const host = el(doc, 'div');
    host.id = TOAST_HOST_ID;
    const root = host.attachShadow({ mode: 'open' });
    const style = el(doc, 'style');
    style.textContent = `
      :host { all: initial; }
      .toast { position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); z-index: 2147483647;
        max-width: min(520px, calc(100vw - 32px)); padding: 10px 14px; border-radius: 8px; box-sizing: border-box;
        font: 14px/1.4 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
        background: #111827; color: #f9fafb; border: 1px solid rgba(255,255,255,.18); box-shadow: 0 8px 24px rgba(0,0,0,.3); }
      .toast.dark { background: #f9fafb; color: #111827; border-color: rgba(0,0,0,.14); }
    `;
    const toast = el(doc, 'div', opts.dark ? 'toast dark' : 'toast', message);
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    root.append(style, toast);
    doc.body.append(host);
    this.host = host;
    this.timer = setTimeout(() => this.hide(), opts.ms ?? 7000);
  }

  hide() {
    clearTimeout(this.timer);
    this.host?.remove();
    this.host = null;
  }
}
