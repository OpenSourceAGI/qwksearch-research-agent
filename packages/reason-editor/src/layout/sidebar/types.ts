/**
 * @module sidebar/types
 * @description Shared TypeScript types for the sidebar: SidebarProps and
 * the panel-based view configuration used across SidebarContent,
 * SidebarToolbar, SidebarFooter, SidebarViewMenu, and Sidebar.
 */
import type { RefObject } from "react";
import { Document } from "../../documents/DocumentTree";
import type { TocEntry } from "../../app-types/toc";
import type { ActiveHeadingEditorHandle } from "../../search/useActiveHeading";

/** A single togglable panel kind that can appear in the left or right sidebar. */
export type SidebarPanelType = "ai" | "files" | "outline" | "openTabs" | "related";

/** The kind of resource a tab in the "Open Tabs" panel represents. */
export type OpenTabKind = "file" | "chat";

/**
 * A single entry in the unified "Open Tabs" list. When provided, this
 * overrides the legacy document-only tab rendering so tabs for other
 * resource kinds (e.g. chat conversations) can be interleaved with files.
 */
export interface OpenTabItem {
  id: string;
  title: string;
  kind: OpenTabKind;
}

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

/**
 * AI-generated tips about the currently active document, shown as a section
 * of the "ai" panel. Omitted entirely (and the section hidden) when the
 * host app has no tips-generation capability to offer.
 */
export interface SidebarTipsProps {
  /** Tips generated for the active document by the most recent request. */
  tips?: string[];
  /** Whether a tips-generation request is in flight. */
  isTipsLoading?: boolean;
  /** Requests (re)generation of tips for the active document. */
  onGenerateTips?: () => void;
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
  // Editor handle used by the "outline" panel to scroll-spy the active heading
  editorRef?: RefObject<ActiveHeadingEditorHandle | null>;
  // Open tabs (for all-tabs dropdown and open files list)
  openTabs?: string[];
  activeTab?: string | null;
  onTabChange?: (id: string) => void;
  onTabClose?: (id: string) => void;
  onTabRename?: (id: string, newTitle: string) => void;
  onSplitRight?: (id: string) => void;
  onReopenLastClosed?: () => void;
  canReopenLastClosed?: boolean;
  // Unified tab list (files + chats, etc.) for the "Open Tabs" panel. When
  // omitted, the panel falls back to deriving file-only tabs from
  // `openTabs`/`documents`.
  tabItems?: OpenTabItem[];
  // Opens a new chat tab from the "Open Tabs" panel. Omitted when the host
  // app has no chat feature to offer.
  onNewChat?: () => void;
  // AI panel data (used by the "ai" panel)
  aiProps?: SidebarAiProps;
  // AI-generated page tips (used by the "ai" panel)
  tipsProps?: SidebarTipsProps;
}
