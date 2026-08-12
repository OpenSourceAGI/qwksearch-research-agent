/**
 * React binding for the ReadAloud extension's playback state.
 *
 * Playback lives in the extension's storage so every entry point (toolbar, command,
 * shortcut) drives one utterance; this hook subscribes a component to that store
 * and re-renders it whenever the state or the chunk being spoken changes.
 */

import { useCallback, useSyncExternalStore } from 'react';
import type { Editor } from '@tiptap/core';
import type { ReadAloudChunk, ReadAloudState } from 'use-voice-control/client';

import { getReadAloudStorage, subscribeReadAloud } from '../ReadAloud';

export interface ReadAloudSnapshot {
  /** False when the ReadAloud extension is not registered on this editor. */
  available: boolean;
  state: ReadAloudState;
  isActive: boolean;
  isSpeaking: boolean;
  isPaused: boolean;
  currentChunk: ReadAloudChunk | null;
  error: Error | null;
}

const IDLE: ReadAloudSnapshot = {
  available: false,
  state: 'idle',
  isActive: false,
  isSpeaking: false,
  isPaused: false,
  currentChunk: null,
  error: null,
};

export function useReadAloudState(editor: Editor | null): ReadAloudSnapshot {
  const subscribe = useCallback(
    (listener: () => void) => (editor ? subscribeReadAloud(editor, listener) : () => undefined),
    [editor]
  );

  // `useSyncExternalStore` compares snapshots by identity, so the pieces that
  // actually change are serialized into a string and the object is rebuilt from
  // it — cheaper than memoizing a new object on every notification.
  const key = useSyncExternalStore(
    subscribe,
    () => {
      const storage = editor ? getReadAloudStorage(editor) : undefined;
      if (!storage) return 'none';
      return `${storage.state}|${storage.currentChunk?.index ?? -1}|${storage.error?.message ?? ''}`;
    },
    () => 'none'
  );

  if (key === 'none' || !editor) return IDLE;

  const storage = getReadAloudStorage(editor);
  if (!storage) return IDLE;

  return {
    available: true,
    state: storage.state,
    isActive: storage.state !== 'idle',
    isSpeaking: storage.state === 'speaking',
    isPaused: storage.state === 'paused',
    currentChunk: storage.currentChunk,
    error: storage.error,
  };
}
