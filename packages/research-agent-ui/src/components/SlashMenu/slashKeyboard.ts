/**
 * @fileoverview Keyboard handling for the slash menu, as a pure function.
 */

/** What the menu should do in response to a key press. */
export type SlashKeyAction =
  | { type: 'none' }
  | { type: 'move'; index: number }
  | { type: 'select'; index: number }
  | { type: 'close' };

export interface SlashKeyInput {
  key: string;
  shiftKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  /** True while an IME composition is in progress. */
  isComposing?: boolean;
}

/** Index after moving `delta` rows, wrapping at both ends. */
export function moveIndex(current: number, delta: number, count: number): number {
  if (count <= 0) return 0;
  return (((current + delta) % count) + count) % count;
}

/**
 * Maps a key press to a menu action.
 *
 * Returning `none` means the key belongs to the textarea: the caller must not
 * `preventDefault`. Everything else is consumed, which is what stops Enter
 * from submitting the chat message when it picks a menu row.
 *
 * - ArrowUp / ArrowDown move the selection, wrapping.
 * - Enter or Tab select the highlighted row (not while Shift/Ctrl/Meta/Alt is
 *   held, so Shift+Enter still inserts a newline).
 * - Escape closes.
 * - Any key during IME composition is ignored.
 * - With no rows, Enter and Tab pass through so they behave normally.
 */
export function slashKeyAction(
  input: SlashKeyInput,
  state: { activeIndex: number; count: number },
): SlashKeyAction {
  if (input.isComposing || input.key === 'Process') return { type: 'none' };
  const hasModifier = input.ctrlKey || input.metaKey || input.altKey;
  switch (input.key) {
    case 'ArrowDown':
      if (hasModifier || state.count === 0) return { type: 'none' };
      return { type: 'move', index: moveIndex(state.activeIndex, 1, state.count) };
    case 'ArrowUp':
      if (hasModifier || state.count === 0) return { type: 'none' };
      return { type: 'move', index: moveIndex(state.activeIndex, -1, state.count) };
    case 'Enter':
    case 'Tab':
      if (input.shiftKey || hasModifier || state.count === 0) return { type: 'none' };
      return { type: 'select', index: state.activeIndex };
    case 'Escape':
      return { type: 'close' };
    default:
      return { type: 'none' };
  }
}
