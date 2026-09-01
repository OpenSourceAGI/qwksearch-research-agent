/**
 * Public building blocks the separate `react-reason-editor-sidebar` package
 * needs to implement the Sidebar/SidebarContent components that ReasonDocs
 * and RightPanel accept as injected props (see `layout/sidebar/types.ts`).
 * Kept as a single stable subpath (`react-reason-editor/sidebar-kit`) so
 * that package depends one-way on this one, instead of reason-editor
 * depending back on it — which would be a circular workspace dependency.
 */

export { FileTree } from './file-tree';
export type { DocumentTreeHandle } from './file-tree/filetree';

export { OutlineView } from './search/OutlineView';
export type { OutlineViewHandle } from './search/OutlineView';
export type { ActiveHeadingEditorHandle } from './search/useActiveHeading';
export { findRelatedDocuments, splitTopSuggestion } from './search/relatedDocuments';
export type { RelatedDocumentResult, RelatedDocumentsSplit } from './search/relatedDocuments';

export { AIRewriteSuggestion } from './features/ai-rewrite/AIRewriteSuggestion';

export type { Document } from './documents/DocumentTree';
export type { TocEntry } from './app-types/toc';
export type { AnyFileSource } from './app-types/fileSource';
export { getFileSources } from './app-utils/file-sources/sources';
export { cn } from './app-utils/utils';
export { FileManagerModal } from './dialogs/FileManagerModal';
export { ssrSafeLocalStorage } from './utils/storage';

export { Sheet, SheetContent } from './app-ui/sheet';
export { Input } from './app-ui/input';
export { FileTypeIcon } from './app-ui/FileTypeIcon';
export { Button } from './app-ui/button';
export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from './app-ui/tooltip';
export {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './app-ui/dropdown-menu';
export {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from './app-ui/context-menu';

// The sidebar contract (SidebarProps, SidebarContentProps, panel types) and
// the pure panel-toggle config/helpers stay owned by reason-editor and are
// re-exported here so the sidebar package has a single import for both its
// implementation dependencies and the types it implements against.
export * from './layout/sidebar/types';
export * from './layout/sidebar/panelOptions';
