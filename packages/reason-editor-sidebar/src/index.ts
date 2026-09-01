/**
 * @fileoverview Public API barrel for the `reason-editor-sidebar` package.
 *
 * The document sidebar for `react-reason-editor`, extracted into its own
 * package so it can be developed, versioned, and imported independently of
 * the rest of the editor. It bundles three things that used to live
 * scattered across the editor package:
 *
 *  - The sidebar shell itself (`Sidebar`, `SidebarToolbar`, `SidebarContent`,
 *    `SidebarFooter`) and its "Split View" menu (`SidebarViewMenu`), which
 *    controls the panels — including the "Open Tabs" panel listing the
 *    documents currently open in the editor.
 *  - The folders/files review UI (`FileTree` and its supporting hooks/utils)
 *    used by the sidebar's "Files" panel.
 *  - The file-source API: types and CRUD helpers for the storage backends
 *    (local, SSH, S3, R2, B2, Google Docs, Turso DB) the sidebar's
 *    file-source switcher lets users pick between.
 */

// Sidebar shell, panel menu, and shared sidebar types.
export {
  Sidebar,
  SidebarToolbar,
  SidebarFooter,
  SidebarContent,
  SidebarViewMenu,
  PANEL_OPTIONS,
  togglePanel,
  applySplitToggle,
  getSourceIcon,
  getSourceTypeLabel,
} from './sidebar';
export type {
  SidebarProps,
  SidebarPanelType,
  OpenTabKind,
  OpenTabItem,
  SidebarAiProps,
  SidebarTipsProps,
  SidebarTopicsProps,
} from './sidebar';

// Folders/files review: the headless-tree-powered file/folder tree.
export {
  FileTree,
  FileTreeContextMenu,
  useFileTreeOperations,
  generateDocumentId,
  findDocumentById,
  findParentDocument,
  getSiblings,
  createDocument,
  cloneDocument,
  flattenDocuments,
  buildDocumentTree,
  updateDocument,
  deleteDocument,
  addDocument,
  moveDocument,
  isAncestor,
} from './file-tree';
export type { DocumentTreeHandle } from './file-tree';

// The document entity shared by the sidebar, file tree, and file manager.
export { DocumentTree } from './documents/DocumentTree';
export type { Document } from './documents/DocumentTree';

// The file-source API: types for every supported storage backend, plus
// localStorage-backed CRUD helpers for managing them.
export type {
  FileSourceType,
  FileSource,
  AnyFileSource,
  LocalFileSource,
  SSHFileSource,
  S3FileSource,
  R2FileSource,
  B2FileSource,
  GoogleDocsFileSource,
  TursoDBFileSource,
  SSHCredentials,
  S3Credentials,
  R2Credentials,
  B2Credentials,
  GoogleDocsCredentials,
  TursoDBCredentials,
} from './types/fileSource';
export {
  getFileSources,
  saveFileSources,
  addFileSource,
  updateFileSource,
  deleteFileSource,
  getActiveFileSourceId,
  setActiveFileSourceId,
  getActiveFileSource,
  testFileSourceConnection,
} from './file-sources/sources';

// Table-of-contents type shared by the outline panel and the host editor.
export type { TocEntry } from './types/toc';

// Outline panel ("outline" sidebar panel) and its scroll-spy hook.
export { OutlineView, computeScrollIntoViewOffset } from './outline/OutlineView';
export type { OutlineViewHandle } from './outline/OutlineView';
export { useActiveHeading, computeActiveHeadingKey } from './outline/useActiveHeading';
export type { ActiveHeadingEditorHandle } from './outline/useActiveHeading';

// Related-documents suggestions ("related" sidebar panel).
export { findRelatedDocuments, splitTopSuggestion } from './related/relatedDocuments';
export type { RelatedDocumentResult, RelatedDocumentsSplit } from './related/relatedDocuments';

// AI rewrite suggestion card ("ai" sidebar panel) and its rewrite-mode config.
export { AIRewriteSuggestion } from './ai-rewrite/AIRewriteSuggestion';
export {
  DEFAULT_REWRITE_MODES,
  getRewriteModes,
  saveRewriteModes,
  resetRewriteModes,
} from './ai-rewrite/rewriteModes';
export type { RewriteMode } from './ai-rewrite/rewriteModes';

// Full-screen file manager modal opened from the sidebar toolbar.
export { FileManagerModal } from './file-manager/FileManagerModal';
export {
  convertDocumentsToFileItems,
  getData,
  getPathToDocIdMap,
} from './file-manager/filemanager-data';
export type { FileItem } from './file-manager/filemanager-data';

// `cn`/storage utilities, re-exported so hosts styling around this package
// don't need their own copy for the common case.
export { cn } from './utils/cn';
export { ssrSafeLocalStorage } from './utils/storage';
