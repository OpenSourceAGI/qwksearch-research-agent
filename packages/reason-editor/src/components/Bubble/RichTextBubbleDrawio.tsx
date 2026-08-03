/**
 * Floating bubble menu shown when a drawio element is selected in the editor. Presents contextual formatting and actions inline near the selection.
 */

import { BubbleMenu } from '@tiptap/react/menus';
import { useCallback, useEffect } from 'react';

import { ActionButton } from '@/components/ActionButton';
import { emit } from '@/components/ReactBus';
import { SizeSetter } from '@/components/SizeSetter/SizeSetter';
import { Drawio } from '@/extensions/Drawio';
import { useAttributes } from '@/hooks/useAttributes';
import { useLocale } from '@/locales';
import { useEditorInstance } from '@/store/editor';
import { useEditableEditor } from '@/store/store';
import { EVENTS } from '@/utils/customEvents/events.constant';
import { deleteNode } from '@/utils/delete-node';
import { getEditorContainerDOMSize } from '@/utils/editor-container-size';

import type { IDrawioAttrs } from '@/extensions/Drawio';

export function RichTextBubbleDrawio() {
  const editable = useEditableEditor();
  const editor = useEditorInstance();

  const { t } = useLocale();
  const { width: maxWidth } = getEditorContainerDOMSize(editor);
  const attrs = useAttributes<IDrawioAttrs>(editor, Drawio.name, {
    defaultShowPicker: false,
    createUser: '',
    width: 0,
    height: 0,
  });
  const { defaultShowPicker, createUser, width, height } = attrs;

  const setSize = useCallback(
    (size: any) => {
      editor
        .chain()
        .updateAttributes(Drawio.name, size)
        .setNodeSelection(editor.state.selection.from)
        .focus()
        .run();
    },
    [editor]
  );

  const openEditLinkModal = useCallback(() => {
    const EVENT_ID = EVENTS.DRAWIO?.((editor as any).id) || `drawio-${(editor as any).id}`;
    emit(EVENT_ID, attrs);
  }, [editor, attrs]);

  const shouldShow = useCallback(() => editor.isActive(Drawio.name), [editor]);
  const deleteMe = useCallback(() => deleteNode(Drawio.name, editor), [editor]);

  useEffect(() => {
    if (defaultShowPicker) {
      openEditLinkModal();
      editor.chain().updateAttributes(Drawio.name, { defaultShowPicker: false }).focus().run();
    }
  }, [createUser, defaultShowPicker, editor, openEditLinkModal]);

  if (!editable) {
    return <></>;
  }

  return (
    <BubbleMenu
      editor={editor}
      options={{ placement: 'bottom', offset: 8, flip: true }}
      pluginKey={'RichTextBubbleDrawio'}
      shouldShow={shouldShow}
    >
      <div className='richtext-flex richtext-items-center richtext-gap-2 richtext-rounded-md !richtext-border !richtext-border-solid !richtext-border-border richtext-bg-popover richtext-p-1 richtext-text-popover-foreground richtext-shadow-md richtext-outline-none'>
        <ActionButton action={openEditLinkModal} icon='Pencil' tooltip={t('editor.edit')} />

        <SizeSetter height={height as any} maxWidth={maxWidth} onOk={setSize} width={width as any}>
          <ActionButton icon='Settings' tooltip={t('editor.settings')} />
        </SizeSetter>

        <ActionButton action={deleteMe} icon='Trash2' tooltip={t('editor.delete')} />
      </div>
    </BubbleMenu>
  );
}
