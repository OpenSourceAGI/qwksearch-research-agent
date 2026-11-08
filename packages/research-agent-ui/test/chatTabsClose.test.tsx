/**
 * @fileoverview Closing chat tabs — singly or as a batch from "Close Tabs
 * Below"/"Close Other Tabs" — must leave them closed.
 *
 * The workspace keeps the active chat represented as a tab: whenever the
 * chat's id or turns change and no tab exists for it, one is added. Closing
 * every chat tab used to leave the closed chat active in `ChatProvider`, so
 * the next change to its turns (a reply still streaming in, or the next
 * message typed into the docs view's input) put the closed tab straight back.
 *
 * `useChat` is replaced with a small stand-in that keeps the same contract as
 * `ChatProvider`: `startNewChat`/`switchToChat` swap the active chat and clear
 * its turns, and the test can append turns to whichever chat is active.
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useState } from 'react';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

type Turn = { role: 'user' | 'assistant'; content: string };

/** Lets the test append a turn to the active chat (e.g. a streamed reply). */
let appendTurn: (turn: Turn) => void = () => {};

vi.mock('../src/hooks/useChat', () => ({
  useChat: () => {
    const [chat, setChat] = useState<{ id: string; turns: Turn[] }>({
      id: 'c',
      turns: [{ role: 'user', content: 'Chat C' }],
    });
    appendTurn = (turn) => setChat((prev) => ({ ...prev, turns: [...prev.turns, turn] }));
    const activate = (id: string) => setChat((prev) => (prev.id === id ? prev : { id, turns: [] }));
    return {
      chatId: chat.id,
      chatTurns: chat.turns,
      startNewChat: (id: string) => setChat({ id, turns: [] }),
      switchToChat: activate,
    };
  },
}));

const { useChatTabs } = await import('../src/app/useChatTabs');

let api: ReturnType<typeof useChatTabs>;
function Harness() {
  api = useChatTabs();
  return null;
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  window.localStorage.setItem(
    'qwksearch-open-chat-tabs',
    JSON.stringify([
      { id: 'a', title: 'Chat A', hasMessages: true },
      { id: 'b', title: 'Chat B', hasMessages: true },
      { id: 'c', title: 'Chat C', hasMessages: true },
    ]),
  );
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  act(() => root.render(<Harness />));
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  window.localStorage.clear();
});

const tabIds = () => api.chatTabs.map((t) => t.id);

describe('closing chat tabs', () => {
  it('closes every chat tab in a batch, including the active one', () => {
    let result!: ReturnType<typeof api.closeChats>;
    act(() => {
      result = api.closeChats(['a', 'b', 'c']);
    });
    expect(result).toEqual({ closedWasActive: true, nextActiveId: null });
    expect(tabIds()).toEqual([]);
  });

  it('keeps the closed active chat closed when its turns change afterwards', () => {
    act(() => {
      api.closeChats(['a', 'b', 'c']);
    });
    // A reply landing, or the next message typed into the docs-view input.
    act(() => appendTurn({ role: 'assistant', content: 'late reply' }));
    expect(tabIds()).not.toContain('c');
  });

  it('does not reopen a chat tab until the fresh chat gets a message', () => {
    act(() => {
      api.closeChats(['a', 'b', 'c']);
    });
    expect(api.activeChatId).not.toBe('c');
    expect(tabIds()).toEqual([]);

    act(() => appendTurn({ role: 'user', content: 'a new question' }));
    expect(tabIds()).toEqual([api.activeChatId]);
    expect(api.chatTabs[0].title).toBe('a new question');
  });

  it('moves to the nearest surviving chat when the active one is closed below', () => {
    let result!: ReturnType<typeof api.closeChats>;
    act(() => {
      result = api.closeChats(['b', 'c']);
    });
    expect(result).toEqual({ closedWasActive: true, nextActiveId: 'a' });
    expect(tabIds()).toEqual(['a']);
    expect(api.activeChatId).toBe('a');
  });

  it('closing inactive chats leaves the active chat alone', () => {
    act(() => {
      api.closeChats(['a', 'b']);
    });
    expect(tabIds()).toEqual(['c']);
    expect(api.activeChatId).toBe('c');
  });
});
