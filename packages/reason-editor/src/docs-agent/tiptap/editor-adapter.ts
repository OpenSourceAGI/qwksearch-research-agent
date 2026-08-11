/**
 * Wraps a Tiptap editor in the engine-neutral `EditorToolbarAdapter`.
 *
 * This is the only place the shared toolbar meets ProseMirror. The command
 * tables themselves live in `toolbar-actions.ts`.
 */

import type { Editor } from '@tiptap/core';

import type {
  EditorToolbarAdapter,
  ToolbarCommand,
  ToolbarCommandPayload,
} from '../shared/editor-types';
import {
  executeTiptapCommand,
  getTiptapCommandValue,
  isTiptapCommandActive,
  isTiptapCommandEnabled,
} from './toolbar-actions';

export function createTiptapAdapter(editor: Editor): EditorToolbarAdapter {
  return {
    engine: 'tiptap',

    execute(command: ToolbarCommand, payload?: ToolbarCommandPayload) {
      executeTiptapCommand(editor, command, payload);
    },

    isActive(command: ToolbarCommand) {
      return isTiptapCommandActive(editor, command);
    },

    isEnabled(command: ToolbarCommand) {
      return isTiptapCommandEnabled(editor, command);
    },

    getValue(command: ToolbarCommand) {
      return getTiptapCommandValue(editor, command);
    },

    subscribe(listener: () => void) {
      editor.on('transaction', listener);
      editor.on('selectionUpdate', listener);

      return () => {
        editor.off('transaction', listener);
        editor.off('selectionUpdate', listener);
      };
    },
  };
}
