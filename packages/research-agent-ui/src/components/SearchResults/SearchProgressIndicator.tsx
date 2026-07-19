/**
 * Live progress panel showing each search query's category label and running/done status while the agent
 * is executing searches; collapses to "Analysis complete" once all queries finish.
 */
'use client';

import { Loader2, Search } from 'lucide-react';
import { SearchQuery } from '../ChatConversation/ChatWindow';
import { cn } from '../../lib/utils';

interface SearchProgressIndicatorProps {
  queries: SearchQuery[];
  /** True while the parent section is still streaming */
  loading: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  extract: 'Extract',
  arxiv: 'ArXiv',
  'google scholar': 'Scholar',
  pubmed: 'PubMed',
  wolframalpha: 'Wolfram',
  youtube: 'YouTube',
  Web: 'Web',
};

function categoryLabel(cat?: string): string {
  if (!cat) return 'Web';
  return CATEGORY_LABELS[cat] ?? cat;
}

export default function SearchProgressIndicator({ queries, loading }: SearchProgressIndicatorProps) {
  const doneCount = queries.filter((q) => q.status === 'done').length;
  const totalCount = queries.length;
  const isRunning = loading && queries.some((q) => q.status === 'running');

  if (!loading) return null;

  return (
    <div className="rounded-xl border border-border bg-secondary/20 overflow-hidden text-sm">
      {/* Header row */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
        <div className="flex items-center gap-2 text-muted-foreground">
          {isRunning ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Search className="w-3.5 h-3.5" />
          )}
          <span className="font-medium text-foreground">
            {isRunning ? 'Running analysis…' : 'Analysis complete'}
          </span>
        </div>
        {totalCount > 0 && (
          <span className="text-xs text-muted-foreground tabular-nums">
            {doneCount}/{totalCount} searches
          </span>
        )}
      </div>

      {/* Query list */}
      {queries.length > 0 && (
        <div className="divide-y divide-border/40">
          {queries.map((q, i) => (
            <div key={i} className="flex items-center gap-2.5 px-3 py-2">
              {q.status === 'running' ? (
                <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin flex-shrink-0" />
              ) : (
                <Search className={cn('w-3.5 h-3.5 flex-shrink-0', q.status === 'done' ? 'text-muted-foreground' : 'text-muted-foreground/40')} />
              )}
              <div className="flex items-baseline gap-1.5 min-w-0 flex-1">
                <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                  {categoryLabel(q.category)} ·
                </span>
                <span className="text-foreground/80 truncate">{q.query}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
