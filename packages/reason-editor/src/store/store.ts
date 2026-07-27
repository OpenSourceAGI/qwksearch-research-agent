/**
 * Global reactive store tracking whether the editor is currently editable. Exposes hooks so any component can read or update the editable state.
 */

import { createSignal, useSetSignal, useSignalValue } from 'reactjs-signal';

const editableEditorSignal = createSignal<boolean>(false);

function useEditableEditor() {
  return useSignalValue(editableEditorSignal);
}

function useStoreEditableEditor() {
  return useSetSignal(editableEditorSignal);
}

export { useStoreEditableEditor, useEditableEditor };
