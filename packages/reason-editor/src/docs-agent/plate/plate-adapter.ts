/**
 * Wraps a Plate editor in the engine-neutral `EditorToolbarAdapter`.
 *
 * Same shape as `../tiptap/editor-adapter.ts`, different engine — which is the
 * whole contract. Plate's transforms and node keys can move between versions, so
 * all of that mapping stays in `toolbar-actions.ts` behind this interface.
 */

import type { PlateEditor } from 'platejs/react';

import type {
  EditorToolbarAdapter,
  ToolbarCommand,
  ToolbarCommandPayload,
} from '../shared/editor-types';
import {
  executePlateCommand,
  getPlateCommandValue,
  isPlateCommandActive,
  isPlateCommandEnabled,
} from './toolbar-actions';
import { getTranscribeController } from './transcribe-controller';

export function createPlateAdapter(editor: PlateEditor): EditorToolbarAdapter {
  return {
    engine: 'plate',

    execute(command: ToolbarCommand, payload?: ToolbarCommandPayload) {
      executePlateCommand(editor, command, payload);
    },

    isActive(command: ToolbarCommand) {
      // Dictation is a mic state, not a selection-dependent mark/block — it can
      // be toggled (and stay on) before the editor ever has a selection.
      if (command === 'transcribe') {
        return getTranscribeController(editor).getState().listening;
      }

      // A Plate editor with no selection cannot report block/mark state; the
      // toolbar treats that as "nothing active", matching Tiptap's behaviour.
      if (!editor.selection) return false;

      try {
        return isPlateCommandActive(editor, command);
      } catch {
        return false;
      }
    },

    isEnabled(command: ToolbarCommand) {
      try {
        return isPlateCommandEnabled(editor, command);
      } catch {
        return false;
      }
    },

    getValue(command: ToolbarCommand) {
      if (!editor.selection) return undefined;

      try {
        return getPlateCommandValue(editor, command);
      } catch {
        return undefined;
      }
    },

    subscribe(listener: () => void) {
      // Every change — including selection moves, which is what drives the
      // toolbar's active state — goes through `apply`. Hooking it here rather
      // than `onChange` means the adapter also reports changes outside a React
      // `<Plate>` tree, which is what the parity tests exercise.
      const previousApply = editor.apply as (operation: unknown) => void;
      let queued = false;

      editor.apply = ((operation: unknown) => {
        previousApply.call(editor, operation);

        // Coalesce a whole transform into one toolbar refresh.
        if (queued) return;
        queued = true;
        queueMicrotask(() => {
          queued = false;
          listener();
        });
      }) as typeof editor.apply;

      // The mic starting/stopping doesn't always go through `apply` (the
      // listening flag flips from the recognizer's own async callback), so the
      // toolbar needs a second feed to reflect it promptly — same reasoning as
      // the Tiptap adapter's `subscribeTranscribe` hookup.
      const unsubscribeTranscribe = getTranscribeController(editor).subscribe(listener);

      return () => {
        editor.apply = previousApply;
        unsubscribeTranscribe();
      };
    },
  };
}
