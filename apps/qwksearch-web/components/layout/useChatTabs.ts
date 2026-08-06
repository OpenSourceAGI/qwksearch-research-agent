'use client';

import { useCallback, useEffect, useState } from 'react';
import { useChat } from 'research-agent-ui';

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
   * Closes a chat tab. If the closed tab was the active chat, switches to
   * its nearest remaining neighbor and reports that in `nextActiveId`; if
   * it was active and no chat tabs remain, `closedWasActive` is `true` and
   * `nextActiveId` is `null` — the caller should fall back to a different
   * view in that case. Closing an inactive tab never changes the active chat.
   */
  const closeChat = useCallback((id: string) => {
    const index = chatTabs.findIndex((t) => t.id === id);
    const remaining = chatTabs.filter((t) => t.id !== id);
    setChatTabs(remaining);

    const closedWasActive = id === chatId;
    if (!closedWasActive) return { closedWasActive, nextActiveId: null };
    if (remaining.length === 0) return { closedWasActive, nextActiveId: null };

    const nextActiveId = remaining[Math.max(0, index - 1)]?.id ?? remaining[0].id;
    activateChat(nextActiveId, remaining);
    return { closedWasActive, nextActiveId };
  }, [chatTabs, chatId, activateChat]);

  return {
    chatTabs,
    activeChatId: chatId ?? null,
    openChat,
    newChat,
    closeChat,
  };
}
