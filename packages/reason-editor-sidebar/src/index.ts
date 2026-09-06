/**
 * @module react-reason-editor-sidebar
 * @description The REASON editor's sidebar as a standalone package: the
 * files/folders tree, the "Open Tabs" panel and its all-tabs menu, the
 * outline/AI/related panels, and the split-view menu that toggles which of
 * them are visible. Designed to be injected into `ReasonDocs`/`RightPanel`
 * (from `react-reason-editor`) via their `SidebarComponent`/
 * `SidebarContentComponent` props. Depends on `react-reason-editor` for
 * nothing — `reason-editor` depends on this package instead, so the
 * dependency stays one-way and avoids a circular workspace dependency.
 */
export { Sidebar } from './Sidebar';
export { SidebarToolbar } from './SidebarToolbar';
export { SidebarFooter } from './SidebarFooter';
export { SidebarContent } from './SidebarContent';
export { SidebarViewMenu } from './SidebarViewMenu';
export * from './fileSourceUtils';

// The full sidebar "API": the contract types this package's components
// implement, plus the panel-toggle config/helpers used to drive them.
export type {
  SidebarProps,
  SidebarContentProps,
  SidebarPanelType,
  OpenTabKind,
  OpenTabItem,
  SidebarAiProps,
  SidebarTipsProps,
  SidebarTopicsProps,
} from './layout/sidebar/types';
export { PANEL_OPTIONS, togglePanel, sortPanels } from './layout/sidebar/panelOptions';

// Folders and files review: the headless-tree-powered folder/file browser
// and its supporting hooks/utilities.
export { FileTree } from './file-tree';
export type { DocumentTreeHandle } from './file-tree/filetree';

// Outline, related-documents suggestions, and the AI rewrite suggestion card.
export { OutlineView } from './search/OutlineView';
export type { OutlineViewHandle } from './search/OutlineView';
export type { ActiveHeadingEditorHandle } from './search/useActiveHeading';
export { findRelatedDocuments, splitTopSuggestion } from './search/relatedDocuments';
export type { RelatedDocumentResult, RelatedDocumentsSplit } from './search/relatedDocuments';
export { AIRewriteSuggestion } from './features/ai-rewrite/AIRewriteSuggestion';
export {
  getRewriteModes,
  saveRewriteModes,
  resetRewriteModes,
  DEFAULT_REWRITE_MODES,
} from './features/ai-rewrite/rewriteModes';
export type { RewriteMode } from './features/ai-rewrite/rewriteModes';

// Document type and the file manager modal.
export type { Document } from './documents/DocumentTree';
export { defaultDocuments } from './documents/defaultDocuments';
export type { TocEntry } from './app-types/toc';
export { FileManagerModal } from './dialogs/FileManagerModal';

// The file-source API: types and localStorage-backed CRUD helpers for every
// supported storage backend (local, SSH, S3, R2, B2, Google Docs, Turso DB).
export type * from './app-types/fileSource';
export {
  getFileSources,
  saveFileSources,
  addFileSource,
  updateFileSource,
  deleteFileSource,
  getActiveFileSourceId,
  setActiveFileSourceId,
  getActiveFileSource,
} from './app-utils/file-sources/sources';

// Small local utilities.
export { cn } from './app-utils/utils';
export { ssrSafeLocalStorage } from './utils/storage';
