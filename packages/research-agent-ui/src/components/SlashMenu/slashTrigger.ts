/**
 * @fileoverview Slash-menu trigger detection and text replacement.
 *
 * Pure string logic, kept apart from the React hook so the rules for "is the
 * caret inside a slash token" are testable without a DOM.
 */

/** The slash token the caret currently sits in. */
export interface SlashTrigger {
  /** Index of the `/` character. */
  start: number;
  /** Index just past the last character of the token (the caret). */
  end: number;
  /** Text typed after the slash, up to the caret. */
  query: string;
}

/**
 * Finds the slash token that ends at `caret`.
 *
 * A token opens on a `/` at the very start of the input or right after
 * whitespace, and runs to the caret with no whitespace in between. That keeps
 * it from firing inside URLs (`https://x`), relative paths (`a/b`) or
 * fractions (`1/2`). A second `/` inside the token closes it again, so a
 * pasted absolute path (`/usr/local/bin`) stops being treated as a command
 * after its first segment.
 *
 * @param value - Full textarea value.
 * @param caret - Caret offset (`selectionStart`) within `value`.
 * @returns The active token, or `null` when the caret is not inside one.
 */
export function detectSlashTrigger(value: string, caret: number): SlashTrigger | null {
  if (caret < 1 || caret > value.length) return null;
  for (let i = caret - 1; i >= 0; i--) {
    const ch = value[i]!;
    if (/\s/.test(ch)) return null;
    if (ch === '/') {
      const before = i === 0 ? '' : value[i - 1]!;
      if (before !== '' && !/\s/.test(before)) return null;
      const query = value.slice(i + 1, caret);
      if (query.includes('/')) return null;
      return { start: i, end: caret, query };
    }
  }
  return null;
}

/**
 * Replaces a slash token with `replacement`.
 *
 * The caret lands after the inserted text. When the replacement is empty the
 * token is removed along with one adjoining space, so `"fix /new later"`
 * becomes `"fix later"` rather than `"fix  later"`.
 *
 * @returns The new value and where the caret should go.
 */
export function replaceSlashToken(
  value: string,
  trigger: SlashTrigger,
  replacement: string,
): { value: string; caret: number } {
  const before = value.slice(0, trigger.start);
  let after = value.slice(trigger.end);
  if (replacement === '') {
    if (after.startsWith(' ') && (before === '' || /\s$/.test(before))) after = after.slice(1);
    return { value: before + after, caret: before.length };
  }
  return { value: before + replacement + after, caret: before.length + replacement.length };
}
