/**
 * Horizontal row of pill chips linking to the five most recent chat sessions
 * plus the history dropdown trigger, followed by a subtle label showing how
 * long ago the most recent conversation was last active.
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

  const lastActive = formatRelativeTime(recent[0].lastMessageAt || recent[0].createdAt);

  return (
    <div className="flex flex-row items-center justify-center gap-2 flex-wrap">
      <HistoryDropdown showLabel />
      {recent.map((chat) => (
        <Link
          key={chat.id}
          href={`/c/${chat.id}`}
          className="px-3 py-1 rounded-full text-xs text-muted-foreground bg-secondary hover:bg-secondary/80 hover:text-foreground transition-colors duration-150 truncate max-w-[160px]"
          title={chat.title}
        >
          {chat.title}
        </Link>
      ))}
      {lastActive && (
        <span className="text-xs text-muted-foreground/70 whitespace-nowrap">
          {lastActive}
        </span>
      )}
    </div>
  );
}
