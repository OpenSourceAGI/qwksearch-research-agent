/**
 * @module useCommentThreads
 * @description React store for comment threads. The Tiptap `comment` mark
 * anchors a highlighted range and holds the thread id; the full thread content
 * (body text, replies, resolved state, author) lives here so it can be edited,
 * replied to, and resolved from the sidebar without round-tripping through
 * HTML-serialized mark attributes. State is kept in memory per editor instance.
 */
import { useCallback, useRef, useState } from 'react';
import type { CommentData, CommentReply } from '@/extensions/Comment';

/** A single comment thread; alias of the extension's {@link CommentData}. */
export type CommentThread = CommentData;

/** Imperative API returned by {@link useCommentThreads}. */
export interface CommentThreadStore {
  /** All threads, newest first. */
  threads: CommentThread[];
  /** Insert or replace a thread (called when a new comment mark is created). */
  addThread: (thread: CommentThread) => void;
  /** Replace the body text of a thread. */
  setThreadText: (id: string, text: string) => void;
  /** Append a reply to a thread. */
  addReply: (id: string, reply: CommentReply) => void;
  /** Toggle a thread's resolved state. */
  setResolved: (id: string, resolved: boolean) => void;
  /** Delete a thread. */
  removeThread: (id: string) => void;
  /** Replace all threads (e.g. when switching documents), preserving any
   *  in-session body/replies for ids that are still present. */
  hydrate: (list: CommentThread[]) => void;
  /** True when a thread exists for the id. */
  has: (id: string) => boolean;
}

/**
 * Creates an in-memory thread store. The returned callbacks are stable, so they
 * can be wired into the `comment` extension's options without recreating the
 * editor. A ref mirrors the latest map for synchronous reads inside callbacks.
 */
export function useCommentThreads(): CommentThreadStore {
  const [map, setMap] = useState<Record<string, CommentThread>>({});
  const mapRef = useRef(map);
  mapRef.current = map;

  const addThread = useCallback((thread: CommentThread) => {
    setMap((prev) => ({ ...prev, [thread.id]: thread }));
  }, []);

  const setThreadText = useCallback((id: string, text: string) => {
    setMap((prev) => (prev[id] ? { ...prev, [id]: { ...prev[id], text } } : prev));
  }, []);

  const addReply = useCallback((id: string, reply: CommentReply) => {
    setMap((prev) =>
      prev[id]
        ? { ...prev, [id]: { ...prev[id], replies: [...(prev[id].replies || []), reply] } }
        : prev,
    );
  }, []);

  const setResolved = useCallback((id: string, resolved: boolean) => {
    setMap((prev) => (prev[id] ? { ...prev, [id]: { ...prev[id], resolved } } : prev));
  }, []);

  const removeThread = useCallback((id: string) => {
    setMap((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const hydrate = useCallback((list: CommentThread[]) => {
    setMap((prev) => {
      const next: Record<string, CommentThread> = {};
      for (const stub of list) {
        // Keep richer in-session data (body/replies) when the id survives.
        const existing = prev[stub.id];
        next[stub.id] = existing
          ? { ...stub, text: existing.text || stub.text, replies: existing.replies }
          : stub;
      }
      return next;
    });
  }, []);

  const has = useCallback((id: string) => Boolean(mapRef.current[id]), []);

  const threads = Object.values(map).sort((a, b) => b.timestamp - a.timestamp);

  return { threads, addThread, setThreadText, addReply, setResolved, removeThread, hydrate, has };
}
