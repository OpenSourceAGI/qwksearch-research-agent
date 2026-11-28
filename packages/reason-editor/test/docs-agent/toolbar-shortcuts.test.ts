import { describe, expect, it } from 'vitest';

import {
  formatShortcutKeys,
  formatShortcutLabel,
  resolveToolbarShortcut,
} from '../../src/docs-agent/shared/toolbar-shortcuts';
import {
  collectToolbarCommands,
  getToolbarMeta,
  PLAYGROUND_TOOLBAR_META,
  REASON_TOOLBAR,
  type ToolbarItem,
} from '../../src/docs-agent/shared/toolbar-schema';

describe('formatShortcutKeys', () => {
  it('renders mod as Cmd on Apple platforms', () => {
    expect(formatShortcutKeys('mod+shift+z', true)).toEqual(['⌘', '⇧', 'Z']);
  });

  it('renders mod as Ctrl elsewhere', () => {
    expect(formatShortcutKeys('mod+shift+z', false)).toEqual(['Ctrl', 'Shift', 'Z']);
  });

  it('spells out punctuation and named keys', () => {
    expect(formatShortcutKeys('mod+,', false)).toEqual(['Ctrl', ',']);
    expect(formatShortcutKeys('mod+shift+.', true)).toEqual(['⌘', '⇧', '.']);
    expect(formatShortcutKeys('shift+tab', false)).toEqual(['Shift', 'Tab']);
    expect(formatShortcutKeys('mod+\\', false)).toEqual(['Ctrl', '\\']);
  });

  it('joins a menu label per platform', () => {
    expect(formatShortcutLabel('mod+alt+1', true)).toBe('⌘⌥1');
    expect(formatShortcutLabel('mod+alt+1', false)).toBe('Ctrl+Alt+1');
  });
});

describe('resolveToolbarShortcut', () => {
  it('uses a plain combo for every engine', () => {
    expect(resolveToolbarShortcut('mod+b', 'plate')).toBe('mod+b');
    expect(resolveToolbarShortcut('mod+b', 'tiptap')).toBe('mod+b');
  });

  it('picks the engine-specific combo', () => {
    const strike = { tiptap: 'mod+shift+s', plate: 'mod+shift+x' };

    expect(resolveToolbarShortcut(strike, 'plate')).toBe('mod+shift+x');
    expect(resolveToolbarShortcut(strike, 'tiptap')).toBe('mod+shift+s');
  });

  it('returns nothing where an engine has no binding', () => {
    expect(resolveToolbarShortcut({ tiptap: 'mod+shift+d', plate: null }, 'plate')).toBeUndefined();
    expect(resolveToolbarShortcut({ tiptap: 'mod+shift+d' }, 'plate')).toBeUndefined();
    expect(resolveToolbarShortcut(undefined, 'plate')).toBeUndefined();
  });
});

function walk(items: ToolbarItem[], visit: (item: ToolbarItem) => void) {
  for (const item of items) {
    visit(item);
    if (item.kind === 'menu') walk(item.children, visit);
  }
}

describe('toolbar tooltip data', () => {
  it('describes every button and menu in one line', () => {
    walk(REASON_TOOLBAR, (item) => {
      if (item.kind !== 'button' && item.kind !== 'menu') return;

      expect(item.description, `${item.id} description`).toBeTruthy();
      expect(item.description, `${item.id} is one line`).not.toMatch(/\n/);
    });
  });

  it('never binds one combo to two actions in the same engine', () => {
    for (const engine of ['tiptap', 'plate'] as const) {
      const seen = new Map<string, string>();

      walk(REASON_TOOLBAR, (item) => {
        if (item.kind !== 'button') return;
        const combo = resolveToolbarShortcut(item.shortcut, engine);
        if (!combo) return;

        expect(seen.get(combo), `${engine}: ${combo} on ${item.id}`).toBeUndefined();
        seen.set(combo, item.id);
      });
    }
  });

  it('only advertises a Dictate shortcut where one is bound', () => {
    // Plate registers no key handler for dictation; Tiptap binds Mod-Shift-d.
    const meta = getToolbarMeta('transcribe');

    expect(resolveToolbarShortcut(meta?.shortcut, 'tiptap')).toBe('mod+shift+d');
    expect(resolveToolbarShortcut(meta?.shortcut, 'plate')).toBeUndefined();
  });

  it('looks every schema command up by id', () => {
    for (const command of collectToolbarCommands()) {
      expect(getToolbarMeta(command), command).toBeDefined();
    }
  });

  it('serves the playground-only controls too', () => {
    for (const id of Object.keys(PLAYGROUND_TOOLBAR_META)) {
      expect(getToolbarMeta(id)?.description, id).toBeTruthy();
    }
  });
});
