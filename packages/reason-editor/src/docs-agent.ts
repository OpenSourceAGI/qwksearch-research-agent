/**
 * `react-reason-editor/docs-agent` — the dual-editor workspace.
 *
 * Two implementations of the Reason Editor sit behind one product contract:
 *
 *   - `ReasonTiptapEditor` — the existing Tiptap stack, unchanged, kept as the
 *     control version.
 *   - `ReasonPlateEditor`  — the Plate starter's editor UI and plugin set.
 *
 * Both render the same `REASON_TOOLBAR` schema through the same
 * `ReasonToolbar` renderer, and differ only in which `EditorToolbarAdapter`
 * they hand it — including the dictation button (`transcribe`), the
 * voice-commands plugin ported from the Tiptap side's `Transcribe` extension to
 * a new Plate plugin in `./docs-agent/plate/transcribe-controller.ts`. Their
 * Yjs rooms are namespaced per engine (`reason-editor:<engine>:<documentId>`)
 * because a ProseMirror document and a Slate document are not interchangeable;
 * they stay separate until there is an explicit conversion/export pipeline.
 *
 * `ReasonSidebar` (from `./docs-agent/shared`) is the third shared plugin: the
 * document navigation list both routes mount around their editor, backed by
 * the same document store the production file-tree uses.
 */

export {
  createNullAdapter,
  type EditorEngine,
  type EditorToolbarAdapter,
  type TableCommand,
  type ToolbarCommand,
  type ToolbarCommandPayload,
} from './docs-agent/shared/editor-types';
export {
  collectToolbarCommands,
  REASON_TOOLBAR,
  type ToolbarItem,
} from './docs-agent/shared/toolbar-schema';
export {
  ReasonToolbar,
  type ReasonToolbarProps,
} from './docs-agent/shared/toolbar-renderer';
export { ReasonSidebar, type ReasonSidebarProps } from './docs-agent/shared/Sidebar';
export {
  createSidebarDocument,
  deleteSidebarDocument,
  listSidebarDocuments,
  renameSidebarDocument,
  subscribeSidebarDocuments,
  SIDEBAR_DOCUMENTS_STORAGE_KEY,
  type SidebarDocument,
} from './docs-agent/shared/sidebar-store';

export {
  collaborationRoom,
  createCollaborationSession,
  cursorColorFor,
  hocuspocusUrl,
  parseCollaborationRoom,
  plateYjsProviders,
  ROOM_PREFIX,
  type CollaborationOptions,
  type CollaborationSession,
} from './docs-agent/collaboration/hocuspocus-client';

export { createTiptapAdapter } from './docs-agent/tiptap/editor-adapter';
export {
  ReasonTiptapEditor,
  type ReasonTiptapEditorProps,
} from './docs-agent/tiptap/editor';

export { createPlateAdapter } from './docs-agent/plate/plate-adapter';
export { htmlToPlateValue } from './docs-agent/plate/html-to-plate';
export {
  EMPTY_PLATE_VALUE,
  MediaKit,
  platePlugins,
} from './docs-agent/plate/plate-editor-config';
export {
  ReasonPlateEditor,
  type ReasonPlateEditorProps,
} from './docs-agent/plate/editor';
