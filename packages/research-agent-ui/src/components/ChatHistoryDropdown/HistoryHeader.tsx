/**
 * Header bar for the history dropdown with a "Chat History" label,
 * search input, private-mode toggle, and "Clear All" button.
 */
'use client';

import { Lock, Trash2, Search, X } from 'lucide-react';

interface HistoryHeaderProps {
  incognito: boolean;
  onToggleIncognito: () => void;
  showClearAll: boolean;
  onClearAll: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function HistoryHeader({
  incognito,
  onToggleIncognito,
  showClearAll,
  onClearAll,
  searchQuery,
  onSearchChange
}: HistoryHeaderProps) {
  return (
    <div className="mb-2 pb-2 border-b border-border space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground/80 uppercase tracking-wide">
          Chat History
        </p>
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleIncognito}
            className={`flex items-center gap-1 px-2 py-1 text-xs rounded-lg transition-colors duration-200 ${
              incognito
                ? 'text-primary bg-primary/10'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
            }`}
            title={incognito ? 'Private mode on' : 'Private mode'}
          >
            <Lock size={12} />
            <span>Private</span>
          </button>
          {showClearAll && (
            <button
              onClick={onClearAll}
              className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors duration-200"
              title="Clear all history"
            >
              <Trash2 size={12} />
              <span>Clear All</span>
            </button>
          )}
        </div>
      </div>
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
        <input
          type="text"
          placeholder="Search chats..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-7 pr-7 py-1.5 text-sm bg-secondary/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground/50"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
