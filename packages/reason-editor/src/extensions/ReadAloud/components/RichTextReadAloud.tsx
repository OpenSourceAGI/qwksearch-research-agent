/**
 * Toolbar control (React) for the ReadAloud extension, which speaks the selection —
 * or the whole document when nothing is selected — out loud. The button doubles as
 * a stop control while audio is playing, and its active state comes from the
 * extension's storage rather than the editor's transaction stream, since playback
 * progresses without the document changing.
 */

import { useCurrentEditor } from '@tiptap/react';

import { ActionButton } from '@/components';
import { ReadAloud, getReadAloudText, isReadAloudSelectionScoped } from '@/extensions/ReadAloud';
import { useReadAloudState } from '@/extensions/ReadAloud/hooks/useReadAloudState';
import { useButtonProps } from '@/hooks/useButtonProps';

export function RichTextReadAloud() {
  const buttonProps = useButtonProps(ReadAloud.name);
  const { editor } = useCurrentEditor();
  const { isActive } = useReadAloudState(editor ?? null);

  const {
    icon = 'Volume2',
    tooltip = undefined,
    shortcutKeys = undefined,
    tooltipOptions = {},
  } = buttonProps?.componentProps ?? {};

  if (!buttonProps || !editor) {
    return <></>;
  }

  const hasText = getReadAloudText(editor).length > 0;
  const scopeLabel = isReadAloudSelectionScoped(editor) ? 'selection' : 'document';

  return (
    <ActionButton
      action={() => editor.commands.toggleReadAloud()}
      dataState={isActive}
      disabled={!isActive && !hasText}
      icon={isActive ? 'X' : icon}
      shortcutKeys={shortcutKeys}
      tooltip={isActive ? 'Stop reading' : (tooltip ?? `Read ${scopeLabel} aloud`)}
      tooltipOptions={tooltipOptions}
    />
  );
}
