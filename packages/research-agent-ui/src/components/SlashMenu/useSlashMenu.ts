/**
 * @fileoverview State and keyboard handling for the slash menu.
 *
 * The hook is input-agnostic: it takes the controlled `value`, a caret
 * position and the rows, and reports what to render plus a `handleKeyDown`
 * for the textarea. Any composer can adopt the menu with
 * `useSlashMenu` + `<SlashMenu>`.
 */
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { groupRanked, rankSlashItems, type SlashRanked } from './slashMatch';
import { slashKeyAction } from './slashKeyboard';
import { detectSlashTrigger, replaceSlashToken, type SlashTrigger } from './slashTrigger';
import type { SlashItem } from './types';

export interface UseSlashMenuOptions {
  /** Controlled textarea value. */
  value: string;
  /** Caret offset, kept current by the caller (`selectionStart`). */
  caret: number;
  /** Rows to search, in registry order. */
  items: readonly SlashItem[];
  /** Applies the new text and caret after a row is chosen. */
  onApply: (value: string, caret: number) => void;
  /** Disable entirely (e.g. while a request is streaming). */
  disabled?: boolean;
}

export interface SlashMenuState {
  open: boolean;
  trigger: SlashTrigger | null;
  /** Rows in display order (what the keyboard indexes into). */
  results: SlashRanked<SlashItem>[];
  /** The same rows, split into one section per kind. */
  groups: { kind: string; rows: SlashRanked<SlashItem>[] }[];
  activeIndex: number;
  setActiveIndex: (index: number) => void;
  select: (index: number) => void;
  close: () => void;
  /** Returns true when the event was consumed (the caller should stop). */
  handleKeyDown: (e: ReactKeyboardEvent) => boolean;
  /** DOM id prefix for the listbox; options are `${listboxId}-option-${n}`. */
  listboxId: string;
  optionId: (index: number) => string;
  activeOptionId: string | undefined;
}

export function useSlashMenu({
  value,
  caret,
  items,
  onApply,
  disabled = false,
}: UseSlashMenuOptions): SlashMenuState {
  const listboxId = useId();
  const [activeIndex, setActiveIndexState] = useState(0);
  // The `/` position the user dismissed with Escape. The menu stays shut for
  // that token and reopens for the next one.
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);

  const trigger = useMemo(
    () => (disabled ? null : detectSlashTrigger(value, caret)),
    [value, caret, disabled],
  );

  useEffect(() => {
    if (!trigger) setDismissedAt(null);
  }, [trigger]);

  const open = trigger !== null && trigger.start !== dismissedAt;
  const query = trigger?.query ?? '';
  const groups = useMemo(
    () => (open ? groupRanked(rankSlashItems(items, query), ['command', 'file']) : []),
    [open, items, query],
  );
  const results = useMemo(() => groups.flatMap((g) => g.rows), [groups]);

  useEffect(() => {
    setActiveIndexState(0);
  }, [query, open]);

  const resultCount = results.length;
  const safeIndex = resultCount === 0 ? 0 : Math.min(activeIndex, resultCount - 1);

  const close = useCallback(() => {
    if (trigger) setDismissedAt(trigger.start);
  }, [trigger]);

  const select = useCallback(
    (index: number) => {
      const row = results[index];
      if (!row || !trigger) return;
      const next = replaceSlashToken(value, trigger, row.item.insertText ?? '');
      onApply(next.value, next.caret);
      row.item.run?.();
    },
    [results, trigger, value, onApply],
  );

  const handleKeyDown = useCallback(
    (e: ReactKeyboardEvent): boolean => {
      if (!open) return false;
      const action = slashKeyAction(
        {
          key: e.key,
          shiftKey: e.shiftKey,
          ctrlKey: e.ctrlKey,
          metaKey: e.metaKey,
          altKey: e.altKey,
          isComposing: e.nativeEvent?.isComposing || e.keyCode === 229,
        },
        { activeIndex: safeIndex, count: resultCount },
      );
      if (action.type === 'none') return false;
      e.preventDefault();
      e.stopPropagation();
      if (action.type === 'move') setActiveIndexState(action.index);
      else if (action.type === 'select') select(action.index);
      else close();
      return true;
    },
    [open, safeIndex, resultCount, select, close],
  );

  const optionId = useCallback((index: number) => `${listboxId}-option-${index}`, [listboxId]);

  return {
    open,
    trigger,
    results,
    groups,
    activeIndex: safeIndex,
    setActiveIndex: setActiveIndexState,
    select,
    close,
    handleKeyDown,
    listboxId,
    optionId,
    activeOptionId: open && resultCount > 0 ? optionId(safeIndex) : undefined,
  };
}

/** Tracks the textarea caret across typing, clicks and arrow-key moves. */
export function useCaret(ref: React.RefObject<HTMLTextAreaElement | null>) {
  const [caret, setCaret] = useState(0);
  const sync = useCallback(() => {
    const el = ref.current;
    if (el) setCaret(el.selectionStart ?? 0);
  }, [ref]);
  const place = useRef((pos: number) => {
    setCaret(pos);
    requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  });
  return { caret, sync, place: place.current };
}
