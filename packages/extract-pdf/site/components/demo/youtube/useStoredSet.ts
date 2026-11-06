/**
 * A set of video ids kept in the browser's storage: the viewer's favorites and
 * the videos they have hidden. Per viewer and per browser on purpose. The
 * library API holds the shared catalog; what one person stars is theirs.
 *
 * Storage can be missing or throw (private windows, blocked site data), so
 * every read and write is guarded and the set still works in memory.
 */
import { useCallback, useState } from 'react';

function read(key: string): string[] {
  try {
    const raw = window.localStorage.getItem(key);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

function write(key: string, ids: string[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify(ids));
  } catch {
    // Storage unavailable: the set lives for this page load only.
  }
}

export function useStoredSet(key: string) {
  const [ids, setIds] = useState<string[]>(() => read(key));

  const update = useCallback(
    (change: (current: string[]) => string[]) => {
      setIds((current) => {
        const next = change(current);
        write(key, next);
        return next;
      });
    },
    [key],
  );

  const toggle = useCallback((id: string) => update((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id])), [update]);
  const add = useCallback((id: string) => update((current) => (current.includes(id) ? current : [...current, id])), [update]);
  const remove = useCallback((id: string) => update((current) => current.filter((item) => item !== id)), [update]);

  return { ids, toggle, add, remove };
}
