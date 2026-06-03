/**
 * Horizontal row of pill chips linking to the three most recent chat sessions plus the history dropdown trigger.
 */
'use client';

import Link from 'next/link';
import { useHistoryState } from '../ChatHistoryDropdown/useHistoryState';
import HistoryDropdown from '../ChatHistoryDropdown';

export default function RecentHistoryChips() {
  const { chats, loading } = useHistoryState();

  const recent = [...chats]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3);

  if (loading) return null;

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
    </div>
  );
}
