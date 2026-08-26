/**
 * Dictation for the Plate editor — the voice-commands plugin, ported from the
 * Tiptap side's `src/extensions/Transcribe/Transcribe.ts`. Same contract, same
 * `use-voice-control` engine underneath; only the document API differs, because
 * Slate has no ProseMirror-style transaction metadata to opt a write out of
 * history. Read `Transcribe.ts`'s doc comment first — this mirrors its design
 * decisions (interim text kept out of undo, one committed insertion per phrase)
 * point for point.
 *
 * Point/range lookups (`editor.api.before/end/string`) and the undo-history
 * escape hatch (`editor.tf.withoutSaving`) both go through Plate's own
 * `@platejs/slate` API rather than the `slate`/`slate-history` packages
 * directly: Plate layers its own history implementation over Slate's (see
 * `@platejs/slate`'s `HistoryApi`), so the real `slate-history` package's
 * `HistoryEditor.withoutSaving` — the ProseMirror side's equivalent would be
 * `tr.setMeta('addToHistory', false)` — has no effect on a Plate editor; only
 * `editor.tf.withoutSaving` does. `Range.end` is the one exception: `RangeApi`
 * spreads `slate`'s `Range` verbatim, so importing it directly is equivalent
 * and there is no `editor.api` wrapper for it.
 */

import { Range, type Point } from 'slate';
import {
  LiveTranscriber,
  isTranscriptionSupported,
  type TranscriberEngine,
} from 'use-voice-control/client';

import type { PlateEditor } from 'platejs/react';

export { isTranscriptionSupported };

export interface TranscribeControllerOptions {
  /** Which recognizer to use: browser-native, on-device Moonshine, or auto. */
  engine?: TranscriberEngine;
  /** BCP-47 language tag for the browser recognizer. */
  language?: string;
  /** Moonshine model name, used when that engine is selected. */
  model?: string;
}

export interface TranscribeState {
  listening: boolean;
  /** The phrase currently being spoken; empty between phrases. */
  partial: string;
  /** The most recent thing heard, partial or settled. */
  lastPhrase: string;
  /** Increments on every `lastPhrase` update so repeats still re-trigger the UI. */
  phraseId: number;
  error: Error | null;
}

export interface TranscribeController {
  start(): void;
  stop(): void;
  toggle(): void;
  getState(): TranscribeState;
  subscribe(listener: () => void): () => void;
}

/** In-progress phrase's document range, plus the leading space it was given. */
interface InterimRange {
  anchor: Point;
  focus: Point;
  prefix: string;
}

const controllers = new WeakMap<PlateEditor, TranscribeController>();

/** A phrase starting straight after a word needs a space in front of it. */
function needsLeadingSpace(editor: PlateEditor, point: Point): boolean {
  const before = editor.api.before(point, { unit: 'character' });
  if (!before) return false;

  const text = editor.api.string({ anchor: before, focus: point });
  return text.length > 0 && !/\s/.test(text);
}

function currentPoint(editor: PlateEditor): Point {
  if (editor.selection) return Range.end(editor.selection);
  return editor.api.end([]);
}

/** Writes and history-tracking follow `Transcribe.ts`'s `writeInterim`/`commitPhrase`. */
function createController(
  editor: PlateEditor,
  options: TranscribeControllerOptions,
): TranscribeController {
  const state: TranscribeState = {
    listening: false,
    partial: '',
    lastPhrase: '',
    phraseId: 0,
    error: null,
  };

  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((listener) => listener());

  let interim: InterimRange | null = null;
  let transcriber: LiveTranscriber | null = null;

  /** Removes the stored interim range from the document without touching history. */
  function clearInterim(): void {
    if (!interim) return;
    const range = { anchor: interim.anchor, focus: interim.focus };
    interim = null;

    editor.tf.withoutSaving(() => {
      editor.tf.select(range);
      editor.tf.delete();
    });
  }

  /** Rewrites the in-progress phrase at the cursor, replacing whatever it wrote last. */
  function writeInterim(text: string): void {
    editor.tf.withoutSaving(() => {
      const at = interim ? interim.anchor : currentPoint(editor);
      const prefix = interim ? interim.prefix : needsLeadingSpace(editor, at) ? ' ' : '';

      if (interim) {
        editor.tf.select({ anchor: interim.anchor, focus: interim.focus });
        editor.tf.delete();
      }

      if (!text) {
        interim = null;
        return;
      }

      editor.tf.select(at);
      editor.tf.insertText(`${prefix}${text}`);

      const end = editor.selection ? Range.end(editor.selection) : at;
      interim = { anchor: at, focus: end, prefix };
    });
  }

  /** Replaces the in-progress phrase with the settled one, recorded as one undo step. */
  function commitPhrase(text: string): void {
    const existing = interim;
    interim = null;

    const at = existing
      ? existing.anchor
      : currentPoint(editor);
    const prefix = existing ? existing.prefix : needsLeadingSpace(editor, at) ? ' ' : '';

    if (existing) {
      editor.tf.withoutSaving(() => {
        editor.tf.select({ anchor: existing.anchor, focus: existing.focus });
        editor.tf.delete();
      });
    }

    editor.tf.select(at);
    editor.tf.insertText(`${prefix}${text} `);
  }

  /** Built lazily so the recognizer is never asked for a microphone until dictation starts. */
  function ensureTranscriber(): LiveTranscriber {
    if (transcriber) return transcriber;

    transcriber = new LiveTranscriber({
      engine: options.engine ?? 'auto',
      language: options.language ?? 'en-US',
      model: options.model ?? 'model/small',
      onStateChange: (listening) => {
        state.listening = listening;
        notify();
      },
      onPartial: (text) => {
        state.partial = text;
        if (text) {
          state.lastPhrase = text;
          state.phraseId += 1;
        }
        writeInterim(text);
        notify();
      },
      onCommit: (text) => {
        state.partial = '';
        state.lastPhrase = text;
        state.phraseId += 1;
        commitPhrase(text);
        notify();
      },
      onError: (error) => {
        state.error = error;
        notify();
      },
    });

    return transcriber;
  }

  function start(): void {
    const t = ensureTranscriber();
    if (t.isListening()) return;

    state.error = null;
    if (!editor.selection) editor.tf.focus();
    void t.start();
  }

  function stop(): void {
    if (!transcriber) return;
    void transcriber.stop();

    // Drop the half-heard phrase rather than leaving a guess in the text.
    clearInterim();
    state.partial = '';
    notify();
  }

  function toggle(): void {
    if (transcriber?.isListening()) stop();
    else start();
  }

  return {
    start,
    stop,
    toggle,
    getState: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

/** One controller per editor instance, created on first use and cached for its lifetime. */
export function getTranscribeController(
  editor: PlateEditor,
  options: TranscribeControllerOptions = {},
): TranscribeController {
  let controller = controllers.get(editor);
  if (!controller) {
    controller = createController(editor, options);
    controllers.set(editor, controller);
  }

  return controller;
}
