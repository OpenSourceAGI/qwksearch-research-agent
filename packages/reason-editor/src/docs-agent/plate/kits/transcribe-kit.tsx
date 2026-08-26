'use client';

import { createPlatePlugin } from 'platejs/react';

/**
 * Registers the dictation plugin's presence so `hasPlugin(editor, 'transcribe')`
 * agrees with the Tiptap side's `hasExtension(editor, 'transcribe')`. The
 * actual recognizer/document logic lives in `../transcribe-controller.ts`,
 * keyed off the editor instance rather than this plugin's own options, since it
 * has to interleave with `HistoryEditor.withoutSaving` the same way the Tiptap
 * extension interleaves with ProseMirror's `addToHistory` transaction meta.
 */
export const TranscribeKit = [createPlatePlugin({ key: 'transcribe' })];
