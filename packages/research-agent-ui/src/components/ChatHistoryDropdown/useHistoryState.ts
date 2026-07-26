/**
 * Hook managing all state and logic for the chat history dropdown,
 * including fetching chats, pinning, deleting, clearing, and private mode.
 */
"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useSession } from "../../hooks/useSession";
import { useChat } from "../../hooks/useChat";
import {
  getGuestChats,
  deleteGuestChat,
  clearAllGuestChats,
  type GuestChat,
} from "../../lib/guest";
import { Chat } from "../../types/research";
import { toast } from "sonner";
import { listChats, deleteChatById, deleteAllChats, searchChats } from "qwksearch-api-client";

const PINNED_CHATS_KEY = "qwksearch_pinned_chats";

/**
 * Derives the timestamp of a guest chat's most recent message so history can
 * show how long ago the conversation was last active. Falls back to the
 * chat's creation time when no messages carry a usable timestamp.
 */
function getLastMessageAt(chat: GuestChat): string {
  const last = chat.messages?.[chat.messages.length - 1];
  const raw = last && "createdAt" in last ? (last as { createdAt?: unknown }).createdAt : undefined;
  if (raw) {
    const time = new Date(raw as string | number | Date).getTime();
    if (!Number.isNaN(time)) return new Date(time).toISOString();
  }
  return chat.createdAt;
}

function getPinnedChatIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PINNED_CHATS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function savePinnedChatIds(ids: string[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PINNED_CHATS_KEY, JSON.stringify(ids));
}

export function useHistoryState() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [chatToDelete, setChatToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [clearAllDialogOpen, setClearAllDialogOpen] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Chat[]>([]);
  const [searching, setSearching] = useState(false);
  const { isAuthenticated, isLoading: sessionLoading } = useSession();
  const { incognito, setIncognito } = useChat();

  useEffect(() => {
    setPinnedIds(getPinnedChatIds());
  }, []);

  const togglePin = useCallback((e: React.MouseEvent, chatId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setPinnedIds((prev) => {
      const next = prev.includes(chatId)
        ? prev.filter((id) => id !== chatId)
        : [...prev, chatId];
      savePinnedChatIds(next);
      return next;
    });
  }, []);

  const sortedChats = useMemo(
    () =>
      [...chats].sort((a, b) => {
        const aPinned = pinnedIds.includes(a.id);
        const bPinned = pinnedIds.includes(b.id);
        if (aPinned && !bPinned) return -1;
        if (!aPinned && bPinned) return 1;
        return 0;
      }),
    [chats, pinnedIds],
  );

  const displayChats = useMemo(() => {
    if (searchQuery.trim()) {
      return searchResults;
    }
    return sortedChats;
  }, [searchQuery, searchResults, sortedChats]);

  const fetchChats = useCallback(async () => {
    if (sessionLoading) return;
    setLoading(true);

    try {
      if (isAuthenticated) {
        const { data, error } = await listChats();

        if (error && (error as any).status === 401) {
          // Stale session — fall back to guest chats silently
          const guestChats = getGuestChats().map((chat) => ({
            ...chat,
            messageCount:
              chat.messages?.filter((m) => m.role === "user").length ?? 0,
            lastMessageAt: getLastMessageAt(chat),
          }));
          setChats(guestChats);
          return;
        }

        if (error) {
          throw new Error(`Failed to fetch chats: ${(error as any).message}`);
        }

        setChats(Array.isArray(data?.chats) ? data.chats : []);
      } else {
        const guestChats = getGuestChats().map((chat) => ({
          ...chat,
          messageCount:
            chat.messages?.filter((m) => m.role === "user").length ?? 0,
        }));
        setChats(guestChats);
      }
    } catch (err) {
      console.error("Failed to fetch chat history:", err);
      setChats([]);
      toast.error("Failed to load chat history");
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, sessionLoading]);

  useEffect(() => {
    void fetchChats();
  }, [fetchChats]);

  const handleDeleteClick = (e: React.MouseEvent, chatId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setChatToDelete(chatId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!chatToDelete) return;
    setDeleting(true);
    try {
      if (isAuthenticated) {
        const { error } = await deleteChatById({ path: { id: chatToDelete } });

        if (error) {
          throw new Error(`Failed to delete chat: ${(error as any).message}`);
        }
      } else {
        deleteGuestChat(chatToDelete);
      }
      setChats((prev) => prev.filter((chat) => chat.id !== chatToDelete));
      toast.success("Chat deleted");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete chat");
    } finally {
      setDeleteDialogOpen(false);
      setChatToDelete(null);
      setDeleting(false);
    }
  };

  const handleClearAllClick = () => {
    setClearAllDialogOpen(true);
  };

  const handleConfirmClearAll = async () => {
    setClearingAll(true);
    try {
      if (isAuthenticated) {
        const { error } = await deleteAllChats();

        if (error) {
          throw new Error(`Failed to clear history: ${(error as any).message}`);
        }
      } else {
        clearAllGuestChats();
      }
      setChats([]);
      toast.success("All history cleared");
    } catch (err: any) {
      toast.error(err.message || "Failed to clear history");
    } finally {
      setClearAllDialogOpen(false);
      setClearingAll(false);
    }
  };

  const toggleIncognito = () => {
    setIncognito(!incognito);
    toast.success(
      incognito
        ? "Private mode off"
        : "Private mode on — messages won't be saved",
    );
  };

  // Search functionality
  const performSearch = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setSearchResults([]);
        setSearching(false);
        return;
      }

      setSearching(true);
      try {
        if (isAuthenticated) {
          const { data, error } = await searchChats({ query: { q: query } });

          if (error) {
            throw new Error(`Failed to search chats: ${(error as any).message}`);
          }

          setSearchResults(Array.isArray(data?.chats) ? data.chats : []);
        } else {
          // For guest users, search locally
          const guestChats = getGuestChats();
          const filtered = guestChats.filter((chat) => {
            const titleMatch = chat.title
              .toLowerCase()
              .includes(query.toLowerCase());
            const messageMatch = chat.messages?.some((msg) =>
              "content" in msg
                ? (msg.content as string)?.toLowerCase().includes(query.toLowerCase())
                : false,
            );
            return titleMatch || messageMatch;
          });
          setSearchResults(
            filtered.map((chat) => ({
              ...chat,
              messageCount:
                chat.messages?.filter((m) => m.role === "user").length ?? 0,
              lastMessageAt: getLastMessageAt(chat),
            })),
          );
        }
      } catch (err) {
        console.error("Failed to search chat history:", err);
        setSearchResults([]);
        toast.error("Failed to search chat history");
      } finally {
        setSearching(false);
      }
    },
    [isAuthenticated],
  );

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      void performSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, performSearch]);

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  return {
    chats,
    sortedChats,
    displayChats,
    loading,
    pinnedIds,
    togglePin,
    incognito,
    toggleIncognito,
    // search
    searchQuery,
    searchResults,
    searching,
    handleSearchChange,
    // delete single
    deleteDialogOpen,
    setDeleteDialogOpen,
    chatToDelete,
    setChatToDelete,
    deleting,
    handleDeleteClick,
    handleConfirmDelete,
    // clear all
    clearAllDialogOpen,
    setClearAllDialogOpen,
    clearingAll,
    handleClearAllClick,
    handleConfirmClearAll,
  };
}
