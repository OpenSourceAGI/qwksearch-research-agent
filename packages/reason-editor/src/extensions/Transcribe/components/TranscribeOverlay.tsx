/**
 * Renders the phrase that was just dictated in large type at the centre of the
 * screen, fading out two seconds after the last word. Dictation types into the
 * document wherever the caret happens to be, which is easy to lose track of while
 * speaking, so this echoes what was heard where it cannot be missed.
 *
 * Mount it once alongside the editor; it draws nothing unless dictation is running.
 */

import type { Editor } from '@tiptap/core';
import { SpokenPhraseOverlay } from 'use-voice-control/react';

import { useTranscribeState } from '@/extensions/Transcribe/hooks/useTranscribeState';

export interface TranscribeOverlayProps {
  editor: Editor | null;
  /** How long the phrase stays up after the last update. Default 2000ms. */
  durationMs?: number;
}

export function TranscribeOverlay({ editor, durationMs = 2000 }: TranscribeOverlayProps) {
  const { isListening, lastPhrase, phraseId } = useTranscribeState(editor);

  return (
    <SpokenPhraseOverlay
      durationMs={durationMs}
      phrase={lastPhrase}
      phraseId={phraseId}
      visible={isListening}
    />
  );
}
