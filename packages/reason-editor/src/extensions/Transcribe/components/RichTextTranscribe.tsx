/**
 * Toolbar control (React) for the Transcribe extension, which types dictated speech
 * into the document at the cursor. The button toggles the microphone and reflects
 * the live listening state from the extension's storage; the phrase overlay that
 * accompanies dictation is rendered by `TranscribeOverlay`.
 */

import { useCurrentEditor } from '@tiptap/react';

import { ActionButton } from '@/components';
import { Transcribe, isTranscriptionSupported } from '@/extensions/Transcribe';
import { useTranscribeState } from '@/extensions/Transcribe/hooks/useTranscribeState';
import { useButtonProps } from '@/hooks/useButtonProps';

export function RichTextTranscribe() {
  const buttonProps = useButtonProps(Transcribe.name);
  const { editor } = useCurrentEditor();
  const { isListening } = useTranscribeState(editor ?? null);

  const {
    icon = 'Mic',
    tooltip = undefined,
    shortcutKeys = undefined,
    tooltipOptions = {},
  } = buttonProps?.componentProps ?? {};

  if (!buttonProps || !editor) {
    return <></>;
  }

  const supported = isTranscriptionSupported();

  return (
    <ActionButton
      action={() => editor.commands.toggleTranscribe()}
      dataState={isListening}
      disabled={!supported}
      icon={icon}
      shortcutKeys={shortcutKeys}
      tooltip={
        !supported
          ? 'Dictation is not supported in this browser'
          : isListening
            ? 'Stop dictation'
            : (tooltip ?? 'Dictate into the document')
      }
      tooltipOptions={tooltipOptions}
    />
  );
}
