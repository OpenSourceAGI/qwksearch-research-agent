'use client';

import * as React from 'react';

import { MicIcon } from 'lucide-react';
import { useEditorRef } from 'platejs/react';

import {
  getTranscribeController,
  isTranscriptionSupported,
} from '@/docs-agent/plate/transcribe-controller';

import { ToolbarButton } from './toolbar';

/**
 * REASON's Dictate toggle in playground clothing — the same voice-commands
 * plugin the shared toolbar drives through `plate-adapter`'s `transcribe`
 * command, so both toolbars start and stop the one controller per editor.
 */
export function TranscribeToolbarButton(
  props: React.ComponentProps<typeof ToolbarButton>,
) {
  const editor = useEditorRef();
  const controller = React.useMemo(
    () => getTranscribeController(editor),
    [editor],
  );

  const listening = React.useSyncExternalStore(
    controller.subscribe,
    () => controller.getState().listening,
    () => false,
  );

  const supported = isTranscriptionSupported();

  return (
    <ToolbarButton
      aria-label="Dictate"
      {...props}
      disabled={!supported}
      onClick={() => controller.toggle()}
      pressed={listening}
      {...(supported
        ? { toolbarId: 'transcribe' }
        : { tooltip: 'Dictation is unavailable in this browser' })}
    >
      <MicIcon />
    </ToolbarButton>
  );
}
