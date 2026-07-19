/**
 * @fileoverview Context for editor-level callbacks (invite, share, etc.)
 * Allows toolbar and other components to trigger actions defined at the app level.
 */

import { createContext, ReactNode, useContext } from 'react';

interface EditorCallbacksContextType {
  onInviteClick?: () => void;
  onShareClick?: () => void;
  documentTitle?: string;
  documentId?: string;
}

const EditorCallbacksContext = createContext<EditorCallbacksContextType>({});

export function EditorCallbacksProvider({
  children,
  onInviteClick,
  onShareClick,
  documentTitle,
  documentId,
}: {
  children: ReactNode;
  onInviteClick?: () => void;
  onShareClick?: () => void;
  documentTitle?: string;
  documentId?: string;
}) {
  return (
    <EditorCallbacksContext.Provider value={{ onInviteClick, onShareClick, documentTitle, documentId }}>
      {children}
    </EditorCallbacksContext.Provider>
  );
}

export function useEditorCallbacks() {
  return useContext(EditorCallbacksContext);
}
