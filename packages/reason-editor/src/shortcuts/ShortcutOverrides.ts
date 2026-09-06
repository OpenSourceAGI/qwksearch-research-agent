/**
 * Tiptap extension that makes user-remapped toolbar shortcuts work.
 *
 * A high-priority ProseMirror keydown handler resolves the live binding map
 * from the shortcut store on every keypress (no editor rebuild needed when a
 * binding changes): a combo the user assigned runs its action, and the
 * abandoned default combo of a remapped action is swallowed so it stops
 * firing the built-in binding. Un-remapped actions fall through to the
 * extensions' own keymaps, keeping default behavior byte-identical.
 */

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

import {
  SHORTCUT_ACTIONS,
  getShortcutBinding,
  hasCommandModifier,
  keysFromEvent,
  serializeKeys,
} from './shortcuts';

import type { Editor } from '@tiptap/core';

export function handleShortcutKeyDown(editor: Editor, event: KeyboardEvent): boolean {
  const pressed = keysFromEvent(event);
  if (!pressed) return false;
  const pressedCombo = serializeKeys(pressed);

  for (const action of SHORTCUT_ACTIONS) {
    if (!action.run) continue;

    const defaultCombo = serializeKeys(action.defaultKeys);
    const currentCombo = serializeKeys(getShortcutBinding(action.id));
    const remapped = currentCombo !== defaultCombo;
    // Un-remapped actions are left to the extensions' own keymaps, except the
    // few marked alwaysHandle whose advertised default has no native binding.
    if (!remapped && !action.alwaysHandle) continue;

    if (pressedCombo === currentCombo) {
      event.preventDefault();
      action.run(editor);
      return true;
    }

    // The old combo of a remapped action should stop working — but only when
    // it carries a command modifier; swallowing bare keys like Tab would break
    // typing.
    if (remapped && pressedCombo === defaultCombo && hasCommandModifier(action.defaultKeys)) {
      event.preventDefault();
      return true;
    }
  }

  return false;
}

export const ShortcutOverrides = Extension.create({
  name: 'shortcutOverrides',
  // Well above every formatting extension, so this keymap sees the event
  // before the default bindings do.
  priority: 10_000,

  addProseMirrorPlugins() {
    const editor = this.editor;
    return [
      new Plugin({
        key: new PluginKey('shortcutOverrides'),
        props: {
          handleKeyDown: (_view, event) => handleShortcutKeyDown(editor, event),
        },
      }),
    ];
  },
});
