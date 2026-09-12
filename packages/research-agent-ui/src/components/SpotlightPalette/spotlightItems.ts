/**
 * @fileoverview Builds the palette's rows, one function per source.
 *
 * Everything here is pure: a builder takes data plus a {@link SpotlightContext}
 * of callbacks and returns rows. The component owns the hooks and the
 * rendering; keeping the sources out of it is what makes the ranking and the
 * per-source contents testable without mounting the app.
 */
import {
  BookOpen,
  EyeOff,
  FileText,
  Globe,
  LayoutGrid,
  LogIn,
  LogOut,
  MessageSquare,
  Plus,
  Search,
  Settings as SettingsIcon,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import type { ComponentType } from 'react';

import type { Chat } from '../../types/research';
import { formatTimeDifference } from '../../lib/utils';
// The section list is read from its JSON source rather than from
// `../../settings`, whose index also splices in prompt templates from
// `chat-agent-toolkit` — a runtime import the chat bundle has no other reason
// to carry. The type still comes from there, and `import type` is erased.
import sectionsJson from '../../settings/sections.json';
import type { SettingsSectionSchema } from '../../settings';
import { focusModes } from '../SearchConfig/focusModes';
import { SPOTLIGHT_LINKS } from './spotlightLinks';
import type { SpotlightMatchable, SpotlightSource } from './spotlightMatch';

/** Lucide-style icon component — every row renders one at 16px. */
export type SpotlightIcon = ComponentType<{ size?: number; className?: string }>;

/** One row of the palette. */
export interface SpotlightItem extends SpotlightMatchable {
  /** Stable within a render, and used as the option's DOM id. */
  id: string;
  source: SpotlightSource;
  icon: SpotlightIcon;
  /** Right-aligned trailing text — a relative timestamp, a state, a count. */
  hint?: string;
  /** What Enter (or a click) does. */
  run: () => void;
}

/**
 * The app capabilities the palette drives. Supplied by the component from the
 * chat / session / view contexts, so nothing in this module reaches for a
 * hook, a router or an endpoint — which is also what keeps the palette
 * mountable in the extension and the VS Code webview.
 */
export interface SpotlightContext {
  /** Product name, used in the "Ask …" row. */
  appName: string;
  /** Navigate to an in-app route. */
  navigate: (href: string) => void;
  /** Open an existing chat (host callback first, route fallback). */
  openChat: (chatId: string) => void;
  /** Open settings, optionally deep-linked to a section key. */
  openSettings: (section?: string) => void;
  /** Start a fresh chat and ask it something straight away. */
  ask: (query: string) => void;
  /** Start a fresh, empty chat. */
  newChat: () => void;
  /** Current research focus mode key, and the setter for it. */
  focusMode: string;
  setFocusMode: (key: string) => void;
  incognito: boolean;
  setIncognito: (value: boolean) => void;
  isAuthenticated: boolean;
  signIn: () => void;
  signOut: () => void;
  /** Whether this build bundles the REASON editor and its file sidebar. */
  docsEnabled: boolean;
  /** Switch the main view between research and documents. */
  setActiveView: (view: 'research' | 'docs') => void;
  /** Reveal the REASON files sidebar (docs builds only). */
  requestFilesSidebar: () => void;
}

/** Pages (`t `), in the curated order of {@link SPOTLIGHT_LINKS}. */
export function buildPageItems(ctx: SpotlightContext): SpotlightItem[] {
  const iconFor = (href: string): SpotlightIcon => {
    if (href === '/') return Search;
    if (href === '/workspace') return FileText;
    if (href === '/settings') return SettingsIcon;
    if (href === '/docs') return BookOpen;
    return LayoutGrid;
  };
  return SPOTLIGHT_LINKS.filter((link) => !link.docsOnly || ctx.docsEnabled).map((link) => ({
    id: `page:${link.href}`,
    source: 'page' as const,
    name: link.label,
    meta: link.description,
    keywords: `${link.keywords ?? ''} ${link.href}`,
    icon: iconFor(link.href),
    run: () => ctx.navigate(link.href),
  }));
}

/** Past conversations (`c `), newest first — the caller passes them sorted. */
export function buildChatItems(chats: readonly Chat[], ctx: SpotlightContext): SpotlightItem[] {
  const now = new Date();
  return chats.map((chat) => ({
    id: `chat:${chat.id}`,
    source: 'chat' as const,
    name: chat.title || 'Untitled chat',
    meta: `${chat.messageCount ?? 0} question${(chat.messageCount ?? 0) === 1 ? '' : 's'}`,
    keywords: chat.focusMode ?? '',
    icon: MessageSquare,
    hint: formatTimeDifference(now, chat.lastMessageAt || chat.createdAt),
    run: () => ctx.openChat(chat.id),
  }));
}

/** Settings sections (`s `), deep-linked by section key. */
export function buildSettingItems(ctx: SpotlightContext): SpotlightItem[] {
  const sections = sectionsJson as unknown as SettingsSectionSchema[];
  return sections.map((section) => ({
    id: `setting:${section.key}`,
    source: 'setting' as const,
    name: section.name,
    meta: section.description,
    keywords: `settings ${section.key}`,
    icon: SlidersHorizontal,
    run: () => ctx.openSettings(section.key),
  }));
}

/** Commands (`a `) — the things the palette does rather than navigates to. */
export function buildActionItems(ctx: SpotlightContext): SpotlightItem[] {
  const items: SpotlightItem[] = [
    {
      id: 'action:new-chat',
      source: 'action',
      name: 'New chat',
      meta: 'Start a fresh conversation',
      keywords: 'clear reset blank',
      icon: Plus,
      run: ctx.newChat,
    },
    {
      id: 'action:settings',
      source: 'action',
      name: 'Open settings',
      meta: 'Models, connectors, search sources and preferences',
      keywords: 'preferences configure',
      icon: SettingsIcon,
      run: () => ctx.openSettings(),
    },
    {
      id: 'action:incognito',
      source: 'action',
      name: ctx.incognito ? 'Turn off incognito' : 'Turn on incognito',
      meta: 'Stop saving this conversation to history',
      keywords: 'private incognito history off',
      icon: EyeOff,
      hint: ctx.incognito ? 'on' : 'off',
      run: () => ctx.setIncognito(!ctx.incognito),
    },
  ];

  // One row per focus mode, so "academic" jumps straight to the right search
  // scope without going through the composer's popover.
  for (const mode of focusModes) {
    items.push({
      id: `action:focus:${mode.key}`,
      source: 'action',
      name: `Focus: ${mode.title}`,
      meta: mode.description,
      keywords: `focus mode ${mode.key}`,
      icon: Globe,
      hint: ctx.focusMode === mode.key ? 'current' : undefined,
      run: () => ctx.setFocusMode(mode.key),
    });
  }

  if (ctx.docsEnabled) {
    items.push(
      {
        id: 'action:view-docs',
        source: 'action',
        name: 'Switch to documents',
        meta: 'Open the REASON editor view',
        keywords: 'reason editor write docs',
        icon: FileText,
        run: () => ctx.setActiveView('docs'),
      },
      {
        id: 'action:view-research',
        source: 'action',
        name: 'Switch to research',
        meta: 'Back to the search and chat view',
        keywords: 'chat search',
        icon: Search,
        run: () => ctx.setActiveView('research'),
      },
      {
        id: 'action:files-sidebar',
        source: 'action',
        name: 'Show files sidebar',
        meta: 'Browse REASON documents',
        keywords: 'files documents sidebar',
        icon: FileText,
        run: () => {
          ctx.setActiveView('docs');
          ctx.requestFilesSidebar();
        },
      },
    );
  }

  items.push(
    ctx.isAuthenticated
      ? {
          id: 'action:sign-out',
          source: 'action',
          name: 'Sign out',
          meta: 'End this session',
          keywords: 'logout log out',
          icon: LogOut,
          run: ctx.signOut,
        }
      : {
          id: 'action:sign-in',
          source: 'action',
          name: 'Sign in',
          meta: 'Sync chats and settings across devices',
          keywords: 'login log in account',
          icon: LogIn,
          run: ctx.signIn,
        },
  );

  return items;
}

/**
 * The "ask it" row (`w `) — the one row that is the query rather than a match
 * for it, so it is built fresh per keystroke and pinned to the top.
 * Returns null for an empty query, which has nothing to ask.
 */
export function buildSearchItem(query: string, ctx: SpotlightContext): SpotlightItem | null {
  const trimmed = query.trim();
  if (!trimmed) return null;
  return {
    id: 'search:ask',
    source: 'search',
    name: trimmed,
    meta: `Ask ${ctx.appName} — searches the web and answers with sources`,
    icon: Sparkles,
    hint: 'Enter',
    run: () => ctx.ask(trimmed),
  };
}
