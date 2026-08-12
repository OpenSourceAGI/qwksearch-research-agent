/**
 * React binding for the Transcribe extension's dictation state.
 *
 * The microphone session lives in the extension's storage so every entry point
 * drives one session; this hook subscribes a component to that store and re-renders
 * it as phrases arrive, exposing the `lastPhrase`/`phraseId` pair that the
 * on-screen phrase display reads.
 */

import { useCallback, useSyncExternalStore } from 'react';
import type { Editor } from '@tiptap/core';

import { getTranscribeStorage, subscribeTranscribe } from '../Transcribe';

export interface TranscribeSnapshot {
  /** False when the Transcribe extension is not registered on this editor. */
  available: boolean;
  isListening: boolean;
  /** The phrase currently being spoken; empty between phrases. */
  partial: string;
  /** The most recent thing heard, partial or settled. */
  lastPhrase: string;
  /** Increments on every `lastPhrase` update, repeats included. */
  phraseId: number;
  error: Error | null;
}

const IDLE: TranscribeSnapshot = {
  available: false,
  isListening: false,
  partial: '',
  lastPhrase: '',
  phraseId: 0,
  error: null,
};

export function useTranscribeState(editor: Editor | null): TranscribeSnapshot {
  const subscribe = useCallback(
    (listener: () => void) => (editor ? subscribeTranscribe(editor, listener) : () => undefined),
    [editor]
  );

  // Snapshots are compared by identity, so track a cheap string key and rebuild
  // the object from storage only when something has actually moved.
  const key = useSyncExternalStore(
    subscribe,
    () => {
      const storage = editor ? getTranscribeStorage(editor) : undefined;
      if (!storage) return 'none';
      return `${storage.listening}|${storage.phraseId}|${storage.error?.message ?? ''}`;
    },
    () => 'none'
  );

  if (key === 'none' || !editor) return IDLE;

  const storage = getTranscribeStorage(editor);
  if (!storage) return IDLE;

  return {
    available: true,
    isListening: storage.listening,
    partial: storage.partial,
    lastPhrase: storage.lastPhrase,
    phraseId: storage.phraseId,
    error: storage.error,
  };
}
