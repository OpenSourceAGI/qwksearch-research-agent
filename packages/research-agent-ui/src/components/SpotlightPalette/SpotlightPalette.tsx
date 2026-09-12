'use client';

/**
 * @fileoverview The Ctrl-Space spotlight palette: one bar, in front of
 * everything, that searches the whole app.
 *
 * Modelled on the CardMirror editor's quick-card search palette in debate-ai
 * (`packages/debate-editor/src/editor/quick-card-search-ui.ts`) — same
 * single-letter prefix system, same two-tier ranking (`spotlightMatch.ts`),
 * same "the keyboard owns it" interaction — re-laid-out as macOS Spotlight:
 * a rounded card near the top of the window with the query bar on top and the
 * results under it, rather than CardMirror's results-above-the-bar bar.
 *
 * Prefixes (`<letter><space>`; with one present, an empty query browses that
 * source):
 *   - `c ` → past chats
 *   - `t ` → app pages
 *   - `s ` → settings sections
 *   - `a ` → actions (new chat, incognito, focus mode, sign in/out…)
 *   - `w ` → ask the research agent
 *   - no prefix → everything, with "ask it" pinned to the top as you type
 *
 * Mounted once by `QwkSearchProviders`, so all four shells get it. It reads
 * the chat / session / view contexts it sits inside and needs no props.
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

import { cn } from '../../lib/utils';
import { researchAgentUIConfig } from '../../config';
import { useChat } from '../../hooks/useChat';
import { useSession } from '../../hooks/useSession';
import { useMainView } from '../../app/MainViewProvider';
import { useRecentChats } from '../ChatHistoryDropdown/useRecentChats';
import {
  buildActionItems,
  buildChatItems,
  buildPageItems,
  buildSearchItem,
  buildSettingItems,
  type SpotlightContext,
  type SpotlightItem,
} from './spotlightItems';
import {
  matchSpotlight,
  parsePrefix,
  prefixForSource,
  SPOTLIGHT_PREFIXES,
  type SpotlightSource,
} from './spotlightMatch';

/** Fired to open the palette from something that isn't the shortcut — the
 *  dock's menu, so a pointer-only user can find it too. */
const OPEN_EVENT = 'qwksearch:open-spotlight';

/** How many past chats the palette loads and searches. */
const CHAT_LIMIT = 100;

/** Chats listed when nothing has been typed yet. */
const BROWSE_CHATS = 6;

/** Cap on rendered rows — the list is keyboard-driven, and past this point
 *  refining the query beats scrolling. */
const MAX_ROWS = 40;

/** Opens the spotlight palette from anywhere in the tree, without threading
 *  state through props. A no-op if the palette is not mounted. */
export function openSpotlight(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(OPEN_EVENT));
}

/** True for the palette chord: Ctrl-Space. (Cmd-Space never reaches the page
 *  on macOS — the OS owns it — so this is Ctrl on every platform.) */
function isSpotlightShortcut(e: KeyboardEvent): boolean {
  return e.ctrlKey && !e.metaKey && !e.altKey && (e.code === 'Space' || e.key === ' ');
}

/** Badge text per source, so a row's kind reads at a glance. */
const SOURCE_LABEL: Record<SpotlightSource, string> = {
  search: 'ask',
  chat: 'chat',
  page: 'page',
  setting: 'setting',
  action: 'action',
};

