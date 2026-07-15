'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Sun, Clock, CalendarDays, Archive, Pin, Trash, Search, X,
  Trash2, Lock, Library, MessageSquare,
} from 'lucide-react';
import { useHistoryState, HistoryDialogs, formatTimeDifference } from 'research-agent-ui';
import type { Chat } from 'research-agent-ui';

type CategoryKey = 'Today' | 'Yesterday' | 'This Week' | 'Older';

const CATEGORY_ICONS: Record<CategoryKey, React.ReactNode> = {
  Today: <Sun size={14} />,
  Yesterday: <Clock size={14} />,
  'This Week': <CalendarDays size={14} />,
  Older: <Archive size={14} />,
};

function groupChatsByDate(chats: Chat[]): { label: CategoryKey; chats: Chat[] }[] {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 86400000);
  const startOfWeek = new Date(startOfToday.getTime() - 6 * 86400000);

  const groups: Record<CategoryKey, Chat[]> = {
    Today: [],
    Yesterday: [],
    'This Week': [],
    Older: [],
  };

  for (const chat of chats) {
    const d = new Date(chat.createdAt);
    if (d >= startOfToday) groups['Today'].push(chat);
    else if (d >= startOfYesterday) groups['Yesterday'].push(chat);
    else if (d >= startOfWeek) groups['This Week'].push(chat);
    else groups['Older'].push(chat);
  }

  return (['Today', 'Yesterday', 'This Week', 'Older'] as CategoryKey[])
    .filter((label) => groups[label].length > 0)
    .map((label) => ({ label, chats: groups[label] }));
}

