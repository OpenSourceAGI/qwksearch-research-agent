/**
 * Shortcut data and formatting for toolbar tooltips.
 *
 * A shortcut is declared once, in the toolbar schema, as a canonical string
 * (`mod+shift+z`). `mod` means Cmd on Apple platforms and Ctrl elsewhere, so the
 * same declaration renders as `⌘ ⇧ Z` on a Mac and `Ctrl Shift Z` on Windows or
 * Linux. Engines whose bindings differ declare one per engine, and `null` marks
 * an engine where the action has no binding — the tooltip then shows none.
 */

import type { EditorEngine } from './editor-types';

export type ToolbarEngine = EditorEngine;

/** One canonical combo for every engine, or a per-engine map (`null` = unbound). */
export type ToolbarShortcut = string | Partial<Record<ToolbarEngine, string | null>>;

export function isMacPlatform(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');
}

/** The combo that applies to an engine, or undefined when it has none. */
export function resolveToolbarShortcut(
  shortcut: ToolbarShortcut | undefined,
  engine: ToolbarEngine,
): string | undefined {
  if (!shortcut) return undefined;
  if (typeof shortcut === 'string') return shortcut;
  return shortcut[engine] ?? undefined;
}

const MAC_SYMBOLS: Record<string, string> = {
  mod: '⌘',
  ctrl: '⌃',
  alt: '⌥',
  shift: '⇧',
  enter: '↩',
  tab: '⇥',
  backspace: '⌫',
  delete: '⌦',
  escape: '⎋',
};

const OTHER_NAMES: Record<string, string> = {
  mod: 'Ctrl',
  ctrl: 'Ctrl',
  alt: 'Alt',
  shift: 'Shift',
  enter: 'Enter',
  tab: 'Tab',
  backspace: 'Backspace',
  delete: 'Delete',
  escape: 'Esc',
};

const NAMED_KEYS: Record<string, string> = {
  comma: ',',
  period: '.',
  slash: '/',
  backslash: '\\',
  space: 'Space',
};

/**
 * Splits a canonical combo into the labels of its keys, one per `<kbd>` badge.
 * Modifiers come first in the order users expect on each platform.
 */
export function formatShortcutKeys(shortcut: string, mac: boolean): string[] {
  const names = mac ? MAC_SYMBOLS : OTHER_NAMES;
  // `mod++` style combos are not used; a literal plus would need escaping.
  return shortcut
    .toLowerCase()
    .split('+')
    .filter(Boolean)
    .map((part) => {
      if (names[part]) return names[part];
      if (NAMED_KEYS[part]) return NAMED_KEYS[part];
      return part.length === 1 ? part.toUpperCase() : part[0].toUpperCase() + part.slice(1);
    });
}

/** Single-string form for menu rows: `⌘⇧Z` on Apple platforms, `Ctrl+Shift+Z` elsewhere. */
export function formatShortcutLabel(shortcut: string, mac: boolean): string {
  return formatShortcutKeys(shortcut, mac).join(mac ? '' : '+');
}
