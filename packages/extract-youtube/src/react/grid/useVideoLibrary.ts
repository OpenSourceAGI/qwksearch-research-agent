/**
 * @fileoverview Loads one page of the library through a client, plus the
 * members of every stacked playlist on it.
 *
 * A stack's companion is usually not on the same page as the video that
 * references it, so after each page arrives this resolves the page's stack
 * keys with one extra `stacks()` call — fetching each key once, not once per
 * page, the way debate-ai.com's `useVideoStacks` did under infinite scroll.
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { VideoLibraryClient } from '../../library/client';
import { collectStackKeys } from '../../library/stacks';
import type { LibraryPage, LibraryQuery, LibraryVideo } from '../../library/types';

export interface UseVideoLibraryResult {
  page: LibraryPage | null;
  videos: LibraryVideo[];
  stacks: Record<string, LibraryVideo[]>;
  loading: boolean;
  error: string | null;
  /** Re-runs the current query — after an edit, say. */
  reload: () => void;
}

export function useVideoLibrary(client: VideoLibraryClient, query: LibraryQuery = {}): UseVideoLibraryResult {
  const [page, setPage] = useState<LibraryPage | null>(null);
  const [stacks, setStacks] = useState<Record<string, LibraryVideo[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const resolved = useRef<Record<string, LibraryVideo[]>>({});
  const queryKey = JSON.stringify(query);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const next = await client.list(JSON.parse(queryKey) as LibraryQuery);
        if (cancelled) return;
        setPage(next);
        const missing = collectStackKeys(next.videos).filter((key) => !resolved.current[key]);
        if (missing.length > 0) {
          const fetched = await client.stacks(missing);
          if (cancelled) return;
          resolved.current = { ...resolved.current, ...fetched };
        }
        setStacks(resolved.current);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [client, queryKey, nonce]);

  const reload = useCallback(() => {
    // An edit can move a video between stacks, so forget what was resolved.
    resolved.current = {};
    setNonce((n) => n + 1);
  }, []);

  return { page, videos: page?.videos ?? [], stacks, loading, error, reload };
}
