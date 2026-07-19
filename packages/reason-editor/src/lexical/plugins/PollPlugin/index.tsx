/**
 * @fileoverview Plugin that handles the creation and insertion of poll nodes.
 * Includes a dialog for user input and registers the INSERT_POLL_COMMAND.
 */


import type { JSX } from 'react';

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $wrapNodeInElement } from '@lexical/utils';
import {
  $createParagraphNode,
  $insertNodes,
  $isRootOrShadowRoot,
  COMMAND_PRIORITY_EDITOR,
  createCommand,
  LexicalCommand,
  LexicalEditor,
} from 'lexical';
import { useEffect, useState } from 'react';
import * as React from 'react';

import {
  $createPollNode,
  createPollOption,
  PollNode,
} from '../../nodes/PollNode';
import Button from '../../ui/Button';
import { DialogActions } from '../../ui/Dialog';
import TextInput from '../../ui/TextInput';

export const INSERT_POLL_COMMAND: LexicalCommand<string> = createCommand(
  'INSERT_POLL_COMMAND',
);

/**
 * Dialog for configuring and inserting a new poll.
 * @param {Object} props - Component props.
 * @param {LexicalEditor} props.activeEditor - The current editor instance.
 * @param {() => void} props.onClose - Callback to close the dialog.
 * @returns {JSX.Element} The rendered poll insertion dialog.
 */
export function InsertPollDialog({
  activeEditor,
  onClose,
}: {
  activeEditor: LexicalEditor;
  onClose: () => void;
}): JSX.Element {
  const [question, setQuestion] = useState('');

  const onClick = () => {
    activeEditor.dispatchCommand(INSERT_POLL_COMMAND, question);
    onClose();
  };

  return (
    <>
      <TextInput label="Question" onChange={setQuestion} value={question} />
      <DialogActions>
        <Button disabled={question.trim() === ''} onClick={onClick}>
          Confirm
        </Button>
      </DialogActions>
    </>
  );
}

/**
 * Plugin that enables poll support in the editor.
 * @returns {null} This plugin doesn't render any UI directly.
 * @throws {Error} If PollNode is not registered on the editor.
 */
export default function PollPlugin(): JSX.Element | null {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    if (!editor.hasNodes([PollNode])) {
      throw new Error('PollPlugin: PollNode not registered on editor');
    }

    return editor.registerCommand<string>(
      INSERT_POLL_COMMAND,
      (payload) => {
        const pollNode = $createPollNode(payload, [
          createPollOption(),
          createPollOption(),
        ]);
        $insertNodes([pollNode]);
        if ($isRootOrShadowRoot(pollNode.getParentOrThrow())) {
          $wrapNodeInElement(pollNode, $createParagraphNode).selectEnd();
        }

        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    );
  }, [editor]);
  return null;
}
