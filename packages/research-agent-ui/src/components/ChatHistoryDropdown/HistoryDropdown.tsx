/**
 * Centered modal for viewing and managing chat history with
 * pinned chats, private mode, and delete/clear-all actions.
 */
'use client';

import React from 'react';
import { History, Sun, Clock, CalendarDays, Archive } from 'lucide-react';
import Link from 'next/link';
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '../../ui/dialog';
import { useHistoryState } from './useHistoryState';
import { HistoryHeader } from './HistoryHeader';
import { HistoryChatItem } from './HistoryChatItem';
import { HistoryDialogs } from './HistoryDialogs';
import { Chat } from '../../types/research';

type CategoryKey = 'Today' | 'Yesterday' | 'This Week' | 'Older';

const CATEGORY_ICONS: Record<CategoryKey, React.ReactNode> = {
  'Today': <Sun size={12} />,
  'Yesterday': <Clock size={12} />,
  'This Week': <CalendarDays size={12} />,
  'Older': <Archive size={12} />,
};

function groupChatsByDate(chats: Chat[]): { label: CategoryKey; chats: Chat[] }[] {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 86400000);
  const startOfWeek = new Date(startOfToday.getTime() - 6 * 86400000);

  const groups: Record<CategoryKey, Chat[]> = { Today: [], Yesterday: [], 'This Week': [], Older: [] };

  for (const chat of chats) {
    const d = new Date(chat.createdAt);
    if (d >= startOfToday) groups['Today'].push(chat);
    else if (d >= startOfYesterday) groups['Yesterday'].push(chat);
    else if (d >= startOfWeek) groups['This Week'].push(chat);
    else groups['Older'].push(chat);
  }

  return (['Today', 'Yesterday', 'This Week', 'Older'] as CategoryKey[])
    .filter(label => groups[label].length > 0)
    .map(label => ({ label, chats: groups[label] }));
}

interface HistoryDropdownProps {
  showLabel?: boolean;
}

const HistoryDropdown = ({ showLabel = false }: HistoryDropdownProps) => {
  const state = useHistoryState();

  return (
    <>
      <Dialog>
        <DialogTrigger
          className={
            showLabel
              ? 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs text-muted-foreground bg-secondary hover:bg-secondary/80 hover:text-foreground transition-colors duration-150'
              : 'p-2 text-muted-foreground rounded-2xl bg-background/60 backdrop-blur-md hover:bg-secondary/80 transition duration-200 hover:text-foreground border border-border/30'
          }
        >
          <History size={showLabel ? 14 : 18} />
          {showLabel && <span>History</span>}
        </DialogTrigger>
        <DialogContent className="max-w-[420px] p-3">
          <DialogTitle className="sr-only">Chat History</DialogTitle>
          <HistoryHeader
            incognito={state.incognito}
            onToggleIncognito={state.toggleIncognito}
            showClearAll={state.chats.length > 0 && !state.loading}
            onClearAll={state.handleClearAllClick}
            searchQuery={state.searchQuery}
            onSearchChange={state.handleSearchChange}
          />
          {state.loading || state.searching ? (
            <div className="flex items-center justify-center py-8">
              <svg
                aria-hidden="true"
                className="w-6 h-6 text-light-200 fill-light-secondary dark:text-[#202020] animate-spin dark:fill-[#ffffff3b]"
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
            <div className="flex items-center justify-center py-8">
              <p className="text-sm text-muted-foreground">No matching chats found.</p>
            </div>
          ) : state.chats.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-sm text-muted-foreground">No chats found.</p>
            </div>
          ) : (
            <div className="space-y-1 max-h-[500px] overflow-y-auto">
              {state.searchQuery.trim() ? (
                state.displayChats.map((chat) => (
                  <HistoryChatItem
                    key={chat.id}
                    chat={chat}
                    isPinned={state.pinnedIds.includes(chat.id)}
                    onTogglePin={state.togglePin}
                    onDelete={state.handleDeleteClick}
                  />
                ))
              ) : (
                groupChatsByDate(state.displayChats).map(({ label, chats }) => (
                  <div key={label}>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">
                      {CATEGORY_ICONS[label]}
                      {label}
                    </div>
                    {chats.map((chat) => (
                      <HistoryChatItem
                        key={chat.id}
                        chat={chat}
                        isPinned={state.pinnedIds.includes(chat.id)}
                        onTogglePin={state.togglePin}
                        onDelete={state.handleDeleteClick}
                      />
                    ))}
                  </div>
                ))
              )}
            </div>
          )}
          {state.chats.length > 0 && (
            <div className="mt-2 pt-2 border-t border-border">
              <Link
                href="/library"
                className="block text-center text-xs text-primary hover:underline"
              >
                View all chats
              </Link>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
    </>
  );
};

export default HistoryDropdown;
