/**
 * @fileoverview Plugin for inserting emojis via a button-triggered picker.
 * Uses emoji-picker-react library for a rich emoji selection experience.
 */

import type { JSX } from 'react';

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  COMMAND_PRIORITY_EDITOR,
  createCommand,
  LexicalCommand,
  $getSelection,
  $isRangeSelection,
  $createTextNode,
} from 'lexical';
import { useEffect } from 'react';

export const INSERT_EMOJI_COMMAND: LexicalCommand<string> = createCommand(
  'INSERT_EMOJI_COMMAND',
);

/**
 * Plugin that enables emoji insertion via button click.
 * @returns {null} This plugin doesn't render any UI directly.
 */
export default function EmojiSelectorPlugin(): JSX.Element | null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand<string>(
      INSERT_EMOJI_COMMAND,
      (emoji) => {
        editor.update(() => {
          const selection = $getSelection();

          if ($isRangeSelection(selection)) {
            selection.insertNodes([$createTextNode(emoji + ' ')]);
          }
        });

        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    );
  }, [editor]);

  return null;
}