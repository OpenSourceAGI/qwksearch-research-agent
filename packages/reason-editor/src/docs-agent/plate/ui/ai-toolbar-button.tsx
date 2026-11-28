'use client';

/**
 * "Ask AI" — the bubble menu's entry into the writing assistant, and the same
 * button the fixed toolbar can carry. Opens the panel in `./ai-menu.tsx` over
 * whatever is selected; `⌘/Ctrl + J` does the same thing from the keyboard.
 *
 * `data-plate-focus` follows `./link-toolbar-button.tsx`: the click must not
 * count as leaving the editor, or the selection the request is about would be
 * gone by the time the panel opens.
 */

import * as React from 'react';

import { SparklesIcon } from 'lucide-react';
import { useEditorRef } from 'platejs/react';

import { getPlateAiController } from '../ai-controller';

import { ToolbarButton } from './toolbar';

export function AIToolbarButton(props: React.ComponentProps<typeof ToolbarButton>) {
  const editor = useEditorRef();

  return (
    <ToolbarButton
      {...props}
      data-plate-focus
      onClick={() => getPlateAiController(editor).open()}
      onMouseDown={(event) => event.preventDefault()}
      toolbarId="ask-ai"
    >
      <SparklesIcon />
      {props.children}
    </ToolbarButton>
  );
}
