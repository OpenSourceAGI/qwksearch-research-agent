/**
 * Central keyboard-shortcut registry for the editor toolbar.
 *
 * Every command-driven toolbar action is listed here once, with a stable id,
 * a human-readable label (for the Settings UI), its default key combo, and
 * the editor command it runs. User overrides are persisted to localStorage
 * and exposed through a tiny subscribable store, so tooltips, the Settings
 * panel, and the keymap extension all read the same live binding.
 */

import { useSyncExternalStore } from 'react';

import type { Editor } from '@tiptap/core';

export interface ShortcutAction {
  /** Stable identifier, used as the storage key. */
  id: string;
  /** English label shown in the Settings panel. */
  label: string;
  /** Settings-panel group heading. */
  group: string;
  /** Default key combo, e.g. ['mod', 'shift', 'B']. */
  defaultKeys: string[];
  /** Runs the action; absent for display-only entries. */
  run?: (editor: Editor) => void;
  /**
   * Handle this action's combo in the shortcut keymap even when it is not
   * remapped — for actions whose displayed default has no (or a different)
   * native Tiptap binding.
   */
  alwaysHandle?: boolean;
}

// ─── Key normalization ───────────────────────────────────────────────────────
//
// Extensions describe combos loosely (['⇧', 'mod', 'H'], ['Shift', 'Tab']...).
// Everything is normalized to lowercase modifiers in a fixed order
// (mod, alt, shift) followed by one uppercase main key, so combos can be
// compared as plain strings.

const MODIFIER_ALIASES: Record<string, string> = {
  'mod': 'mod',
  'cmd': 'mod',
  'command': 'mod',
  'ctrl': 'mod',
  'control': 'mod',
  '⌘': 'mod',
  'alt': 'alt',
  'option': 'alt',
  '⌥': 'alt',
  'shift': 'shift',
  '⇧': 'shift',
};

const MODIFIER_ORDER = ['mod', 'alt', 'shift'];

export function normalizeKeys(keys: string[]): string[] {
  const modifiers: string[] = [];
  const main: string[] = [];

  for (const raw of keys) {
    const alias = MODIFIER_ALIASES[`${raw}`.toLowerCase()];
    if (alias) {
      if (!modifiers.includes(alias)) modifiers.push(alias);
    } else {
      main.push(raw.length === 1 ? raw.toUpperCase() : raw);
    }
  }

  modifiers.sort((a, b) => MODIFIER_ORDER.indexOf(a) - MODIFIER_ORDER.indexOf(b));
  return [...modifiers, ...main];
}

export function serializeKeys(keys: string[]): string {
  return normalizeKeys(keys).join('+');
}

/** True when the combo carries a mod/alt modifier (safe to intercept globally). */
export function hasCommandModifier(keys: string[]): boolean {
  const normalized = normalizeKeys(keys);
  return normalized.includes('mod') || normalized.includes('alt');
}

/**
 * Turn a keydown event into a normalized combo, or null for a bare modifier
 * press. Letters and digits come from `event.code` so macOS Alt-combos (which
 * mutate `event.key` into special characters) still resolve to the plain key.
 */
export function keysFromEvent(event: KeyboardEvent): string[] | null {
  const key = event.key;
  if (key === 'Control' || key === 'Meta' || key === 'Alt' || key === 'Shift') {
    return null;
  }

  const parts: string[] = [];
  if (event.metaKey || event.ctrlKey) parts.push('mod');
  if (event.altKey) parts.push('alt');
  if (event.shiftKey) parts.push('shift');

  let main = key;
  const code = event.code;
  if (/^Key[A-Z]$/.test(code)) main = code.slice(3);
  else if (/^Digit[0-9]$/.test(code)) main = code.slice(5);
  else if (key === ' ') main = 'Space';

  parts.push(main.length === 1 ? main.toUpperCase() : main);
  return normalizeKeys(parts);
}

// ─── Action registry ─────────────────────────────────────────────────────────

const cmd = (name: string, ...args: any[]) => (editor: Editor) => {
  const commands = editor.commands as any;
  if (typeof commands[name] === 'function') {
    (editor.chain().focus() as any)[name](...args).run();
  }
};