export default function LibraryPage() {
  const state = useHistoryState();

  const grouped = useMemo(
    () => groupChatsByDate(state.displayChats),
    [state.displayChats],
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Library size={20} className="text-primary" />
          <h1 className="text-xl font-semibold">Search History</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={state.toggleIncognito}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors duration-200 ${
              state.incognito
                ? 'text-primary bg-primary/10'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
            }`}
            title={state.incognito ? 'Private mode on' : 'Private mode'}
          >
            <Lock size={14} />
            <span>Private</span>
          </button>
          {state.chats.length > 0 && !state.loading && (
            <button
              onClick={state.handleClearAllClick}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors duration-200"
            >
              <Trash2 size={14} />
              <span>Clear All</span>
            </button>
          )}
        </div>
      </div>

      {/* Search bar */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
        <input
          type="text"
          placeholder="Search chats..."
          value={state.searchQuery}
          onChange={(e) => state.handleSearchChange(e.target.value)}
          className="w-full pl-9 pr-9 py-2.5 text-sm bg-secondary/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground/50"
        />
        {state.searchQuery && (
          <button
            onClick={() => state.handleSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {state.loading || state.searching ? (
        <div className="flex justify-center py-16">
          <svg
            aria-hidden="true"
            className="w-8 h-8 text-muted-foreground/30 fill-primary animate-spin"
            viewBox="0 0 100 101"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M100 50.5908C100.003 78.2051 78.1951 100.003 50.5908 100C22.9765 99.9972 0.997224 78.018 1 50.4037C1.00281 22.7993 22.8108 0.997224 50.4251 1C78.0395 1.00281 100.018 22.8108 100 50.4251ZM9.08164 50.594C9.06312 73.3997 27.7909 92.1272 50.5966 92.1457C73.4023 92.1642 92.1298 73.4365 92.1483 50.6308C92.1669 27.8251 73.4392 9.0973 50.6335 9.07878C27.8278 9.06026 9.10003 27.787 9.08164 50.594Z"
              fill="currentColor"
            />
            <path
              d="M93.9676 39.0409C96.393 38.4037 97.8624 35.9116 96.9801 33.5533C95.1945 28.8227 92.871 24.3692 90.0681 20.348C85.6237 14.1775 79.4473 9.36872 72.0454 6.45794C64.6435 3.54717 56.3134 2.65431 48.3133 3.89319C45.869 4.27179 44.3768 6.77534 45.014 9.20079C45.6512 11.6262 48.1343 13.0956 50.5786 12.717C56.5073 11.8281 62.5542 12.5399 68.0406 14.7911C73.527 17.0422 78.2187 20.7487 81.5841 25.4923C83.7976 28.5886 85.4467 32.059 86.4416 35.7474C87.1273 38.1189 89.5423 39.6781 91.9676 39.0409Z"
              fill="currentFill"
            />
          </svg>
        </div>
      ) : state.searchQuery.trim() && state.displayChats.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
          <Search size={32} className="opacity-30" />
          <p className="text-sm">No chats matching &ldquo;{state.searchQuery}&rdquo;</p>
        </div>
      ) : state.chats.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
          <MessageSquare size={40} className="opacity-20" />
          <p className="text-sm">No search history yet.</p>
          <Link href="/" className="text-sm text-primary hover:underline">
            Start a search
          </Link>
        </div>
      ) : state.searchQuery.trim() ? (
        <div className="space-y-1">
          {state.displayChats.map((chat) => (
            <ChatRow
              key={chat.id}
              chat={chat}
              isPinned={state.pinnedIds.includes(chat.id)}
              onTogglePin={state.togglePin}
              onDelete={state.handleDeleteClick}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ label, chats }) => (
            <div key={label}>
              <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">
                {CATEGORY_ICONS[label]}
                {label}
              </div>
              <div className="space-y-1">
                {chats.map((chat) => (
                  <ChatRow
                    key={chat.id}
                    chat={chat}
                    isPinned={state.pinnedIds.includes(chat.id)}
                    onTogglePin={state.togglePin}
                    onDelete={state.handleDeleteClick}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <HistoryDialogs
        deleteDialogOpen={state.deleteDialogOpen}
        setDeleteDialogOpen={state.setDeleteDialogOpen}
        chatToDelete={state.chatToDelete}
        setChatToDelete={state.setChatToDelete}
        deleting={state.deleting}
        onConfirmDelete={state.handleConfirmDelete}
        clearAllDialogOpen={state.clearAllDialogOpen}
        setClearAllDialogOpen={state.setClearAllDialogOpen}
        clearingAll={state.clearingAll}
        onConfirmClearAll={state.handleConfirmClearAll}
      />
    </div>
  );
}

interface ChatRowProps {
  chat: Chat;
  isPinned: boolean;
  onTogglePin: (e: React.MouseEvent, chatId: string) => void;
  onDelete: (e: React.MouseEvent, chatId: string) => void;
}

function ChatRow({ chat, isPinned, onTogglePin, onDelete }: ChatRowProps) {
  return (
    <div className="group flex items-center gap-2 px-3 py-3 rounded-xl hover:bg-secondary transition-colors duration-200">
      <Link href={`/c/${chat.id}`} className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {isPinned && <Pin size={12} className="inline mr-1.5 text-primary" />}
          {chat.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <div className="flex items-center gap-1">
            <ClockIcon size={12} className="text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {formatTimeDifference(new Date(), chat.createdAt)} ago
            </span>
          </div>
          {(chat.messageCount ?? 0) > 0 && (
            <>
              <span className="text-muted-foreground/50">·</span>
              <span className="text-xs text-muted-foreground">
                {chat.messageCount} {chat.messageCount === 1 ? 'question' : 'questions'}
              </span>
            </>
          )}
        </div>
      </Link>
      <button
        onClick={(e) => onTogglePin(e, chat.id)}
        className={`p-1.5 rounded-lg transition-all duration-200 ${
          isPinned
            ? 'opacity-100 text-primary hover:bg-primary/10'
            : 'opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary hover:bg-primary/10'
        }`}
        title={isPinned ? 'Unpin' : 'Pin'}
      >
        <Pin size={14} />
      </button>
      <button
        onClick={(e) => onDelete(e, chat.id)}
        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-all duration-200"
        title="Delete"
      >
        <Trash size={14} />
      </button>
    </div>
  );
}

function ClockIcon({ size, className }: { size: number; className?: string }) {
  return <Clock size={size} className={className} />;
}
