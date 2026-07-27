/**
 * @module CommentsSidebar
 * @description Google-Docs-style comments panel. Lists every comment thread in
 * the active document, split into open and resolved sections, and lets the
 * author write the initial comment body, reply, resolve/reopen, and delete.
 * Selecting a thread scrolls its highlight into view in the editor. All thread
 * state is owned by {@link useCommentThreads}; this component is presentational
 * plus local composer state.
 */
import { useEffect, useRef, useState } from 'react';
import { Check, RotateCcw, Trash2, X, MessageSquarePlus } from 'lucide-react';
import { Avatar, AvatarFallback } from '../shared-components/avatar';
import { Button } from '../shared-components/button';
import { Textarea } from '../shared-components/textarea';
import { Badge } from '../shared-components/badge';
import { cn } from '../utility-functions/utils';
import type { CommentThread } from './useCommentThreads';

/** Props for {@link CommentsSidebar}. */
export interface CommentsSidebarProps {
  threads: CommentThread[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onSubmitBody: (id: string, text: string) => void;
  onReply: (id: string, text: string) => void;
  onResolve: (id: string, resolved: boolean) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** A single thread card with body/replies and a composer. */
function ThreadCard({
  thread,
  active,
  onSelect,
  onSubmitBody,
  onReply,
  onResolve,
  onRemove,
}: {
  thread: CommentThread;
  active: boolean;
  onSelect: (id: string) => void;
  onSubmitBody: (id: string, text: string) => void;
  onReply: (id: string, text: string) => void;
  onResolve: (id: string, resolved: boolean) => void;
  onRemove: (id: string) => void;
}) {
  const [draft, setDraft] = useState('');
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const needsBody = !thread.text.trim();

  // Focus the composer when a freshly created (empty) thread becomes active.
  useEffect(() => {
    if (active && needsBody) composerRef.current?.focus();
  }, [active, needsBody]);

  const submit = () => {
    const value = draft.trim();
    if (!value) return;
    if (needsBody) onSubmitBody(thread.id, value);
    else onReply(thread.id, value);
    setDraft('');
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(thread.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onSelect(thread.id);
      }}
      className={cn(
        'rounded-lg border bg-card p-3 text-left shadow-sm transition-colors cursor-pointer',
        active ? 'border-primary ring-1 ring-primary/40' : 'hover:border-primary/40',
        thread.resolved && 'opacity-70',
      )}
    >
      <div className="flex items-center gap-2">
        <Avatar className="h-6 w-6">
          <AvatarFallback className="text-[10px]" style={{ backgroundColor: thread.authorColor, color: '#fff' }}>
            {initials(thread.authorName)}
          </AvatarFallback>
        </Avatar>
        <span className="text-sm font-medium truncate flex-1">{thread.authorName}</span>
        <span className="text-[11px] text-muted-foreground shrink-0">{formatTime(thread.timestamp)}</span>
        {thread.resolved && <Badge variant="secondary" className="shrink-0">Resolved</Badge>}
      </div>

      {!needsBody && <p className="mt-2 whitespace-pre-wrap break-words text-sm">{thread.text}</p>}

      {thread.replies?.length > 0 && (
        <div className="mt-2 space-y-2 border-l-2 border-border pl-2">
          {thread.replies.map((reply) => (
            <div key={reply.id}>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium">{reply.authorName}</span>
                <span className="text-[10px] text-muted-foreground">{formatTime(reply.timestamp)}</span>
              </div>
              <p className="whitespace-pre-wrap break-words text-sm">{reply.text}</p>
            </div>
          ))}
        </div>
      )}

      {!thread.resolved && (
        <div className="mt-2" onClick={(e) => e.stopPropagation()}>
          <Textarea
            ref={composerRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();
                submit();
              }
            }}
            placeholder={needsBody ? 'Write a comment…' : 'Reply…'}
            className="min-h-[56px] text-sm"
          />
          <div className="mt-1.5 flex items-center justify-between">
            <div className="flex gap-1">
              {!needsBody && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 px-2 text-xs"
                  onClick={() => onResolve(thread.id, true)}
                >
                  <Check className="h-3.5 w-3.5" /> Resolve
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 px-2 text-xs text-destructive hover:text-destructive"
                onClick={() => onRemove(thread.id)}
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </Button>
            </div>
            <Button size="sm" className="h-7 px-3 text-xs" onClick={submit} disabled={!draft.trim()}>
              {needsBody ? 'Comment' : 'Reply'}
            </Button>
          </div>
        </div>
      )}

      {thread.resolved && (
        <div className="mt-2 flex gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-xs"
            onClick={() => onResolve(thread.id, false)}
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reopen
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-xs text-destructive hover:text-destructive"
            onClick={() => onRemove(thread.id)}
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </Button>
        </div>
      )}
    </div>
  );
}

/** The comments panel: header, open threads, then resolved threads. */
export function CommentsSidebar({
  threads,
  activeId,
  onSelect,
  onSubmitBody,
  onReply,
  onResolve,
  onRemove,
  onClose,
}: CommentsSidebarProps) {
  const open = threads.filter((t) => !t.resolved);
  const resolved = threads.filter((t) => t.resolved);

  return (
    <aside className="flex h-full w-full flex-col border-l border-border bg-background">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <h2 className="text-sm font-semibold">Comments</h2>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose} aria-label="Close comments">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {threads.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
            <MessageSquarePlus className="h-8 w-8 opacity-50" />
            <p className="text-sm">No comments yet</p>
            <p className="text-xs">Select text in the document, then choose “Comment”.</p>
          </div>
        ) : (
          <>
            {open.map((thread) => (
              <ThreadCard
                key={thread.id}
                thread={thread}
                active={thread.id === activeId}
                onSelect={onSelect}
                onSubmitBody={onSubmitBody}
                onReply={onReply}
                onResolve={onResolve}
                onRemove={onRemove}
              />
            ))}
            {resolved.length > 0 && (
              <div className="pt-2">
                <p className="mb-1 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Resolved ({resolved.length})
                </p>
                <div className="space-y-2">
                  {resolved.map((thread) => (
                    <ThreadCard
                      key={thread.id}
                      thread={thread}
                      active={thread.id === activeId}
                      onSelect={onSelect}
                      onSubmitBody={onSubmitBody}
                      onReply={onReply}
                      onResolve={onResolve}
                      onRemove={onRemove}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
