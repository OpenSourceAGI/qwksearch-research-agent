/**
 * @fileoverview Single chat row in the history dropdown showing title, timestamp, message count, and hover-revealed pin/delete actions.
 */
'use client';

import { Trash, Pin } from 'lucide-react';
import { Chat } from '../../types/research';
import { formatTimeDifference } from '../../lib/utils';
import { Badge } from '../../ui/badge';
import { researchAgentUIConfig } from '../../config';
import Link from 'next/link';

interface HistoryChatItemProps {
  chat: Chat;
  isPinned: boolean;
  onTogglePin: (e: React.MouseEvent, chatId: string) => void;
  onDelete: (e: React.MouseEvent, chatId: string) => void;
}

export function HistoryChatItem({ chat, isPinned, onTogglePin, onDelete }: HistoryChatItemProps) {
  const messageCount = chat.messageCount ?? 0;
  return (
    <div className="group flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-secondary transition-colors duration-200">
      <Link
        href={`/c/${chat.id}`}
        onClick={(e) => {
          if (researchAgentUIConfig.onOpenChat?.(chat.id)) e.preventDefault();
        }}
        className="flex-1 min-w-0 flex items-center gap-1.5"
      >
        <span className="flex items-center gap-1 shrink-0">
          {messageCount > 0 && (
            <Badge className="px-1.5 py-0 text-[10px] font-medium bg-zinc-200 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-700 border-0 rounded-md">
              {messageCount}Q
            </Badge>
          )}
          <Badge className="px-1.5 py-0 text-[10px] font-medium bg-zinc-100 text-zinc-500 hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 border-0 rounded-md">
            {formatTimeDifference(new Date(), chat.createdAt)}
          </Badge>
        </span>
        <p className="text-xs text-popover-foreground truncate">
          {isPinned && <Pin size={10} className="inline mr-1 text-primary" />}
          {chat.title}
        </p>
      </Link>
      <button
        onClick={(e) => onTogglePin(e, chat.id)}
        className={`p-1.5 rounded-lg transition-all duration-200 ${isPinned
          ? 'opacity-100 text-primary hover:bg-primary/10'
          : 'opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary hover:bg-primary/10'
          }`}
        title={isPinned ? 'Unpin chat' : 'Pin chat'}
      >
        <Pin size={14} />
      </button>
      <button
        onClick={(e) => onDelete(e, chat.id)}
        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-all duration-200"
        title="Delete chat"
      >
        <Trash size={14} />
      </button>
    </div>
  );
}
