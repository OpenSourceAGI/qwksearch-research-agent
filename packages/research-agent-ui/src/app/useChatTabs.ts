'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useChat } from '../hooks/useChat';

export interface ChatTab {
  id: string;
  title: string;
  /** Whether this chat has ever had a message sent. Empty/untouched "New
   * Chat" tabs must be re-armed via `startNewChat` rather than
   * `switchToChat` — the latter fetches the chat and would incorrectly
   * report it "not found" since nothing was ever persisted for it. */
  hasMessages?: boolean;
}

const STORAGE_KEY = 'qwksearch-open-chat-tabs';
const MAX_TITLE_LENGTH = 50;

function readStoredTabs(): ChatTab[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Tracks which chat conversations are "open" (shown as tabs in the
 * workspace's Open Tabs sidebar panel) alongside REASON's document tabs.
 * The active chat itself is owned by `ChatProvider`/`useChat()` — this hook
 * only tracks the open-tab list and titles, and exposes helpers for
 * switching, closing, and creating chat tabs without navigating away from
 * the workspace route.
 */
export function useChatTabs() {
  const { chatId, chatTurns, startNewChat, switchToChat } = useChat();
  const [chatTabs, setChatTabs] = useState<ChatTab[]>(readStoredTabs);
  // After the last chat tab is closed, `ChatProvider` still needs *some*
  // active chat, so a fresh one is started in the background. Its id lives
  // here so the effect below doesn't immediately show it as a "New Chat" tab —
  // it only becomes a tab once it gets a message.
  const detachedChatIdRef = useRef<string | null>(null);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(chatTabs));
  }, [chatTabs]);

  // Keep the active chat represented as a tab, and keep its title/hasMessages
  // in sync as the conversation gains its first message.
  useEffect(() => {
    if (!chatId) return;
    const liveTitle = chatTurns[0]?.content?.slice(0, MAX_TITLE_LENGTH);
    const hasMessages = chatTurns.length > 0;
    setChatTabs((prev) => {
      const existing = prev.find((t) => t.id === chatId);
      if (!existing && chatId === detachedChatIdRef.current && !hasMessages) {
        return prev;
      }
      if (!existing) {
        return [...prev, { id: chatId, title: liveTitle || 'New Chat', hasMessages }];
      }
      if ((liveTitle && existing.title !== liveTitle) || existing.hasMessages !== hasMessages) {
        return prev.map((t) => (
          t.id === chatId ? { ...t, title: liveTitle || t.title, hasMessages } : t
        ));
      }
      return prev;
    });
  }, [chatId, chatTurns]);

  // Untouched "New Chat" tabs must be re-armed via `startNewChat` rather
  // than fetched via `switchToChat`, which would otherwise report a
  // real-but-empty chat as "not found".
  const activateChat = useCallback((id: string, tabs: ChatTab[]) => {
    const tab = tabs.find((t) => t.id === id);
    if (tab && !tab.hasMessages) {
      startNewChat(id);
    } else {
      switchToChat(id);
    }
  }, [startNewChat, switchToChat]);

  const openChat = useCallback((id: string) => {
    activateChat(id, chatTabs);
  }, [activateChat, chatTabs]);

  const newChat = useCallback(() => {
    const id = crypto.randomUUID();
    setChatTabs((prev) => [...prev, { id, title: 'New Chat' }]);
    startNewChat(id);
    return id;
  }, [startNewChat]);

  /**
   * Closes a batch of chat tabs in a single state update. If the active chat
   * is among them, switches to its nearest remaining neighbor and reports
   * that in `nextActiveId`; if it was active and no chat tabs remain,
   * `closedWasActive` is `true` and `nextActiveId` is `null` — the caller
   * should fall back to a different view in that case. Closing only inactive
   * tabs never changes the active chat.
   *
   * Closing several tabs must go through one call: `chatTabs` is read from
   * the current render, so repeated single closes would each start from the
   * same pre-close list and only the last would survive.
   */
  const closeChats = useCallback((ids: string[]) => {
    const closing = new Set(ids);
    const remaining = chatTabs.filter((t) => !closing.has(t.id));
    setChatTabs(remaining);

    const closedWasActive = chatId != null && closing.has(chatId);
    if (!closedWasActive) return { closedWasActive: false, nextActiveId: null };
    if (remaining.length === 0) {
      // Leaving the closed chat active would let its next turn (a reply still
      // streaming in, or the next message typed into the docs view) re-add
      // its tab. Swap in a fresh, tab-less chat instead; starting it also
      // stops any stream the closed chat had running.
      const freshId = crypto.randomUUID();
      detachedChatIdRef.current = freshId;
      startNewChat(freshId);
      return { closedWasActive, nextActiveId: null };
    }

    // Nearest survivor to the closed active tab: scan left, then right.
    const activeIndex = chatTabs.findIndex((t) => t.id === chatId);
    const survives = (tab: ChatTab | undefined) => tab != null && !closing.has(tab.id);
    let nextTab: ChatTab | undefined;
    for (let i = activeIndex - 1; i >= 0 && !nextTab; i--) {
      if (survives(chatTabs[i])) nextTab = chatTabs[i];
    }
    for (let i = activeIndex + 1; i < chatTabs.length && !nextTab; i++) {
      if (survives(chatTabs[i])) nextTab = chatTabs[i];
    }
    const nextActiveId = (nextTab ?? remaining[0]).id;
    activateChat(nextActiveId, remaining);
    return { closedWasActive, nextActiveId };
  }, [chatTabs, chatId, activateChat, startNewChat]);

  const closeChat = useCallback((id: string) => closeChats([id]), [closeChats]);

  return {
    chatTabs,
    activeChatId: chatId ?? null,
    openChat,
    newChat,
    closeChat,
    closeChats,
  };
}
