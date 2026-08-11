/**
 * The Plate version of the Reason Editor.
 *
 * Everything below the toolbar is the Plate starter: its plugin kits, node
 * components, floating link/media controls, and slash menu. Above it sits the
 * *same* `ReasonToolbar` the Tiptap route renders — Plate's own fixed toolbar is
 * deliberately not mounted, because the toolbar is the product contract and must
 * not fork per engine.
 *
 * Collaboration follows Plate's Yjs contract: `skipInitialization: true` at
 * construction, an explicit `yjs.init()` after mount, and `yjs.destroy()` on
 * unmount.
 */

'use client';

import * as React from 'react';

import { YjsPlugin } from '@platejs/yjs/react';
import { type Value } from 'platejs';
import { Plate, usePlateEditor } from 'platejs/react';

import {
  collaborationRoom,
  cursorColorFor,
  plateYjsProviders,
} from '../collaboration/hocuspocus-client';
import { createNullAdapter, type EditorToolbarAdapter } from '../shared/editor-types';
import { ReasonToolbar } from '../shared/toolbar-renderer';
import { createPlateAdapter } from './plate-adapter';
import { EMPTY_PLATE_VALUE, platePlugins } from './plate-editor-config';
import { RemoteCursorOverlay } from './remote-cursor-overlay';
import { Editor, EditorContainer } from './ui/editor';

export interface ReasonPlateEditorProps {
  documentId: string;
  /**
   * Seed value for a brand-new room. Once a room has persisted content this is
   * ignored — the Yjs document is the source of truth.
   */
  initialValue?: Value;
  user: { id: string; name: string; color?: string };
  /** Session token handed to Hocuspocus. Collaboration is off when omitted. */
  authToken?: string;
  className?: string;
}

export function ReasonPlateEditor({
  documentId,
  initialValue = EMPTY_PLATE_VALUE as Value,
  user,
  authToken,
  className,
}: ReasonPlateEditorProps) {
  const room = collaborationRoom('plate', documentId);
  const color = user.color ?? cursorColorFor(user.id);
  const collaborative = Boolean(authToken);

  const editor = usePlateEditor(
    {
      plugins: collaborative
        ? [
            ...platePlugins,
            YjsPlugin.configure({
              options: {
                cursors: {
                  data: { color, name: user.name },
                },
                providers: plateYjsProviders({
                  documentId,
                  token: authToken as string,
                }),
              },
              render: { afterEditable: RemoteCursorOverlay },
            }),
          ]
        : platePlugins,
      // Yjs owns the initial document once collaboration is on; seeding the
      // editor locally first would produce a duplicated document on sync.
      skipInitialization: collaborative,
      value: collaborative ? undefined : initialValue,
    },
    // Rebuild when the room or the credential changes, so the editor never
    // keeps a provider pointed at a document the user no longer has open.
    [room, collaborative],
  );

  React.useEffect(() => {
    if (!collaborative) return;

    void editor.getApi(YjsPlugin).yjs.init({
      id: room,
      value: initialValue,
    });

    return () => {
      editor.getApi(YjsPlugin).yjs.destroy();
    };
    // `initialValue` only seeds an empty room, so re-running on its identity
    // would tear the connection down for no reason.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collaborative, editor, room]);

  const [, forceRender] = React.useReducer((n: number) => n + 1, 0);

  // The adapter closes over the editor instance; re-created only when the
  // editor itself is rebuilt.
  const adapter = React.useMemo<EditorToolbarAdapter>(
    () => (editor ? createPlateAdapter(editor) : createNullAdapter('plate')),
    [editor],
  );

  // Plate reports readiness asynchronously when Yjs is in play; nudge a render
  // once the editor exists so the toolbar picks up its real enabled state.
  React.useEffect(() => {
    forceRender();
  }, [editor]);

  return (
    <div className={`flex h-full min-h-0 w-full flex-col ${className ?? ''}`} data-room={room}>
      <Plate editor={editor}>
        <ReasonToolbar adapter={adapter} />
        {/* Positioned container so the remote cursor overlay can absolutely
            position carets and selection rects over the editable area. */}
        <EditorContainer className="relative min-h-0 flex-1">
          <Editor placeholder="Start writing…" variant="default" />
        </EditorContainer>
      </Plate>
    </div>
  );
}

export default ReasonPlateEditor;
