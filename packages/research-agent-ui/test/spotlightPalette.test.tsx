/**
 * @fileoverview The palette as the user meets it: the Ctrl-Space chord, the
 * prefix scoping, keyboard selection, and what Enter does to the app.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';

const push = vi.fn();
const newChat = vi.fn();
const setFocusMode = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/',
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('../src/hooks/useSession', () => ({
  useSession: () => ({
    isAuthenticated: false,
    isLoading: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
  }),
}));

vi.mock('../src/hooks/useChat', () => ({
  useChat: () => ({
    newChat,
    focusMode: 'webSearch',
    setFocusMode,
    incognito: false,
    setIncognito: vi.fn(),
  }),
}));

vi.mock('../src/components/ChatHistoryDropdown/useRecentChats', () => ({
  useRecentChats: () => ({
    recentChats: [
      {
        id: 'chat-1',
        title: 'Solid-state battery breakthroughs',
        createdAt: new Date().toISOString(),
        lastMessageAt: new Date().toISOString(),
        messageCount: 4,
      },
    ],
    loading: false,
    load: vi.fn(),
  }),
}));

const { MainViewProvider } = await import('../src/app/MainViewProvider');
const { SpotlightPalette, openSpotlight } = await import(
  '../src/components/SpotlightPalette/SpotlightPalette'
);

function mount() {
  return render(
    <MainViewProvider docsEnabled={false}>
      <SpotlightPalette />
    </MainViewProvider>,
  );
}

/** The Ctrl-Space chord, as the window sees it. */
function pressShortcut() {
  act(() => {
    fireEvent.keyDown(window, { key: ' ', code: 'Space', ctrlKey: true });
  });
}

const palette = () => screen.queryByRole('dialog', { name: 'Search everything' });
const input = () => screen.getByRole('textbox', { name: 'Search everything' }) as HTMLInputElement;
const options = () => screen.queryAllByRole('option');
const type = (value: string) => fireEvent.change(input(), { target: { value } });

beforeEach(() => {
  push.mockClear();
  newChat.mockClear();
  setFocusMode.mockClear();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('SpotlightPalette', () => {
  it('renders nothing until the shortcut is pressed, and toggles back off', () => {
    mount();
    expect(palette()).toBeNull();

    pressShortcut();
    expect(palette()).not.toBeNull();

    pressShortcut();
    expect(palette()).toBeNull();
  });

  it('opens from the exported helper, for chrome that has no keyboard', () => {
    mount();

    act(() => openSpotlight());

    expect(palette()).not.toBeNull();
  });

  it('browses recent chats and actions before anything is typed', () => {
    mount();
    pressShortcut();

    const names = options().map((o) => within(o).getAllByText(/.+/)[0].textContent);
    expect(names).toContain('Solid-state battery breakthroughs');
    expect(names).toContain('New chat');
  });

  it('pins "ask it" to the top of an unscoped query and sends it on Enter', () => {
    mount();
    pressShortcut();
    type('sodium battery cost');

    expect(options()[0].getAttribute('id')).toBe('search:ask');

    fireEvent.keyDown(input(), { key: 'Enter' });

    expect(newChat).toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith('/?q=sodium%20battery%20cost');
    expect(palette()).toBeNull();
  });

  it('scopes to one source with a prefix', () => {
    mount();
    pressShortcut();
    type('t library');

    const ids = options().map((o) => o.getAttribute('id'));
    expect(ids).toEqual(['page:/library']);
  });

  it('moves the selection with the arrow keys and wraps at the ends', () => {
    mount();
    pressShortcut();
    type('a focus');

    expect(options()[0].getAttribute('aria-selected')).toBe('true');

    fireEvent.keyDown(input(), { key: 'ArrowDown' });
    expect(options()[1].getAttribute('aria-selected')).toBe('true');

    fireEvent.keyDown(input(), { key: 'ArrowUp' });
    fireEvent.keyDown(input(), { key: 'ArrowUp' });
    expect(options()[options().length - 1].getAttribute('aria-selected')).toBe('true');
  });

  it('runs the selected action on Enter', () => {
    mount();
    pressShortcut();
    type('a focus academic');

    fireEvent.keyDown(input(), { key: 'Enter' });

    expect(setFocusMode).toHaveBeenCalledWith('academicSearch');
  });

  it('cycles the scope with Tab, keeping what is typed', () => {
    mount();
    pressShortcut();
    type('battery');

    fireEvent.keyDown(input(), { key: 'Tab' });
    expect(input().value).toBe('c battery');

    fireEvent.keyDown(input(), { key: 'Tab' });
    expect(input().value).toBe('t battery');
  });

  it('closes on Escape and forgets the query', () => {
    mount();
    pressShortcut();
    type('battery');
    fireEvent.keyDown(input(), { key: 'Escape' });

    expect(palette()).toBeNull();

    pressShortcut();
    expect(input().value).toBe('');
  });

  it('says so when nothing matches, instead of an empty box', () => {
    mount();
    pressShortcut();
    type('c zzzzz');

    expect(options()).toHaveLength(0);
    expect(screen.getByText(/No matches/)).toBeTruthy();
  });
});
