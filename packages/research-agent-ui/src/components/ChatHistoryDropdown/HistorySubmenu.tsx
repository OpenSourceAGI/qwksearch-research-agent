/**
 * @fileoverview "History" flyout submenu for the composer's search-options dropdown.
 *
 * Shows a private-mode toggle at the top, then the ten most recently active chats,
 * then a link to the full history page. The chat list is fetched only when the
 * submenu is opened.
 */
'use client';

import React from 'react';
import { History, EyeOff, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
} from '../../ui/dropdown-menu';
import { useChat } from '../../hooks/useChat';
import { useRecentChats } from './useRecentChats';
import { formatRelativeTime } from '../../lib/relative-time';
import { researchAgentUIConfig } from '../../config';

const RECENT_LIMIT = 10;

/**
 * Renders the History submenu, including the private-mode toggle that used to
 * live directly in the search-options menu.
 */
export const HistorySubmenu: React.FC = () => {
  const router = useRouter();
  const { incognito, setIncognito } = useChat();
  const { recentChats, loading, load } = useRecentChats(RECENT_LIMIT);

  const toggleIncognito = (next: boolean) => {
    setIncognito(next);
    toast.success(
      next ? "Private mode on — messages won't be saved" : 'Private mode off',
    );
  };

  const openChat = (chatId: string) => {
    if (!researchAgentUIConfig.onOpenChat?.(chatId)) router.push(`/c/${chatId}`);
  };

  return (
    <DropdownMenuSub onOpenChange={(open) => { if (open) void load(); }}>
      <DropdownMenuSubTrigger className="gap-2">
        <History className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
        <span>History</span>
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="w-64 max-h-[70vh] overflow-y-auto">
        <DropdownMenuCheckboxItem
          checked={incognito}
          onCheckedChange={toggleIncognito}
          onSelect={(e) => e.preventDefault()}
          className="gap-2"
        >
          <EyeOff className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
          <span>Private</span>
        </DropdownMenuCheckboxItem>

        <DropdownMenuSeparator />

        {loading ? (
          <DropdownMenuItem disabled className="gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
            <span>Loading…</span>
          </DropdownMenuItem>
        ) : recentChats.length === 0 ? (
          <DropdownMenuItem disabled>
            <span className="text-muted-foreground">No recent chats</span>
          </DropdownMenuItem>
        ) : (
          recentChats.map((chat) => {
            const timeAgo = formatRelativeTime(chat.lastMessageAt || chat.createdAt);
            return (
              <DropdownMenuItem
                key={chat.id}
                onSelect={() => openChat(chat.id)}
                className="gap-2"
                title={chat.title}
              >
                <span className="truncate">{chat.title}</span>
                {timeAgo && (
                  <span className="ml-auto pl-2 text-xs italic text-muted-foreground/70 whitespace-nowrap">
                    {timeAgo}
                  </span>
                )}
              </DropdownMenuItem>
            );
          })
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem onSelect={() => router.push('/library')} className="gap-2">
          <History className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
          <span>All history</span>
        </DropdownMenuItem>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
};

export default HistorySubmenu;
