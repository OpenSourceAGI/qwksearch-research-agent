/**
 * Defines the Transcribe Tiptap extension, which types dictated speech straight
 * into the document. It drives `use-voice-control`'s `LiveTranscriber`, writing the
 * recognizer's in-progress guess at the cursor and rewriting it in place on every
 * update, so words appear as they are being said rather than in one lump when the
 * speaker stops.
 *
 * Only settled phrases enter the undo history: the interim churn is written with
 * history disabled and removed again before the committed phrase is inserted, so a
 * single undo takes back one phrase rather than one word.
 *
 * Listening state lives in the extension's storage so the toolbar, a command and a
 * keyboard shortcut all drive one microphone session; `subscribeTranscribe` lets UI
 * follow it, including the `lastPhrase`/`phraseId` pair the on-screen phrase
 * display reads.
 */

import { type Editor, Extension } from '@tiptap/core';
import { TextSelection } from '@tiptap/pm/state';
import {
  LiveTranscriber,
  isTranscriptionSupported,
  type TranscriberEngine,
} from 'use-voice-control/client';

import type { GeneralOptions } from '@/types';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    transcribe: {
      /** Start dictating into the document at the cursor. */
      startTranscribe: () => ReturnType;
      /** Stop dictating, discarding any unfinished phrase. */
      stopTranscribe: () => ReturnType;
      /** Start dictating, or stop if already listening. */
      toggleTranscribe: () => ReturnType;
    };
  }
}

export interface TranscribeOptions extends GeneralOptions<TranscribeOptions> {
  /** Which recognizer to use: browser-native, on-device Moonshine, or auto. */
  engine: TranscriberEngine;
  /** BCP-47 language tag for the browser recognizer. */
  language: string;
  /** Moonshine model name, used when that engine is selected. */
  model: string;
}

export interface TranscribeStorage {
  transcriber: LiveTranscriber | null;
  listening: boolean;
  /** The phrase currently being spoken; empty between phrases. */
  partial: string;
  /** The most recent thing heard, partial or settled — what the overlay shows. */
  lastPhrase: string;
  /** Increments on every `lastPhrase` update so repeats still re-trigger the UI. */
  phraseId: number;
  error: Error | null;
  /** Document range holding the in-progress phrase, or `null` between phrases. */
  interimFrom: number | null;
  interimTo: number | null;
  /** Leading space inserted ahead of a phrase that starts mid-sentence. */
  interimPrefix: string;
  listeners: Set<() => void>;
}

function getStorage(editor: Editor): TranscribeStorage | undefined {
  return (editor.storage as any)?.transcribe;
}

export function getTranscribeStorage(editor: Editor): TranscribeStorage | undefined {
  return getStorage(editor);
}

/** True when this browser can dictate at all. */
export { isTranscriptionSupported };

/**
 * Subscribe to dictation state. Returns an unsubscribe function, so it pairs
 * directly with React's `useSyncExternalStore`.
 */
export function subscribeTranscribe(editor: Editor, listener: () => void): () => void {
  const storage = getStorage(editor);
  if (!storage) return () => undefined;
  storage.listeners.add(listener);
  return () => storage.listeners.delete(listener);
}

/** A phrase starting straight after a word needs a space in front of it. */
function needsLeadingSpace(editor: Editor, pos: number): boolean {
  if (pos <= 0) return false;
  const before = editor.state.doc.textBetween(Math.max(0, pos - 1), pos, '', '');
  return before.length > 0 && !/\s/.test(before);
}

/** Discard a stored range that a concurrent edit may have pushed out of the document. */
function resolveInterimRange(
  docSize: number,
  storage: TranscribeStorage
): { from: number; to: number } | null {
  const { interimFrom, interimTo } = storage;
  if (interimFrom === null || interimTo === null) return null;
  if (interimFrom > docSize || interimTo > docSize || interimFrom > interimTo) return null;
  return { from: interimFrom, to: interimTo };
}

/** Write the in-progress phrase at the cursor, replacing whatever it wrote last. */
function writeInterim(editor: Editor, storage: TranscribeStorage, text: string): void {
  const existing = resolveInterimRange(editor.state.doc.content.size, storage);

  let from: number;
  if (existing) {
    from = existing.from;
  } else {
    from = Math.min(editor.state.selection.head, editor.state.doc.content.size);
    storage.interimPrefix = needsLeadingSpace(editor, from) ? ' ' : '';
  }
  const to = existing ? existing.to : from;

  const body = `${storage.interimPrefix}${text}`;
  const tr = editor.state.tr;
  if (body) {
    tr.insertText(body, from, to);
  } else if (from !== to) {
    tr.delete(from, to);
  } else {
    return;
  }

  // Interim text is rewritten on every recognizer update; keeping it out of the
  // history means undo steps through phrases, not keystrokes.
  tr.setMeta('addToHistory', false);
  const end = Math.min(from + body.length, tr.doc.content.size);
  tr.setSelection(TextSelection.create(tr.doc, end));
  editor.view.dispatch(tr);

  storage.interimFrom = from;
  storage.interimTo = end;
}