export const SHORTCUT_ACTIONS: ShortcutAction[] = [
  // History
  { id: 'undo', label: 'Undo', group: 'History', defaultKeys: ['mod', 'Z'], run: cmd('undo') },
  { id: 'redo', label: 'Redo', group: 'History', defaultKeys: ['mod', 'shift', 'Z'], run: cmd('redo') },

  // Text formatting
  { id: 'bold', label: 'Bold', group: 'Text formatting', defaultKeys: ['mod', 'B'], run: cmd('toggleBold') },
  { id: 'italic', label: 'Italic', group: 'Text formatting', defaultKeys: ['mod', 'I'], run: cmd('toggleItalic') },
  { id: 'underline', label: 'Underline', group: 'Text formatting', defaultKeys: ['mod', 'U'], run: cmd('toggleUnderline') },
  // Tiptap's native strike binding is Mod-Shift-X; the toolbar has always
  // advertised mod+shift+S, so the shortcut keymap owns this combo itself.
  { id: 'strike', label: 'Strikethrough', group: 'Text formatting', defaultKeys: ['mod', 'shift', 'S'], run: cmd('toggleStrike'), alwaysHandle: true },
  { id: 'code', label: 'Inline code', group: 'Text formatting', defaultKeys: ['mod', 'E'], run: cmd('toggleCode') },
  { id: 'highlight', label: 'Highlight', group: 'Text formatting', defaultKeys: ['mod', 'shift', 'H'], run: cmd('toggleHighlight') },
  { id: 'subscript', label: 'Subscript', group: 'Text formatting', defaultKeys: ['mod', ','], run: cmd('toggleSubscript') },
  { id: 'superscript', label: 'Superscript', group: 'Text formatting', defaultKeys: ['mod', '.'], run: cmd('toggleSuperscript') },
  {
    id: 'clearFormat',
    label: 'Clear formatting',
    group: 'Text formatting',
    defaultKeys: ['mod', '\\'],
    run: (editor) => editor.chain().focus().clearNodes().unsetAllMarks().run(),
    // No native Tiptap binding exists for clearing formatting.
    alwaysHandle: true,
  },

  // Paragraph & headings
  { id: 'paragraph', label: 'Paragraph', group: 'Paragraph', defaultKeys: ['mod', 'alt', '0'], run: cmd('setParagraph') },
  ...([1, 2, 3, 4, 5, 6] as const).map((level) => ({
    id: `heading${level}`,
    label: `Heading ${level}`,
    group: 'Paragraph',
    defaultKeys: ['mod', 'alt', `${level}`],
    run: cmd('toggleHeading', { level }),
  })),
  { id: 'blockquote', label: 'Blockquote', group: 'Paragraph', defaultKeys: ['mod', 'shift', 'B'], run: cmd('toggleBlockquote') },
  { id: 'codeBlock', label: 'Code block', group: 'Paragraph', defaultKeys: ['mod', 'alt', 'C'], run: cmd('toggleCodeBlock') },
  { id: 'horizontalRule', label: 'Horizontal rule', group: 'Paragraph', defaultKeys: ['mod', 'alt', 'S'], run: cmd('setHorizontalRule') },

  // Lists & indent
  { id: 'bulletList', label: 'Bullet list', group: 'Lists', defaultKeys: ['mod', 'shift', '8'], run: cmd('toggleBulletList') },
  { id: 'orderedList', label: 'Ordered list', group: 'Lists', defaultKeys: ['mod', 'shift', '7'], run: cmd('toggleOrderedList') },
  { id: 'taskList', label: 'Task list', group: 'Lists', defaultKeys: ['mod', 'shift', '9'], run: cmd('toggleTaskList') },
  { id: 'indent', label: 'Indent', group: 'Lists', defaultKeys: ['Tab'], run: cmd('indent') },
  { id: 'outdent', label: 'Outdent', group: 'Lists', defaultKeys: ['shift', 'Tab'], run: cmd('outdent') },

  // Alignment
  { id: 'alignLeft', label: 'Align left', group: 'Alignment', defaultKeys: ['mod', 'shift', 'L'], run: cmd('setTextAlign', 'left') },
  { id: 'alignCenter', label: 'Align center', group: 'Alignment', defaultKeys: ['mod', 'shift', 'E'], run: cmd('setTextAlign', 'center') },
  { id: 'alignRight', label: 'Align right', group: 'Alignment', defaultKeys: ['mod', 'shift', 'R'], run: cmd('setTextAlign', 'right') },
  { id: 'alignJustify', label: 'Justify', group: 'Alignment', defaultKeys: ['mod', 'shift', 'J'], run: cmd('setTextAlign', 'justify') },
];

const ACTION_BY_ID = new Map(SHORTCUT_ACTIONS.map((a) => [a.id, a]));

