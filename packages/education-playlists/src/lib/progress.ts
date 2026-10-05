/**
 * @fileoverview Which items a learner has checked off, kept per browser.
 *
 * Progress is keyed by item id, not by playlist, so finishing 18.06 in the
 * "Linear Algebra and Probability" playlist also ticks it in a custom playlist
 * that includes it. Storage access is wrapped: a private window or blocked
 * site data must leave a working (if forgetful) widget, not a thrown error.
 */

export const PROGRESS_STORAGE_KEY = 'educationPlaylists.progress';

export interface ProgressStore {
  load(): Set<string>;
  save(done: ReadonlySet<string>): void;
}

/** A store over `localStorage`, or in memory where there is none. */
export function createProgressStore(key = PROGRESS_STORAGE_KEY): ProgressStore {
  let memory = new Set<string>();
  const storage = (): Storage | null => {
    try {
      return typeof localStorage === 'undefined' ? null : localStorage;
    } catch {
      return null;
    }
  };
  return {
    load() {
      try {
        const raw = storage()?.getItem(key);
        if (!raw) return new Set(memory);
        const parsed: unknown = JSON.parse(raw);
        return Array.isArray(parsed) ? new Set(parsed.filter((id): id is string => typeof id === 'string')) : new Set();
      } catch {
        return new Set(memory);
      }
    },
    save(done) {
      memory = new Set(done);
      try {
        storage()?.setItem(key, JSON.stringify([...done]));
      } catch {
        // Quota or blocked storage: the in-memory copy still serves this page.
      }
    },
  };
}

/** The set with `id` toggled; never mutates the input. */
export function toggleDone(done: ReadonlySet<string>, id: string): Set<string> {
  const next = new Set(done);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}