export function SpotlightPalette() {
  const [open, setOpen] = useState(false);
  const [rawQuery, setRawQuery] = useState('');
  const [selected, setSelected] = useState(0);

  const router = useRouter();
  const chat = useChat();
  const { isAuthenticated, signIn, signOut } = useSession();
  const { docsEnabled, setActiveView, requestFilesSidebar } = useMainView();
  const { recentChats, load } = useRecentChats(CHAT_LIMIT);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const close = useCallback(() => setOpen(false), []);

  // Held in a ref so the open-effect below can depend on `open` alone: `load`
  // is re-created whenever the session settles, and an effect that re-ran on
  // its identity would reset the highlighted row mid-typing.
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  }, [load]);

  const ctx: SpotlightContext = useMemo(
    () => ({
      appName: researchAgentUIConfig.appName,
      navigate: (href) => router.push(href),
      openChat: (chatId) => {
        // The host gets first refusal: shells that render chats inline (the
        // extension, a tabbed desktop window) handle it without navigating.
        if (!researchAgentUIConfig.onOpenChat?.(chatId)) router.push(`/c/${chatId}`);
      },
      openSettings: (section) => {
        if (!researchAgentUIConfig.onOpenSettings?.(section))
          router.push(section ? `/settings/${section}` : '/settings');
      },
      // `sendMessage` no-ops without a chat id, and the id a fresh chat gets
      // is not knowable from here — so the query rides the `?q=` deep link the
      // chat provider already answers, after `newChat` has cleared the board.
      ask: (query) => {
        chat.newChat();
        router.push(`/?q=${encodeURIComponent(query)}`);
      },
      newChat: chat.newChat,
      focusMode: chat.focusMode,
      setFocusMode: chat.setFocusMode,
      incognito: chat.incognito,
      setIncognito: chat.setIncognito,
      isAuthenticated,
      signIn,
      signOut,
      docsEnabled,
      setActiveView,
      requestFilesSidebar,
    }),
    [
      router,
      chat.newChat,
      chat.focusMode,
      chat.setFocusMode,
      chat.incognito,
      chat.setIncognito,
      isAuthenticated,
      signIn,
      signOut,
      docsEnabled,
      setActiveView,
      requestFilesSidebar,
    ],
  );

  const { prefix, query } = parsePrefix(rawQuery);
  const trimmed = query.trim();

  const sources = useMemo(
    () => ({
      chat: buildChatItems(recentChats, ctx),
      page: buildPageItems(ctx),
      setting: buildSettingItems(ctx),
      action: buildActionItems(ctx),
    }),
    [recentChats, ctx],
  );

  const results = useMemo(() => {
    const askRow = buildSearchItem(query, ctx);

    // `w` is the one prefix with no list behind it — the query *is* the row.
    if (prefix === 'w') return askRow ? [askRow] : [];
    if (prefix) {
      const source = SPOTLIGHT_PREFIXES.find((e) => e.prefix === prefix)!.source;
      return matchSpotlight(sources[source as keyof typeof sources], query)
        .map((m) => m.item)
        .slice(0, MAX_ROWS);
    }

    // No prefix, nothing typed: browse — a few recent chats, then everything
    // the palette can do, in a fixed order so the list is muscle-memorable.
    if (!trimmed) {
      return [
        ...sources.chat.slice(0, BROWSE_CHATS),
        ...sources.action,
        ...sources.page,
      ].slice(0, MAX_ROWS);
    }

    // No prefix, something typed: search everything, with "ask it" pinned on
    // top — the query is always a legitimate thing to ask, even when nothing
    // in the app matches it.
    const everything = [...sources.action, ...sources.page, ...sources.setting, ...sources.chat];
    const matched = matchSpotlight(everything, query).map((m) => m.item);
    return [...(askRow ? [askRow] : []), ...matched].slice(0, MAX_ROWS);
  }, [prefix, query, trimmed, sources, ctx]);

  // ── Opening and closing ────────────────────────────────────────────────

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!isSpotlightShortcut(e)) return;
      e.preventDefault();
      setOpen((prev) => !prev);
    };
    const onOpenEvent = () => setOpen(true);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener(OPEN_EVENT, onOpenEvent);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener(OPEN_EVENT, onOpenEvent);
    };
  }, []);

  useEffect(() => {
    if (!open) {
      setRawQuery('');
      setSelected(0);
      return;
    }
    setSelected(0);
    // Fetched on open rather than on mount: an app-wide palette must not cost
    // every page load a chats request.
    void loadRef.current();
    inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close();
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [open, close]);

  // Selection can outrun the list as the query narrows it.
  useEffect(() => {
    setSelected((prev) => (prev < results.length ? prev : Math.max(0, results.length - 1)));
  }, [results.length]);

  useEffect(() => {
    // Optional call, not just optional chain: `scrollIntoView` is missing in
    // jsdom and in some embedded webviews, and a palette that throws while
    // moving the selection is worse than one that doesn't scroll.
    listRef.current
      ?.querySelector<HTMLElement>('[data-selected="true"]')
      ?.scrollIntoView?.({ block: 'nearest' });
  }, [selected, results.length]);

  // ── Keyboard ───────────────────────────────────────────────────────────

  const activate = useCallback(
    (item: SpotlightItem | undefined) => {
      if (!item) return;
      close();
      item.run();
    },
    [close],
  );

  /** Tab cycles the bar through the sources, keeping whatever is typed. */
  const cyclePrefix = useCallback(() => {
    const order = SPOTLIGHT_PREFIXES.map((e) => e.prefix);
    const at = prefix ? order.indexOf(prefix) : -1;
    const next = order[(at + 1) % order.length]!;
    setRawQuery(`${next} ${query}`);
    setSelected(0);
  }, [prefix, query]);

  const onInputKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        close();
        break;
      case 'ArrowDown':
        e.preventDefault();
        setSelected((i) => (results.length ? (i + 1) % results.length : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelected((i) => (results.length ? (i - 1 + results.length) % results.length : 0));
        break;
      case 'Enter':
        e.preventDefault();
        // Keep it off `document`: an activated row can synchronously open a
        // modal that installs its own key listener, which would otherwise
        // catch this very Enter.
        e.stopPropagation();
        activate(results[selected]);
        break;
      case 'Tab':
        e.preventDefault();
        cyclePrefix();
        break;
    }
  };

  if (!open) return null;

  const activeSource = prefix ? SPOTLIGHT_PREFIXES.find((p) => p.prefix === prefix) : null;

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-start justify-center bg-black/40 backdrop-blur-[2px] px-4 pt-[12vh]"
      role="presentation"
    >
      <div
        ref={rootRef}
        role="dialog"
        aria-modal="true"
        aria-label="Search everything"
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-popover shadow-2xl"
      >
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search size={18} className="shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={rawQuery}
            onChange={(e) => {
              setRawQuery(e.target.value);
              setSelected(0);
            }}
            onKeyDown={onInputKeyDown}
            type="text"
            spellCheck={false}
            autoComplete="off"
            aria-label="Search everything"
            aria-autocomplete="list"
            aria-controls="spotlight-results"
            aria-activedescendant={results[selected]?.id}
            placeholder={
              activeSource
                ? `Search ${activeSource.label}…`
                : 'Search chats, pages, settings — or ask anything'
            }
            className="w-full bg-transparent py-4 text-base text-popover-foreground outline-none placeholder:text-muted-foreground"
          />
          {activeSource && (
            <span className="shrink-0 rounded-md bg-secondary px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
              {activeSource.label}
            </span>
          )}
        </div>

        <div
          ref={listRef}
          id="spotlight-results"
          role="listbox"
          aria-label="Results"
          className="max-h-[50vh] overflow-y-auto p-1"
          // The input owns the keyboard: clicking a row must not move focus to
          // the scroller, after which arrows would scroll it natively and
          // Enter would never reach the palette.
          onMouseDown={(e) => e.preventDefault()}
        >
          {results.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              No matches. Press Tab to search another source.
            </p>
          ) : (
            results.map((item, i) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  id={item.id}
                  role="option"
                  aria-selected={i === selected}
                  data-selected={i === selected}
                  onMouseMove={() => setSelected(i)}
                  onClick={() => activate(item)}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors',
                    i === selected ? 'bg-secondary' : 'hover:bg-secondary/60',
                  )}
                >
                  <Icon
                    size={16}
                    className={cn(
                      'shrink-0',
                      i === selected ? 'text-primary' : 'text-muted-foreground',
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-popover-foreground">{item.name}</p>
                    {item.meta && (
                      <p className="truncate text-xs text-muted-foreground">{item.meta}</p>
                    )}
                  </div>
                  {item.hint && (
                    <span className="shrink-0 text-[10px] text-muted-foreground">{item.hint}</span>
                  )}
                  <span className="shrink-0 rounded-md bg-secondary px-1.5 py-0 text-[10px] text-muted-foreground">
                    {SOURCE_LABEL[item.source]}
                  </span>
                </div>
              );
            })
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
          <span>↑↓ move</span>
          <span>↵ open</span>
          <span>⇥ next source</span>
          <span>esc close</span>
          <span className="ml-auto">
            {SPOTLIGHT_PREFIXES.map((p) => `${p.prefix} ${p.label}`).join(' · ')}
          </span>
        </div>
      </div>
    </div>
  );
}

export default SpotlightPalette;