/**
 * Replace the in-progress phrase with the settled one. The interim text is removed
 * without touching the history first, so the recorded insertion is a clean one that
 * a single undo takes back whole.
 */
function commitPhrase(editor: Editor, storage: TranscribeStorage, text: string): void {
  const prefix = storage.interimPrefix;
  const existing = resolveInterimRange(editor.state.doc.content.size, storage);

  storage.interimFrom = null;
  storage.interimTo = null;
  storage.interimPrefix = '';

  let insertAt: number;
  if (existing) {
    if (existing.from !== existing.to) {
      const clearTr = editor.state.tr.delete(existing.from, existing.to);
      clearTr.setMeta('addToHistory', false);
      editor.view.dispatch(clearTr);
    }
    insertAt = existing.from;
  } else {
    insertAt = Math.min(editor.state.selection.head, editor.state.doc.content.size);
  }

  const lead = existing ? prefix : needsLeadingSpace(editor, insertAt) ? ' ' : '';
  const body = `${lead}${text} `;
  const tr = editor.state.tr.insertText(body, insertAt, insertAt);
  const end = Math.min(insertAt + body.length, tr.doc.content.size);
  tr.setSelection(TextSelection.create(tr.doc, end));
  editor.view.dispatch(tr);
}

/**
 * The recognizer, built on first use. Creating it lazily rather than in `onCreate`
 * keeps it available to a command fired the instant the editor mounts — Tiptap
 * emits `create` a tick later — and avoids asking for a microphone in documents
 * nobody dictates into.
 */
function ensureTranscriber(
  editor: Editor,
  storage: TranscribeStorage,
  options: TranscribeOptions
): LiveTranscriber {
  if (storage.transcriber) return storage.transcriber;

  const notify = () => storage.listeners.forEach((listener) => listener());

  storage.transcriber = new LiveTranscriber({
    engine: options.engine,
    language: options.language,
    model: options.model,
    onStateChange: (listening) => {
      storage.listening = listening;
      notify();
    },
    onPartial: (text) => {
      if (editor.isDestroyed) return;
      storage.partial = text;
      if (text) {
        storage.lastPhrase = text;
        storage.phraseId += 1;
      }
      writeInterim(editor, storage, text);
      notify();
    },
    onCommit: (text) => {
      if (editor.isDestroyed) return;
      storage.partial = '';
      storage.lastPhrase = text;
      storage.phraseId += 1;
      commitPhrase(editor, storage, text);
      notify();
    },
    onError: (error) => {
      storage.error = error;
      notify();
    },
  });

  return storage.transcriber;
}

export const Transcribe = Extension.create<TranscribeOptions, TranscribeStorage>({
  name: 'transcribe',

  //@ts-expect-error — `button` is supplied by GeneralOptions' parent defaults
  addOptions() {
    return {
      ...this.parent?.(),
      engine: 'auto',
      language: 'en-US',
      model: 'model/small',
      button: ({ editor, t }) => ({
        componentProps: {
          action: () => {
            (editor.commands as any).toggleTranscribe?.();
          },
          icon: 'Mic',
          tooltip: t('editor.transcribe.tooltip'),
          isActive: () => !!getStorage(editor as Editor)?.listening,
          disabled: false,
        },
      }),
    };
  },

  addStorage() {
    return {
      transcriber: null,
      listening: false,
      partial: '',
      lastPhrase: '',
      phraseId: 0,
      error: null,
      interimFrom: null,
      interimTo: null,
      interimPrefix: '',
      listeners: new Set(),
    };
  },

  onDestroy() {
    void this.storage.transcriber?.stop();
    this.storage.transcriber = null;
    this.storage.listeners.clear();
  },

  addCommands() {
    return {
      startTranscribe:
        () =>
        ({ editor }) => {
          const transcriber = ensureTranscriber(
            editor as Editor,
            this.storage,
            this.options
          );
          if (transcriber.isListening()) return false;
          this.storage.error = null;
          // Dictation lands wherever the caret is, so make sure there is one.
          if (!editor.isFocused) editor.commands.focus();
          void transcriber.start();
          return true;
        },

      stopTranscribe:
        () =>
        ({ tr, dispatch }) => {
          const transcriber = this.storage.transcriber;
          if (!transcriber) return false;
          void transcriber.stop();

          // Drop the half-heard phrase rather than leaving a guess in the text.
          // The edit rides on the command's own transaction: dispatching a
          // separate one built from `editor.state` would be applied against a
          // state the command has already moved past.
          const range = resolveInterimRange(tr.doc.content.size, this.storage);
          if (dispatch && range && range.from !== range.to) {
            tr.delete(range.from, range.to);
            tr.setMeta('addToHistory', false);
          }

          this.storage.interimFrom = null;
          this.storage.interimTo = null;
          this.storage.interimPrefix = '';
          this.storage.partial = '';
          this.storage.listeners.forEach((listener) => listener());
          return true;
        },

      toggleTranscribe:
        () =>
        ({ commands }) => {
          return this.storage.transcriber?.isListening()
            ? commands.stopTranscribe()
            : commands.startTranscribe();
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Shift-d': () => this.editor.commands.toggleTranscribe(),
    };
  },
});
