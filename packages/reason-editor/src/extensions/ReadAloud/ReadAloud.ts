/**
 * Defines the ReadAloud Tiptap extension, which speaks the document out loud. It
 * reads the current selection when there is one and the whole document otherwise,
 * driving playback through `use-voice-control`'s `ReadAloudController` (Kokoro by
 * default, with the browser's own synthesizer as a fallback).
 *
 * Playback state lives in the extension's storage rather than in a React component,
 * so the toolbar, a slash command and a keyboard shortcut all control one shared
 * utterance. `subscribeReadAloud` lets UI subscribe to that state.
 */

import { type Editor, Extension } from '@tiptap/core';
import {
  ReadAloudController,
  type ReadAloudChunk,
  type ReadAloudState,
  type TTSProvider,
} from 'use-voice-control/client';

import type { GeneralOptions } from '@/types';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    readAloud: {
      /** Speak the selection, or the whole document when nothing is selected. */
      readAloud: () => ReturnType;
      /** Stop playback and drop anything still queued. */
      stopReadAloud: () => ReturnType;
      /** Start speaking, or stop if already speaking. */
      toggleReadAloud: () => ReturnType;
      /** Pause playback, keeping the queue intact. */
      pauseReadAloud: () => ReturnType;
      /** Resume paused playback. */
      resumeReadAloud: () => ReturnType;
    };
  }
}

export interface ReadAloudOptions extends GeneralOptions<ReadAloudOptions> {
  /** TTS provider to synthesize with. */
  provider: TTSProvider;
  /** Provider-specific voice id. */
  voice: string;
  /** HTTP route that turns text into audio. */
  endpoint: string;
  /**
   * Target size of each synthesized chunk, in characters. Playback starts after
   * the first chunk, so a smaller value means the document starts talking sooner.
   */
  maxChunkLength: number;
}

export interface ReadAloudStorage {
  controller: ReadAloudController | null;
  state: ReadAloudState;
  /** The chunk currently being spoken, or `null` between utterances. */
  currentChunk: ReadAloudChunk | null;
  error: Error | null;
  /** UI subscribers, notified on every state or chunk change. */
  listeners: Set<() => void>;
}

/** Text the tool would speak right now: the selection, else the whole document. */
export function getReadAloudText(editor: Editor): string {
  const { from, to, empty } = editor.state.selection;
  // Blank lines between blocks keep the synthesizer from running paragraphs
  // together into one breathless sentence.
  const range = empty ? { from: 0, to: editor.state.doc.content.size } : { from, to };
  return editor.state.doc.textBetween(range.from, range.to, '\n\n', ' ').trim();
}

/** Whether the current selection (rather than the whole document) would be read. */
export function isReadAloudSelectionScoped(editor: Editor): boolean {
  return !editor.state.selection.empty;
}

function getStorage(editor: Editor): ReadAloudStorage | undefined {
  return (editor.storage as any)?.readAloud;
}

export function getReadAloudStorage(editor: Editor): ReadAloudStorage | undefined {
  return getStorage(editor);
}

/**
 * Subscribe to playback state. Returns an unsubscribe function, so it pairs
 * directly with React's `useSyncExternalStore`.
 */
export function subscribeReadAloud(editor: Editor, listener: () => void): () => void {
  const storage = getStorage(editor);
  if (!storage) return () => undefined;
  storage.listeners.add(listener);
  return () => storage.listeners.delete(listener);
}

/**
 * The playback controller, built on first use. Creating it lazily rather than in
 * `onCreate` keeps it available to a command fired the instant the editor mounts —
 * Tiptap emits `create` a tick later — and avoids spinning one up for a document
 * that is never read aloud.
 */
function ensureController(
  storage: ReadAloudStorage,
  options: ReadAloudOptions
): ReadAloudController {
  if (storage.controller) return storage.controller;

  const notify = () => storage.listeners.forEach((listener) => listener());

  storage.controller = new ReadAloudController({
    provider: options.provider,
    voice: options.voice,
    endpoint: options.endpoint,
    maxChunkLength: options.maxChunkLength,
    onStateChange: (state) => {
      storage.state = state;
      notify();
    },
    onChunk: (chunk) => {
      storage.currentChunk = chunk;
      notify();
    },
    onEnd: () => {
      storage.currentChunk = null;
      notify();
    },
    onError: (error) => {
      storage.error = error;
      notify();
    },
  });

  return storage.controller;
}

export const ReadAloud = Extension.create<ReadAloudOptions, ReadAloudStorage>({
  name: 'readAloud',

  //@ts-expect-error — `button` is supplied by GeneralOptions' parent defaults
  addOptions() {
    return {
      ...this.parent?.(),
      provider: 'kokoro',
      voice: 'af_heart',
      endpoint: '/api/speech/tts',
      maxChunkLength: 240,
      button: ({ editor, t }) => ({
        componentProps: {
          action: () => {
            (editor.commands as any).toggleReadAloud?.();
          },
          icon: 'Volume2',
          tooltip: t('editor.readAloud.tooltip'),
          isActive: () => getStorage(editor as Editor)?.state !== 'idle',
          disabled: false,
        },
      }),
    };
  },

  addStorage() {
    return {
      controller: null,
      state: 'idle',
      currentChunk: null,
      error: null,
      listeners: new Set(),
    };
  },

  onDestroy() {
    this.storage.controller?.stop();
    this.storage.controller = null;
    this.storage.listeners.clear();
  },

  addCommands() {
    return {
      readAloud:
        () =>
        ({ editor }) => {
          const text = getReadAloudText(editor as Editor);
          if (!text) return false;

          this.storage.error = null;
          void ensureController(this.storage, this.options).speak(text);
          return true;
        },

      stopReadAloud: () => () => {
        this.storage.controller?.stop();
        return true;
      },

      toggleReadAloud:
        () =>
        ({ commands }) => {
          if (this.storage.controller?.isActive()) {
            this.storage.controller.stop();
            return true;
          }
          return commands.readAloud();
        },

      pauseReadAloud: () => () => {
        this.storage.controller?.pause();
        return true;
      },

      resumeReadAloud: () => () => {
        this.storage.controller?.resume();
        return true;
      },
    };
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Shift-s': () => this.editor.commands.toggleReadAloud(),
    };
  },
});
