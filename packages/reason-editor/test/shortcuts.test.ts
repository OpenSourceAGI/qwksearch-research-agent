/**
 * Tests for the central keyboard-shortcut registry (`src/shortcuts`):
 * key normalization, event → combo translation, the persistent override
 * store, and the keymap handler's dispatch/swallow decisions.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  SHORTCUTS_STORAGE_KEY,
  SHORTCUT_ACTIONS,
  findActionByCurrentKeys,
  findActionByDefaultKeys,
  getShortcutBinding,
  hasCommandModifier,
  isShortcutOverridden,
  keysFromEvent,
  normalizeKeys,
  resetAllShortcuts,
  serializeKeys,
  setShortcutBinding,
  subscribeShortcuts,
} from '../src/shortcuts/shortcuts';
import { handleShortcutKeyDown } from '../src/shortcuts/ShortcutOverrides';

beforeEach(() => {
  resetAllShortcuts();
  localStorage.removeItem(SHORTCUTS_STORAGE_KEY);
});

describe('normalizeKeys', () => {
  it('canonicalizes modifier aliases, order and letter case', () => {
    expect(normalizeKeys(['B', 'mod'])).toEqual(['mod', 'B']);
    expect(normalizeKeys(['⇧', 'mod', 'h'])).toEqual(['mod', 'shift', 'H']);
    expect(normalizeKeys(['Shift', 'Tab'])).toEqual(['shift', 'Tab']);
    expect(normalizeKeys(['alt', 'mod', 'S'])).toEqual(['mod', 'alt', 'S']);
  });

  it('serializes equal combos written differently to the same string', () => {
    expect(serializeKeys(['shift', 'mod', 'Z'])).toBe(serializeKeys(['mod', 'Shift', 'z']));
  });
});

describe('keysFromEvent', () => {
  it('returns null for a bare modifier press', () => {
    expect(keysFromEvent(new KeyboardEvent('keydown', { key: 'Shift' }))).toBeNull();
  });

  it('builds a normalized combo from modifiers and code', () => {
    const event = new KeyboardEvent('keydown', { key: 'b', code: 'KeyB', ctrlKey: true });
    expect(keysFromEvent(event)).toEqual(['mod', 'B']);
  });

  it('recovers the plain key from code for alt-mutated keys', () => {
    // macOS Alt+S produces key 'ß'; code still says KeyS.
    const event = new KeyboardEvent('keydown', { key: 'ß', code: 'KeyS', altKey: true, metaKey: true });
    expect(keysFromEvent(event)).toEqual(['mod', 'alt', 'S']);
  });
});

describe('registry lookups', () => {
  it('resolves an action from its default keys however they are spelled', () => {
    expect(findActionByDefaultKeys(['mod', 'B'])?.id).toBe('bold');
    expect(findActionByDefaultKeys(['⇧', 'mod', 'H'])?.id).toBe('highlight');
    expect(findActionByDefaultKeys(['mod', 'X', 'Y'])).toBeUndefined();
  });

  it('gives every action a unique current combo by default', () => {
    const combos = SHORTCUT_ACTIONS.map((a) => serializeKeys(a.defaultKeys));
    expect(new Set(combos).size).toBe(combos.length);
  });
});

describe('override store', () => {
  it('persists an override and reports it back', () => {
    setShortcutBinding('bold', ['mod', 'shift', 'B']);

    expect(getShortcutBinding('bold')).toEqual(['mod', 'shift', 'B']);
    expect(isShortcutOverridden('bold')).toBe(true);
    expect(JSON.parse(localStorage.getItem(SHORTCUTS_STORAGE_KEY)!)).toEqual({
      bold: ['mod', 'shift', 'B'],
    });
  });

  it('setting the default again clears the override', () => {
    setShortcutBinding('bold', ['mod', 'shift', 'B']);
    setShortcutBinding('bold', ['mod', 'B']);

    expect(isShortcutOverridden('bold')).toBe(false);
    expect(localStorage.getItem(SHORTCUTS_STORAGE_KEY)).toBeNull();
  });

  it('null resets one binding, resetAllShortcuts resets everything', () => {
    setShortcutBinding('bold', ['mod', 'shift', 'B']);
    setShortcutBinding('italic', ['mod', 'alt', 'I']);

    setShortcutBinding('bold', null);
    expect(getShortcutBinding('bold')).toEqual(['mod', 'B']);
    expect(isShortcutOverridden('italic')).toBe(true);

    resetAllShortcuts();
    expect(isShortcutOverridden('italic')).toBe(false);
  });

  it('notifies subscribers on change', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeShortcuts(listener);

    setShortcutBinding('bold', ['mod', 'shift', 'B']);
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    setShortcutBinding('bold', null);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('finds the action currently holding a combo, overrides included', () => {
    setShortcutBinding('bold', ['mod', 'shift', 'B']);

    expect(findActionByCurrentKeys(['mod', 'shift', 'B'])?.id).toBe('bold');
    // blockquote's default mod+shift+B is shadowed only for lookup order —
    // bold now claims that combo first in registry order.
    expect(findActionByCurrentKeys(['mod', 'B'])).toBeUndefined();
  });
});

describe('hasCommandModifier', () => {
  it('is true only for mod/alt combos', () => {
    expect(hasCommandModifier(['mod', 'B'])).toBe(true);
    expect(hasCommandModifier(['alt', '1'])).toBe(true);
    expect(hasCommandModifier(['shift', 'Tab'])).toBe(false);
    expect(hasCommandModifier(['Tab'])).toBe(false);
  });
});

describe('handleShortcutKeyDown', () => {
  function fakeEditor() {
    const calls: string[] = [];
    const chainable: any = new Proxy(
      {},
      {
        get: (_target, prop: string) => {
          if (prop === 'run') return () => true;
          return (..._args: any[]) => {
            calls.push(prop);
            return chainable;
          };
        },
      },
    );
    const editor: any = {
      chain: () => chainable,
      commands: { toggleBold: () => true, toggleStrike: () => true },
    };
    return { editor, calls };
  }

  const keyEvent = (init: KeyboardEventInit) => new KeyboardEvent('keydown', init);

  it('ignores combos of un-remapped actions so native keymaps handle them', () => {
    const { editor, calls } = fakeEditor();
    const handled = handleShortcutKeyDown(
      editor,
      keyEvent({ key: 'b', code: 'KeyB', ctrlKey: true }),
    );

    expect(handled).toBe(false);
    expect(calls).not.toContain('toggleBold');
  });

  it('runs a remapped action on its new combo', () => {
    setShortcutBinding('bold', ['mod', 'alt', 'B']);
    const { editor, calls } = fakeEditor();

    const handled = handleShortcutKeyDown(
      editor,
      keyEvent({ key: 'b', code: 'KeyB', ctrlKey: true, altKey: true }),
    );

    expect(handled).toBe(true);
    expect(calls).toContain('toggleBold');
  });

  it('swallows the abandoned default combo of a remapped action', () => {
    setShortcutBinding('bold', ['mod', 'alt', 'B']);
    const { editor, calls } = fakeEditor();

    const handled = handleShortcutKeyDown(
      editor,
      keyEvent({ key: 'b', code: 'KeyB', ctrlKey: true }),
    );

    expect(handled).toBe(true);
    expect(calls).not.toContain('toggleBold');
  });

  it('handles alwaysHandle actions (strike) even without a remap', () => {
    const { editor, calls } = fakeEditor();

    const handled = handleShortcutKeyDown(
      editor,
      keyEvent({ key: 's', code: 'KeyS', ctrlKey: true, shiftKey: true }),
    );

    expect(handled).toBe(true);
    expect(calls).toContain('toggleStrike');
  });
});
