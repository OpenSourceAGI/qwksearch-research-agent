/**
 * @module sidebar/types
 * @description The sidebar "contract" owned by reason-editor: SidebarProps,
 * SidebarContentProps, and the panel-based view configuration types. The
 * actual sidebar UI (Sidebar, SidebarContent, SidebarToolbar, SidebarFooter,
 * SidebarViewMenu) lives in the separate `react-reason-editor-sidebar`
 * package and is injected into ReasonDocs/RightPanel via props typed
 * against these interfaces, so reason-editor never imports that package
 * directly (avoiding a circular workspace dependency).
 */
import type { RefObject } from "react";
import { Document } from "../../documents/DocumentTree";
import type { TocEntry } from "../../app-types/toc";
import type { ActiveHeadingEditorHandle } from "../../search/useActiveHeading";
import type { DocumentTreeHandle } from "../../file-tree/filetree";
import type { OutlineViewHandle } from "../../search/OutlineView";

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

/**
 * AI-generated suggested search queries ("topics") related to the currently
 * active document, shown as a section of the "related" panel. Omitted
 * entirely (and the section hidden) when the host app has no
 * topics-generation capability to offer.
 */
export interface SidebarTopicsProps {
  /** Suggested search queries generated for the active document by the most recent request. */
  topics?: string[];
  /** Whether a topics-generation request is in flight. */
  isTopicsLoading?: boolean;
  /** Requests (re)generation of topics for the active document. */
  onGenerateTopics?: () => void;
  /** Runs a search for the given topic (e.g. opens a new chat seeded with it). */
  onSearchTopic?: (topic: string) => void;
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
  // Left sidebar panel configuration. Split view is inferred: 2+ selected
  // panels stack in a resizable split.
  leftPanels: SidebarPanelType[];
  onLeftPanelsChange: (panels: SidebarPanelType[]) => void;
  // Right sidebar panel configuration (controlled here so the same view
  // menu can manage both sides, even though the right panel itself is
  // rendered outside of Sidebar by ReasonDocs)
  rightPanels: SidebarPanelType[];
  onRightPanelsChange: (panels: SidebarPanelType[]) => void;
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
  // AI-generated search topics (used by the "related" panel)
  topicsProps?: SidebarTopicsProps;
}

/** Props for the `SidebarContent` component (the shared panel-body renderer used by both the left sidebar and `RightPanel`). */
export interface SidebarContentProps {
  /** Which panels are active on this side. Two or more panels render stacked in a split (canonical stacking order applies). */
  panels: SidebarPanelType[];
  /** Storage key suffix so left/right panel sizes persist independently. */
  persistenceKey: string;
  /** Filtered/flat document list to pass down to the file tree. */
  activeDocuments: Document[];
  /** Heading entries from the Tiptap table of contents. */
  headings?: TocEntry[];
  /** ID of the currently active/selected document. */
  activeId: string | null;
  /** The full `Document` object for `activeId` (used for outline section search). */
  activeDocument?: Document;
  /** Whether the sidebar is being displayed in a mobile sheet. */
  isMobile?: boolean;
  /** Selects a document by ID; closes the mobile sheet when on mobile. */
  onSelect: (id: string) => void;
  /** Creates a new note or folder under `parentId`. */
  onAdd: (parentId: string | null, isFolder?: boolean) => void;
  /** Soft-deletes a document by ID. */
  onDelete: (id: string) => void;
  /** Duplicates a document by ID. */
  onDuplicate: (id: string) => void;
  /** Moves a document in the tree via drag-and-drop. */
  onMove: (draggedId: string, targetId: string | null, position: 'before' | 'after' | 'child') => void;
  /** Opens the tag management UI for a document. */
  onManageTags?: (id: string) => void;
  /** Renames a document. */
  onRename?: (id: string, newTitle: string) => void;
  /** Callback to control the mobile sidebar sheet open state. */
  onOpenChange?: (open: boolean) => void;
  /** Ref forwarded to the `FileTree` component for imperative control. */
  treeRef?: RefObject<DocumentTreeHandle | null>;
  /** Ref forwarded to the `OutlineView` component for imperative control. */
  outlineRef?: RefObject<OutlineViewHandle | null>;
  /** Editor handle passed to `OutlineView` to scroll-spy the active heading. */
  editorRef?: RefObject<ActiveHeadingEditorHandle | null>;
  /** Currently open tab IDs shown in the top pane. */
  openTabs?: string[];
  /** ID of the currently active tab. */
  activeTab?: string | null;
  /** Switches to a tab. */
  onTabChange?: (id: string) => void;
  /** Closes a tab. */
  onTabClose?: (id: string) => void;
  /** Renames a tab's document. */
  onTabRename?: (id: string, newTitle: string) => void;
  /** Opens a tab in a split view to the right. */
  onSplitRight?: (id: string) => void;
  /** Reopens the last closed tab. */
  onReopenLastClosed?: () => void;
  /** Whether there is a closed tab that can be reopened. */
  canReopenLastClosed?: boolean;
  /** Navigates the editor to a heading (used by the "outline" panel). */
  onNavigate?: (key: string) => void;
  /** AI suggestion state/handlers (used by the "ai" panel). */
  aiProps?: SidebarAiProps;
  /** AI-generated page tips state/handlers (used by the "ai" panel). */
  tipsProps?: SidebarTipsProps;
  /** AI-generated search topics state/handlers (used by the "related" panel). */
  topicsProps?: SidebarTopicsProps;
  /** Unified tab list (files + chats). Overrides file-only tab derivation when set. */
  tabItems?: OpenTabItem[];
  /** Opens a new chat tab from the "Open Tabs" panel header. */
  onNewChat?: () => void;
}
