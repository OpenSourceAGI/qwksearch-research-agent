/**
 * @fileoverview The undo/redo history behind the reader's "Undo mark" and
 * "Redo mark" menu items: a capped stack of marking changes (underlines added
 * or removed), each remembering how it was made.
 *
 * The history is plain data with no DOM in it, so it is kept as source text
 * (`MARK_HISTORY_SOURCE`) the same way `reader-runtime.ts` is: the reader
 * script embeds it verbatim, and this module compiles that same text for
 * tests and TypeScript callers — one implementation.
 *
 * - `record` pushes a change and clears everything that was undone.
 * - Only the newest `limit` changes are kept (default `MARK_HISTORY_LIMIT`,
 *   30); older ones are dropped.
 * - `undo` / `redo` move a change between the two stacks and return it so the
 *   caller can apply it to the page.
 *
 * @module mark-history
 */

/** How many marking changes the reader remembers. */
export const MARK_HISTORY_LIMIT = 30

/** Whether a change put marks on the page or took them off. */
export type MarkAction = "add" | "remove"

/** How a change was made: from the user's selection, or by a page-wide command. */
export type MarkSource = "manual" | "auto"

/** The fields every history entry carries; callers add their own payload. */
export interface MarkChange {
  action: MarkAction
  source: MarkSource
  /** Human label, e.g. "Auto-mark page". */
  label: string
  /** Milliseconds since the epoch; filled in by `record` when missing. */
  at?: number
}

/** A capped undo/redo history (see the module doc). */
export interface MarkHistory<T extends MarkChange = MarkChange> {
  /** Push a change. Clears the redo stack and drops the oldest entry beyond the limit. */
  record(change: T): T
  /** Take back the newest change; null when there is nothing to undo. */
  undo(): T | null
  /** Re-apply the most recently undone change; null when there is nothing to redo. */
  redo(): T | null
  canUndo(): boolean
  canRedo(): boolean
  /** Changes that can be undone, oldest first. */
  entries(): T[]
  /** Changes that can be redone, next-to-redo last. */
  redoEntries(): T[]
  /** The most that is kept. */
  limit: number
  clear(): void
}

/** The history as one dependency-free function. Plain ES2017, no outer references. */
export const MARK_HISTORY_SOURCE = String.raw`function createMarkHistory(limit) {
  var max = limit >= 1 ? Math.floor(limit) : 30;
  var undone = [];
  var redone = [];
  function push(stack, change) {
    stack.push(change);
    while (stack.length > max) stack.shift();
  }
  return {
    limit: max,
    record: function (change) {
      var entry = Object.assign({ at: Date.now() }, change);
      push(undone, entry);
      redone.length = 0;
      return entry;
    },
    undo: function () {
      var change = undone.pop();
      if (!change) return null;
      push(redone, change);
      return change;
    },
    redo: function () {
      var change = redone.pop();
      if (!change) return null;
      push(undone, change);
      return change;
    },
    canUndo: function () { return undone.length > 0; },
    canRedo: function () { return redone.length > 0; },
    entries: function () { return undone.slice(); },
    redoEntries: function () { return redone.slice(); },
    clear: function () { undone.length = 0; redone.length = 0; },
  };
}`

let compiled: ((limit?: number) => MarkHistory<any>) | null = null

/** Create an empty history that keeps the newest `limit` changes (default 30). */
export function createMarkHistory<T extends MarkChange = MarkChange>(limit: number = MARK_HISTORY_LIMIT): MarkHistory<T> {
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  compiled ??= new Function(`return (${MARK_HISTORY_SOURCE})`)() as (limit?: number) => MarkHistory<any>
  return compiled(limit) as MarkHistory<T>
}

/** The marking menu items, in toolbar order. `name` is the `data-ptw` hook the reader script wires. */
export const MARK_MENU: ReadonlyArray<{ name: string; label: string; disabled?: boolean }> = [
  { name: "mark", label: "Mark selection" },
  { name: "unmark", label: "Unmark selection" },
  { name: "auto-mark", label: "Auto-mark" },
  { name: "clear-marks", label: "Clear marks" },
  { name: "undo-mark", label: "Undo mark", disabled: true },
  { name: "redo-mark", label: "Redo mark", disabled: true },
]
