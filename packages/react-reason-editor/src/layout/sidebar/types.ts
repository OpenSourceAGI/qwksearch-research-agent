/**
 * @module sidebar/types
 * @description Shared TypeScript types for the sidebar: SidebarProps and
 * the panel-based view configuration used across SidebarContent,
 * SidebarToolbar, SidebarFooter, SidebarViewMenu, and Sidebar.
 */
import { Document } from "../../documents/DocumentTree";
import type { TocEntry } from "../../app-types/toc";

/** A single togglable panel kind that can appear in the left or right sidebar. */
export type SidebarPanelType = "ai" | "files" | "outline" | "openTabs";

/** Shared AI-suggestion props needed to render an "ai" panel. */
export interface SidebarAiProps {
  isAiLoading?: boolean;
  aiSuggestion?: {
    originalText: string;
    suggestedText: string;
    range: { from: number; to: number };
    mode?: string;
  } | null;
  onAiApprove?: () => void;
  onAiReject?: () => void;
  onAiRegenerate?: (mode: any) => void;
}

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
  // Left sidebar panel configuration
  leftPanels: SidebarPanelType[];
  onLeftPanelsChange: (panels: SidebarPanelType[]) => void;
  leftSplit: boolean;
  onLeftSplitChange: (split: boolean) => void;
  // Right sidebar panel configuration (controlled here so the same view
  // menu can manage both sides, even though the right panel itself is
  // rendered outside of Sidebar by ReasonDocs)
  rightPanels: SidebarPanelType[];
  onRightPanelsChange: (panels: SidebarPanelType[]) => void;
  rightSplit: boolean;
  onRightSplitChange: (split: boolean) => void;
  // Settings
  onSettingsClick?: (section?: string) => void;
  onInviteClick?: () => void;
  // Trash callbacks
  onRestore?: (id: string) => void;
  onPermanentDelete?: (id: string) => void;
  // New document ID to trigger rename mode
  newDocumentId?: string | null;
  // Floating reading-progress island toggle
  showDynamicIsland?: boolean;
  onToggleDynamicIsland?: () => void;
  // File source
  activeFileSourceId?: string;
  onFileSourceChange?: (sourceId: string) => void;
  // Headings for outline view
  headings?: TocEntry[];
  // Jumps the editor to a heading (used by the "outline" panel)
  onNavigate?: (key: string) => void;
  // Open tabs (for all-tabs dropdown and open files list)
  openTabs?: string[];
  activeTab?: string | null;
  onTabChange?: (id: string) => void;
  onTabClose?: (id: string) => void;
  onTabRename?: (id: string, newTitle: string) => void;
  onSplitRight?: (id: string) => void;
  onReopenLastClosed?: () => void;
  canReopenLastClosed?: boolean;
  // AI panel data (used by the "ai" panel)
  aiProps?: SidebarAiProps;
}
