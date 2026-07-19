/**
 * @fileoverview Plugin that handles the insertion of page break nodes.
 * Registers the INSERT_PAGE_BREAK command and manages node insertion logic.
 */


import type { JSX } from 'react';

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $insertNodeToNearestRoot, mergeRegister } from '@lexical/utils';
import {
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_EDITOR,
  createCommand,
  LexicalCommand,
} from 'lexical';
import { useEffect } from 'react';

import { $createPageBreakNode, PageBreakNode } from '../../nodes/PageBreakNode';

export const INSERT_PAGE_BREAK: LexicalCommand<undefined> = createCommand();

/**
 * Plugin that enables page break support in the editor.
 * @returns {null} This plugin doesn't render any UI directly.
 * @throws {Error} If PageBreakNode is not registered on the editor.
 */
export default function PageBreakPlugin(): JSX.Element | null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([PageBreakNode])) {
      throw new Error(
        'PageBreakPlugin: PageBreakNode is not registered on editor',
      );
    }

    return mergeRegister(
      editor.registerCommand(
        INSERT_PAGE_BREAK,
        () => {
          const selection = $getSelection();

          if (!$isRangeSelection(selection)) {
            return false;
          }

          const focusNode = selection.focus.getNode();
          if (focusNode !== null) {
            const pgBreak = $createPageBreakNode();
            $insertNodeToNearestRoot(pgBreak);
          }

          return true;
        },
        COMMAND_PRIORITY_EDITOR,
      ),
    );
  }, [editor]);

  return null;
}
