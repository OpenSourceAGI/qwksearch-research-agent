/**
 * @fileoverview The storage contract behind the video library.
 *
 * The admin API ({@link createVideoLibraryHandler}) and the library operations
 * (`library.ts`) talk to storage only through {@link VideoLibraryStore}, so the
 * same routes run over an in-memory list in a demo or a test, a Cloudflare D1
 * database in production, or whatever database a host app already has —
 * implement these few methods and everything above them works unchanged.
 *
 * A store is deliberately dumb: it persists rows it is handed and answers
 * queries. Validation, coercion and the derived columns are done *before* a
 * row reaches it (see `fields.ts`), so no backend can disagree with another
 * about what a write means.
 */

import type { LibraryExclusion, LibraryPage, LibraryQuery, LibraryVideo } from './types';

/** One row's partial update, for {@link VideoLibraryStore.updateMany}. */
export interface LibraryRowUpdate {
  videoId: string;
  fields: Partial<LibraryVideo>;
}

export interface VideoLibraryStore {
  /** One page of rows matching `query`. Must honour the rules in `query.ts`. */
  list(query: LibraryQuery): Promise<LibraryPage>;
  /** One row, or `null`. */
  get(videoId: string): Promise<LibraryVideo | null>;
  /** The rows among `videoIds` that exist, in no particular order. */
  getMany(videoIds: readonly string[]): Promise<LibraryVideo[]>;
  /** Every row. Used by whole-library passes (stack recompute, view-count resync). */
  all(): Promise<LibraryVideo[]>;
  /** Members of each stack key, ordered by `stackPosition`. Keys with no rows are omitted. */
  getStacks(keys: readonly string[]): Promise<Record<string, LibraryVideo[]>>;
  /** Distinct non-empty categories, alphabetically — for filter dropdowns. */
  categories(): Promise<string[]>;
  /** Inserts a complete row. Rejects if the id exists. */
  insert(video: LibraryVideo): Promise<void>;
  /** Writes `fields` onto one row. A missing row is a no-op. */
  update(videoId: string, fields: Partial<LibraryVideo>): Promise<void>;
  /** Writes many partial updates — batched where the backend can. */
  updateMany(updates: readonly LibraryRowUpdate[]): Promise<void>;
  /** Deletes a row. Resolves `true` when a row was removed. */
  remove(videoId: string): Promise<boolean>;

  /** Records that an admin removed `videoId`, so an import does not bring it back. */
  addExclusion(exclusion: LibraryExclusion): Promise<void>;
  /** Forgets an exclusion — an admin re-adding a video they removed wants it back. */
  removeExclusion(videoId: string): Promise<void>;
  /** The subset of `videoIds` that are excluded. */
  excludedIds(videoIds: readonly string[]): Promise<Set<string>>;
  /** Every exclusion, newest first. */
  listExclusions(): Promise<LibraryExclusion[]>;
}
