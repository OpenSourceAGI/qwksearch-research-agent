/**
 * @fileoverview What each spotlight source puts in the palette, and what
 * activating a row actually does.
 */
import { describe, expect, it, vi } from 'vitest';
import {
  buildActionItems,
  buildChatItems,
  buildPageItems,
  buildSearchItem,
  buildSettingItems,
  type SpotlightContext,
} from '../src/components/SpotlightPalette/spotlightItems';
import type { Chat } from '../src/types/research';

/** A context whose every capability is a spy, overridable per test. */
function makeContext(overrides: Partial<SpotlightContext> = {}): SpotlightContext {
  return {
    appName: 'QwkSearch',
    navigate: vi.fn(),
    openChat: vi.fn(),
    openSettings: vi.fn(),
    ask: vi.fn(),
    newChat: vi.fn(),
    focusMode: 'webSearch',
    setFocusMode: vi.fn(),
    incognito: false,
    setIncognito: vi.fn(),
    isAuthenticated: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
    docsEnabled: true,
    setActiveView: vi.fn(),
    requestFilesSidebar: vi.fn(),
    ...overrides,
  };
}

const chats: Chat[] = [
  {
    id: 'chat-1',
    title: 'Solid-state battery breakthroughs',
    createdAt: new Date(Date.now() - 3_600_000).toISOString(),
    lastMessageAt: new Date(Date.now() - 60_000).toISOString(),
    focusMode: 'academicSearch',
    messageCount: 4,
  },
];

describe('buildPageItems', () => {
  it('navigates to the page it lists', () => {
    const ctx = makeContext();
    const research = buildPageItems(ctx).find((item) => item.name === 'Research')!;

    research.run();

    expect(ctx.navigate).toHaveBeenCalledWith('/');
  });

  it('hides the editor page in a build without the editor', () => {
    const names = buildPageItems(makeContext({ docsEnabled: false })).map((i) => i.name);

    expect(names).not.toContain('REASON Editor');
    expect(buildPageItems(makeContext()).map((i) => i.name)).toContain('REASON Editor');
  });
});

describe('buildChatItems', () => {
  it('opens the chat it lists, with a question count and a relative time', () => {
    const ctx = makeContext();
    const [item] = buildChatItems(chats, ctx);

    expect(item.name).toBe('Solid-state battery breakthroughs');
    expect(item.meta).toBe('4 questions');
    expect(item.hint).toMatch(/minute|second/);

    item.run();

    expect(ctx.openChat).toHaveBeenCalledWith('chat-1');
  });

  it('names an untitled chat rather than rendering a blank row', () => {
    const [item] = buildChatItems([{ ...chats[0], title: '' }], makeContext());

    expect(item.name).toBe('Untitled chat');
  });
});

describe('buildSettingItems', () => {
  it('deep-links to a settings section', () => {
    const ctx = makeContext();
    const models = buildSettingItems(ctx).find((item) => item.name === 'Language Models')!;

    models.run();

    expect(ctx.openSettings).toHaveBeenCalledWith('models');
  });
});

describe('buildActionItems', () => {
  it('offers sign-in when signed out and sign-out when signed in', () => {
    expect(buildActionItems(makeContext()).map((i) => i.name)).toContain('Sign in');
    expect(
      buildActionItems(makeContext({ isAuthenticated: true })).map((i) => i.name),
    ).toContain('Sign out');
  });

  it('labels the incognito toggle by what it will do', () => {
    const ctx = makeContext({ incognito: true });
    const toggle = buildActionItems(ctx).find((i) => i.id === 'action:incognito')!;

    expect(toggle.name).toBe('Turn off incognito');

    toggle.run();

    expect(ctx.setIncognito).toHaveBeenCalledWith(false);
  });

  it('lists one row per focus mode and marks the current one', () => {
    const items = buildActionItems(makeContext({ focusMode: 'academicSearch' }));
    const academic = items.find((i) => i.id === 'action:focus:academicSearch')!;

    expect(academic.name).toBe('Focus: Academic');
    expect(academic.hint).toBe('current');
    expect(items.find((i) => i.id === 'action:focus:webSearch')!.hint).toBeUndefined();
  });

  it('drops the document actions in a build without the editor', () => {
    const names = buildActionItems(makeContext({ docsEnabled: false })).map((i) => i.name);

    expect(names).not.toContain('Switch to documents');
    expect(names).not.toContain('Show files sidebar');
  });

  it('opens the files sidebar on the document view, not the current one', () => {
    const ctx = makeContext();
    buildActionItems(ctx).find((i) => i.id === 'action:files-sidebar')!.run();

    expect(ctx.setActiveView).toHaveBeenCalledWith('docs');
    expect(ctx.requestFilesSidebar).toHaveBeenCalled();
  });
});

describe('buildSearchItem', () => {
  it('asks the trimmed query', () => {
    const ctx = makeContext();
    const item = buildSearchItem('  how do sodium batteries work  ', ctx)!;

    expect(item.name).toBe('how do sodium batteries work');
    expect(item.meta).toContain('QwkSearch');

    item.run();

    expect(ctx.ask).toHaveBeenCalledWith('how do sodium batteries work');
  });

  it('has nothing to ask for a blank query', () => {
    expect(buildSearchItem('   ', makeContext())).toBeNull();
  });
});
