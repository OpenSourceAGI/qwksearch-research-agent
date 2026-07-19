import { Message } from "../components/ChatConversation/ChatWindow";
import type { ChatFile as File } from "../types/chat";

export interface GuestChat {
  id: string;
  title: string;
  createdAt: string;
  focusMode: string;
  files?: File[];
  messages: Message[];
}

const GUEST_CHATS_KEY = "qwksearch_guest_chats";

// Helper to check if we're in browser environment
const isBrowser = typeof window !== "undefined";

// Get all guest chats from local storage
export function getGuestChats(): GuestChat[] {
  if (!isBrowser) return [];

  try {
    const chatsJson = localStorage.getItem(GUEST_CHATS_KEY);
    if (!chatsJson) return [];

    const chats = JSON.parse(chatsJson) as GuestChat[];
    return chats.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  } catch (error) {
    console.error("Failed to get guest chats:", error);
    return [];
  }
}

// Get a specific guest chat by ID
export function getGuestChat(chatId: string): GuestChat | null {
  if (!isBrowser) return null;

  const chats = getGuestChats();
  return chats.find((chat) => chat.id === chatId) || null;
}

// Save or update a guest chat
export function saveGuestChat(chat: GuestChat): void {
  if (!isBrowser) return;

  try {
    const chats = getGuestChats();
    const existingIndex = chats.findIndex((c) => c.id === chat.id);

    if (existingIndex >= 0) {
      chats[existingIndex] = chat;
    } else {
      chats.push(chat);
    }

    localStorage.setItem(GUEST_CHATS_KEY, JSON.stringify(chats));
  } catch (error) {
    console.error("Failed to save guest chat:", error);
  }
}

// Delete a guest chat
export function deleteGuestChat(chatId: string): void {
  if (!isBrowser) return;

  try {
    const chats = getGuestChats();
    const filteredChats = chats.filter((chat) => chat.id !== chatId);
    localStorage.setItem(GUEST_CHATS_KEY, JSON.stringify(filteredChats));
  } catch (error) {
    console.error("Failed to delete guest chat:", error);
  }
}

// Clear all guest chats
export function clearAllGuestChats(): void {
  if (!isBrowser) return;

  try {
    localStorage.removeItem(GUEST_CHATS_KEY);
  } catch (error) {
    console.error("Failed to clear guest chats:", error);
  }
}

// Add a message to a guest chat
export function addMessageToGuestChat(chatId: string, message: Message): void {
  if (!isBrowser) return;

  try {
    const chat = getGuestChat(chatId);
    if (!chat) {
      console.error("Chat not found:", chatId);
      return;
    }

    chat.messages.push(message);
    saveGuestChat(chat);
  } catch (error) {
    console.error("Failed to add message to guest chat:", error);
  }
}

// Create a new guest chat
export function createGuestChat(
  chatId: string,
  title: string,
  focusMode: string,
  files?: File[],
): GuestChat {
  const newChat: GuestChat = {
    id: chatId,
    title,
    createdAt: new Date().toISOString(),
    focusMode,
    files: files || [],
    messages: [],
  };

  saveGuestChat(newChat);
  return newChat;
}

// Update chat title
export function updateGuestChatTitle(chatId: string, title: string): void {
  if (!isBrowser) return;

  const chat = getGuestChat(chatId);
  if (chat) {
    chat.title = title;
    saveGuestChat(chat);
  }
}

// Update chat files
export function updateGuestChatFiles(chatId: string, files: File[]): void {
  if (!isBrowser) return;

  const chat = getGuestChat(chatId);
  if (chat) {
    chat.files = files;
    saveGuestChat(chat);
  }
}
