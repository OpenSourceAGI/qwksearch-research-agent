/**
 * @module sidebar/types
 * @description Shared TypeScript types for the sidebar: SidebarProps and
 * ViewMode union used across SidebarContent, SidebarToolbar, and Sidebar.
 */
import { Document } from "../../document-management/DocumentTree";
import type { TocEntry } from "../../type-definitions/toc";

export interface SidebarProps {
  documents: Document[];
  activeId: string | null;
  activeDocument: Document | undefined;
  onSelect: (id: string) => void;
  onAdd: (parentId: string | null, isFolder?: boolean) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onToggleExpand: (id: string) => void;
  onMove: (
    draggedId: string,
    targetId: string | null,
    position: "before" | "after" | "child",
  ) => void;
  onManageTags?: (id: string) => void;
  onRename?: (id: string, newTitle: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearchClear: () => void;
  onSearchFocus: () => void;
  // Mobile drawer props
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  isMobile?: boolean;
  // View mode
  viewMode: "tree" | "outline" | "split";
  onViewModeChange: (mode: "tree" | "outline" | "split") => void;
  // Settings
  onSettingsClick?: (section?: string) => void;
  onInviteClick?: () => void;
  // Trash callbacks
  onRestore?: (id: string) => void;
  onPermanentDelete?: (id: string) => void;
  // New document ID to trigger rename mode
  newDocumentId?: string | null;
  // Right-side outline toggle
  showRightOutline?: boolean;
  onToggleRightOutline?: () => void;
  // File source
  activeFileSourceId?: string;
  onFileSourceChange?: (sourceId: string) => void;
  // Headings for outline view
  headings?: TocEntry[];
  // Open tabs (for all-tabs dropdown and open files list)
  openTabs?: string[];
  activeTab?: string | null;
  onTabChange?: (id: string) => void;
  onTabClose?: (id: string) => void;
  onTabRename?: (id: string, newTitle: string) => void;
  onSplitRight?: (id: string) => void;
  onReopenLastClosed?: () => void;
  canReopenLastClosed?: boolean;
}

export type ViewMode = "tree" | "outline" | "split";
