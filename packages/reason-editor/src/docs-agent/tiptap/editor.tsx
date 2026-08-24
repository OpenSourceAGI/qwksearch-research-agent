/**
 * The Tiptap version of the Reason Editor — the control implementation.
 *
 * It mounts the package's existing Tiptap stack unchanged (`buildExtensions()`
 * over `src/extensions/*`, mounted through `NovelEditor`) and renders the
 * *shared* toolbar above it instead of `editor-views/components/Toolbar.tsx`.
 * That is the whole point of the comparison: same schema, same renderer, only
 * the adapter differs.
 */

'use client';

import * as React from 'react';

import { Collaboration } from '@tiptap/extension-collaboration';
import { CollaborationCaret } from '@tiptap/extension-collaboration-caret';

import type { Editor } from '@tiptap/core';

import { buildExtensions, createDefaultConfig } from '@/editor-views/config/editorConfig';
import { NovelEditor } from '@/novel/NovelEditor';

import {
  collaborationRoom,
  createCollaborationSession,
  cursorColorFor,
  type CollaborationSession,
} from '../collaboration/hocuspocus-client';
import { createNullAdapter, type EditorToolbarAdapter } from '../shared/editor-types';
import { ReasonToolbar } from '../shared/toolbar-renderer';
import { createTiptapAdapter } from './editor-adapter';

export interface ReasonTiptapEditorProps {
  documentId: string;
  /** Initial HTML, used only when the collaboration room is still empty. */
  initialContent?: string;
  user: { id: string; name: string; color?: string };
  /** Session token handed to Hocuspocus. Collaboration is off when omitted. */
  authToken?: string;
  className?: string;
}

/**
 * Tiptap's history extension must give way to the Yjs undo manager once
 * collaboration is on, otherwise local undo rewrites remote edits.
 */
function withCollaboration(
  extensions: any[],
  session: CollaborationSession,
  user: { name: string; color: string },
) {
  return [
    ...extensions.filter((extension) => extension?.name !== 'undoRedo'),
    Collaboration.configure({ document: session.ydoc }),
    CollaborationCaret.configure({ provider: session.provider, user }),
  ];
}

export function ReasonTiptapEditor({
  documentId,
  initialContent = '',
  user,
  authToken,
  className,
}: ReasonTiptapEditorProps) {
  const [editor, setEditor] = React.useState<Editor | null>(null);
  const [session, setSession] = React.useState<CollaborationSession | null>(null);

  const room = collaborationRoom('tiptap', documentId);
  const color = user.color ?? cursorColorFor(user.id);

  React.useEffect(() => {
    if (!authToken) return;

    const next = createCollaborationSession({
      engine: 'tiptap',
      documentId,
      token: authToken,
    });
    setSession(next);

    return () => {
      setSession(null);
      next.destroy();
    };
  }, [authToken, documentId]);

  const extensions = React.useMemo(() => {
    const base = buildExtensions(createDefaultConfig());
    if (!session) return base;

    return withCollaboration(base, session, { name: user.name, color });
  }, [session, user.name, color]);

  // The adapter is derived from the live editor; while it is still mounting the
  // toolbar renders from a null adapter so its layout never flickers.
  const adapter = React.useMemo<EditorToolbarAdapter>(
    () => (editor ? createTiptapAdapter(editor) : createNullAdapter('tiptap')),
    [editor],
  );

  return (
    <div className={`flex h-full min-h-0 w-full flex-col ${className ?? ''}`} data-room={room}>
      <NovelEditor
        className="flex min-h-0 flex-1 flex-col"
        extensions={extensions}
        immediatelyRender={false}
        initialContent={session ? undefined : initialContent}
        onEditor={setEditor}
        // Remount when collaboration attaches, so the Yjs-backed schema replaces
        // the local-history one instead of layering on top of it.
        rebuildKey={session ? `collab:${room}` : 'local'}
        textDirection="auto"
      >
        {({ EditorSurface }) => (
          <>
            <ReasonToolbar adapter={adapter} />
            <div className="relative min-h-0 flex-1 overflow-auto">
              <EditorSurface className="h-full" />
            </div>
          </>
        )}
      </NovelEditor>
    </div>
  );
}

export default ReasonTiptapEditor;
