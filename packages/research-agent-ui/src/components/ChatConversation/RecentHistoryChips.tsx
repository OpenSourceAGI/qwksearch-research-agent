/**
 * @fileoverview Horizontal row of pill chips linking to the five most recent chat sessions plus the history dropdown trigger.
 *
 * Each pill shows the chat title followed by a subtle italic label showing how long ago that conversation was last active.
 */
'use client';

import Link from 'next/link';
import { useHistoryState } from '../ChatHistoryDropdown/useHistoryState';
import HistoryDropdown from '../ChatHistoryDropdown';
import { formatRelativeTime } from '../../lib/relative-time';

/** Most recent activity timestamp for a chat, falling back to creation time. */
const activityTime = (chat: { lastMessageAt?: string | null; createdAt: string }) =>
  new Date(chat.lastMessageAt || chat.createdAt).getTime();

export default function RecentHistoryChips() {
  const { chats, loading } = useHistoryState();

  const recent = [...chats]
    .sort((a, b) => activityTime(b) - activityTime(a))
    .slice(0, 5);

  if (loading || recent.length === 0) return null;

  return (
    <div className="flex flex-row items-center justify-center gap-2 flex-wrap">
      <HistoryDropdown showLabel />
      {recent.map((chat) => {
        const timeAgo = formatRelativeTime(chat.lastMessageAt || chat.createdAt);
        return (
          <Link
            key={chat.id}
            href={`/c/${chat.id}`}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs text-muted-foreground bg-secondary hover:bg-secondary/80 hover:text-foreground transition-colors duration-150 max-w-[220px]"
            title={chat.title}
          >
            <span className="truncate">{chat.title}</span>
            {timeAgo && (
              <span className="italic text-muted-foreground/70 whitespace-nowrap">
                {timeAgo}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
