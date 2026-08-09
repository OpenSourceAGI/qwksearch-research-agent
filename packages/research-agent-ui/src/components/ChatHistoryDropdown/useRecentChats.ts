/**
 * @fileoverview Hook returning the most recently active chats for compact menus.
 *
 * Unlike `useHistoryState`, this fetches lazily — call `load()` when the menu that
 * shows the list actually opens — so the composer doesn't hit the chats API on
 * every page load.
 */
"use client";

import { useCallback, useRef, useState } from "react";
import { listChats } from "qwksearch-api-client";
import { useSession } from "../../hooks/useSession";
import { getGuestChats, type GuestChat } from "../../lib/guest";
import { Chat } from "../../types/research";

/** Timestamp of a guest chat's last message, falling back to its creation time. */
function getLastMessageAt(chat: GuestChat): string {
  const last = chat.messages?.[chat.messages.length - 1];
  const raw = last && "createdAt" in last ? (last as { createdAt?: unknown }).createdAt : undefined;
  if (raw) {
    const time = new Date(raw as string | number | Date).getTime();
    if (!Number.isNaN(time)) return new Date(time).toISOString();
  }
  return chat.createdAt;
}

/** Most recent activity timestamp for a chat, falling back to creation time. */
const activityTime = (chat: Chat) =>
  new Date(chat.lastMessageAt || chat.createdAt).getTime();

function readGuestChats(): Chat[] {
  return getGuestChats().map((chat) => ({
    ...chat,
    messageCount: chat.messages?.filter((m) => m.role === "user").length ?? 0,
    lastMessageAt: getLastMessageAt(chat),
  }));
}

/**
 * Fetches the `limit` most recently active chats on demand.
 *
 * @param limit - Maximum number of chats to return.
 * @returns The chats, a loading flag, and a `load` callback that fetches once
 *   (pass `true` to force a refetch).
 */
export function useRecentChats(limit = 10) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(false);
  const { isAuthenticated, isLoading: sessionLoading } = useSession();
  const loadedRef = useRef(false);

  const load = useCallback(
    async (force = false) => {
      if (sessionLoading) return;
      if (loadedRef.current && !force) return;
      loadedRef.current = true;
      setLoading(true);

      try {
        if (isAuthenticated) {
          const { data, error } = await listChats();
          if (error) {
            // Stale session or a failed request — fall back to whatever is local.
            setChats(readGuestChats());
            return;
          }
          setChats(Array.isArray(data?.chats) ? data.chats : []);
        } else {
          setChats(readGuestChats());
        }
      } catch (err) {
        console.error("Failed to fetch recent chats:", err);
        setChats([]);
      } finally {
        setLoading(false);
      }
    },
    [isAuthenticated, sessionLoading],
  );

  const recentChats = [...chats]
    .sort((a, b) => activityTime(b) - activityTime(a))
    .slice(0, limit);

  return { recentChats, loading, load };
}
