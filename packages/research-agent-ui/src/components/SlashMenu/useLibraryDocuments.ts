/**
 * @fileoverview Lazy loader for the library documents shown as slash-menu files.
 */
import { useEffect, useRef, useState } from 'react';
import { listDocuments } from 'qwksearch-api-client';
import type { LibraryDocument } from './slashFiles';

/** How long a fetched list is reused before the next open refetches it. */
const STALE_MS = 60_000;

/**
 * Fetches the user's documents the first time `active` becomes true, and
 * again on a later open once the cached list is older than a minute. Failures
 * (signed out, offline, no backend) leave the list empty rather than
 * surfacing an error: the menu just shows commands and attached files.
 */
export function useLibraryDocuments(active: boolean) {
  const [documents, setDocuments] = useState<LibraryDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const fetchedAt = useRef(0);
  const inFlight = useRef(false);

  useEffect(() => {
    if (!active || inFlight.current) return;
    if (Date.now() - fetchedAt.current < STALE_MS) return;
    inFlight.current = true;
    setLoading(true);
    listDocuments()
      .then(({ data }) => {
        fetchedAt.current = Date.now();
        setDocuments(Array.isArray(data) ? (data as LibraryDocument[]) : []);
      })
      .catch(() => {})
      .finally(() => {
        inFlight.current = false;
        setLoading(false);
      });
  }, [active]);

  return { documents, loading };
}
