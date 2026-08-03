/**
 * Headless component that mirrors the editor's editable state into the global store. Subscribes to editor updates so the rest of the UI reacts when editability changes.
 */

import { useEffect } from 'react';

import { useStoreEditableEditor } from '@/store/store';

export function EditorEditableReactive({ editor }: any) {
  const setEditable = useStoreEditableEditor();

  useEffect(() => {
    setEditable(editor?.isEditable);
  }, [editor?.isEditable]);

  const onEditableChange = () => {
    setEditable(editor?.isEditable);
  };

  useEffect(() => {
    if (editor) {
      editor.on('update', onEditableChange);
    }

    return () => {
      if (editor) {
        editor.off('update', onEditableChange);
      }
    };
  }, [editor]);

  return <></>;
}