/** Default-combo → action, for resolving legacy `shortcutKeys` props to ids. */
const ACTION_BY_DEFAULT_COMBO = new Map<string, ShortcutAction>();
for (const action of SHORTCUT_ACTIONS) {
  const combo = serializeKeys(action.defaultKeys);
  if (!ACTION_BY_DEFAULT_COMBO.has(combo)) ACTION_BY_DEFAULT_COMBO.set(combo, action);
}

export function getShortcutAction(id: string): ShortcutAction | undefined {
  return ACTION_BY_ID.get(id);
}

export function findActionByDefaultKeys(keys: string[] | undefined): ShortcutAction | undefined {
  if (!keys?.length) return undefined;
  return ACTION_BY_DEFAULT_COMBO.get(serializeKeys(keys));
}

// ─── Persistent override store ───────────────────────────────────────────────

export const SHORTCUTS_STORAGE_KEY = 'reason-editor-shortcuts';

type Overrides = Record<string, string[]>;

function loadOverrides(): Overrides {
  try {
    const raw = localStorage.getItem(SHORTCUTS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    const clean: Overrides = {};
    for (const [id, keys] of Object.entries(parsed ?? {})) {
      if (ACTION_BY_ID.has(id) && Array.isArray(keys) && keys.every((k) => typeof k === 'string')) {
        clean[id] = normalizeKeys(keys as string[]);
      }
    }
    return clean;
  } catch {
    return {};
  }
}

let overrides: Overrides = typeof localStorage === 'undefined' ? {} : loadOverrides();
const listeners = new Set<() => void>();

function persist() {
  try {
    if (Object.keys(overrides).length === 0) {
      localStorage.removeItem(SHORTCUTS_STORAGE_KEY);
    } else {
      localStorage.setItem(SHORTCUTS_STORAGE_KEY, JSON.stringify(overrides));
    }
  } catch {
    /* ignore quota / private-mode errors */
  }
}

function notify() {
  for (const listener of listeners) listener();
}

export function subscribeShortcuts(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The overrides map itself — a stable reference until a binding changes. */
export function getShortcutOverrides(): Overrides {
  return overrides;
}

/** Current binding for an action: the user override, or the default. */
export function getShortcutBinding(id: string): string[] {
  return overrides[id] ?? normalizeKeys(ACTION_BY_ID.get(id)?.defaultKeys ?? []);
}

export function isShortcutOverridden(id: string): boolean {
  const action = ACTION_BY_ID.get(id);
  if (!action) return false;
  const override = overrides[id];
  return !!override && serializeKeys(override) !== serializeKeys(action.defaultKeys);
}

/**
 * The action currently bound to a combo, if any — used for conflict checks
 * while recording.
 */
export function findActionByCurrentKeys(keys: string[]): ShortcutAction | undefined {
  const combo = serializeKeys(keys);
  return SHORTCUT_ACTIONS.find((action) => serializeKeys(getShortcutBinding(action.id)) === combo);
}

/** Set (or, with null, reset) one action's binding. */
export function setShortcutBinding(id: string, keys: string[] | null): void {
  if (!ACTION_BY_ID.has(id)) return;
  const next = { ...overrides };
  if (!keys || serializeKeys(keys) === serializeKeys(ACTION_BY_ID.get(id)!.defaultKeys)) {
    delete next[id];
  } else {
    next[id] = normalizeKeys(keys);
  }
  overrides = next;
  persist();
  notify();
}

export function resetAllShortcuts(): void {
  overrides = {};
  persist();
  notify();
}

// Follow changes made in another tab.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== SHORTCUTS_STORAGE_KEY) return;
    overrides = loadOverrides();
    notify();
  });
}

// ─── React hooks ─────────────────────────────────────────────────────────────

export function useShortcutOverrides(): Overrides {
  return useSyncExternalStore(subscribeShortcuts, getShortcutOverrides, getShortcutOverrides);
}

/**
 * Live key combo for a toolbar button's tooltip. Buttons identify their action
 * either by explicit id or, for the many extensions that only pass their
 * default `shortcutKeys`, by matching those defaults against the registry.
 * Falls back to the given keys verbatim for combos the registry doesn't know.
 */
export function useLiveShortcutKeys(
  defaultKeys: string[] | undefined,
  shortcutId?: string,
): string[] | undefined {
  // Subscribing keeps the tooltip current when a binding changes in Settings.
  useShortcutOverrides();

  const action = (shortcutId && ACTION_BY_ID.get(shortcutId)) || findActionByDefaultKeys(defaultKeys);
  if (action) return getShortcutBinding(action.id);
  return defaultKeys?.length ? normalizeKeys(defaultKeys) : undefined;
}
