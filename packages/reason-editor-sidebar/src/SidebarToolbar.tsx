/**
 * @module SidebarToolbar
 * @description Compact icon toolbar rendered at the top of the sidebar. Shows
 * context-sensitive controls based on `leftPanels`: search and expand/collapse
 * buttons. The storage-source switcher lives in the sidebar footer. The
 * file-tree actions (new file/folder, trash, file manager) render here only
 * when the "Files" panel — which hosts them in its own header — is hidden.
 */
import { RefObject } from 'react';
import type { DocumentTreeHandle } from './file-tree/filetree';
import type { OutlineViewHandle } from './search/OutlineView';
import type { SidebarPanelType, OpenTabItem } from './layout/sidebar/types';
import type { Document } from './documents/DocumentTree';
import { Button } from './app-ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './app-ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from './app-ui/dropdown-menu';
import { cn } from './app-utils/utils';
import { FileTypeIcon } from './app-ui/FileTypeIcon';
import { Search, FilePlus, FolderPlus, ChevronsDownUp, ChevronsUpDown, Folders, Trash2, RotateCcw, MoreHorizontal, X, MessageSquare } from 'lucide-react';
import { SidebarViewMenu } from './SidebarViewMenu';

/** Props for the {@link SidebarToolbar} component. */
interface SidebarToolbarProps {
  /** Panels currently visible in the left sidebar — controls which toolbar buttons are shown. */
  leftPanels: SidebarPanelType[];
  /** Changes which panels are visible in the left sidebar. */
  onLeftPanelsChange: (panels: SidebarPanelType[]) => void;
  /** Panels currently visible in the right sidebar. */
  rightPanels: SidebarPanelType[];
  /** Changes which panels are visible in the right sidebar. */
  onRightPanelsChange: (panels: SidebarPanelType[]) => void;
  /** ID of the currently selected document (used when creating a new sibling). */
  activeId: string | null;
  /** Creates a new note (`isFolder=false`) or folder (`isFolder=true`) under `parentId`. */
  onAdd: (parentId: string | null, isFolder?: boolean) => void;
  /** Focuses the sidebar search input. */
  onSearchFocus: () => void;
  /** Opens the file manager modal. */
  onFileManagerOpen: () => void;
  /** Whether all tree nodes are currently expanded (drives the toggle icon). */
  allExpanded: boolean;
  /** Tooltip label describing what the expand-all toggle will do next (cycles by folder level). */
  expandToggleLabel: string;
  /**
   * Disables the expand-all toggle when there is no file tree behind it —
   * the Files panel is turned off for this sidebar or lives in the other
   * one — so the button doesn't advertise a cycle it cannot run.
   */
  expandToggleDisabled?: boolean;
  /** Whether all outline entries are currently expanded. */
  outlineExpanded: boolean;
  /** Steps the tree to its next expansion level (wraps to fully collapsed). */
  onToggleAllExpanded: () => void;
  /** Toggles expand/collapse of all outline entries. */
  onToggleOutlineExpanded: () => void;
  /** Ref forwarded to the `FileTree` for imperative operations. */
  treeRef: RefObject<DocumentTreeHandle | null>;
  /** Ref forwarded to the `OutlineView` for imperative operations. */
  outlineRef: RefObject<OutlineViewHandle | null>;
  /** Soft-deleted documents shown in the trash dropdown. */
  deletedDocs?: Document[];
  /** Restores a soft-deleted document by ID. */
  onRestore?: (id: string) => void;
  /** Whether the floating reading-progress island is currently visible. */
  showDynamicIsland?: boolean;
  /** Toggles the floating reading-progress island. */
  onToggleDynamicIsland?: () => void;
  /** Reserved for layout tweaks on the mobile drawer. */
  isMobile?: boolean;
  /** All currently open tab IDs. */
  openTabs?: string[];
  /** ID of the currently active tab. */
  activeTab?: string | null;
  /** Switches to a tab by ID. */
  onTabChange?: (id: string) => void;
  /** Closes a tab by ID. */
  onTabClose?: (id: string) => void;
  /** All documents (used for tab title lookup). */
  documents?: Document[];
  /** Unified tab list (files + chats). Overrides file-only tab derivation when set. */
  tabItems?: OpenTabItem[];
}

/**
 * Sidebar toolbar strip. Renders different button sets based on which
 * panels are active in `leftPanels`: the files/open-tabs panel shows
 * search, file-manager, new-file/folder, and collapse-all buttons; the outline panel additionally shows an expand/collapse toggle.
 */
export const SidebarToolbar = ({
  leftPanels,
  onLeftPanelsChange,
  rightPanels,
  onRightPanelsChange,
  activeId,
  onAdd,
  onSearchFocus,
  onFileManagerOpen,
  allExpanded,
  expandToggleLabel,
  expandToggleDisabled = false,
  outlineExpanded,
  onToggleAllExpanded,
  onToggleOutlineExpanded,
  treeRef,
  outlineRef,
  deletedDocs = [],
  onRestore,
  showDynamicIsland = false,
  onToggleDynamicIsland,
  isMobile,
  openTabs = [],
  activeTab,
  onTabChange,
  onTabClose,
  documents = [],
  tabItems,
}: SidebarToolbarProps) => {
  // File-tree actions (new file/folder, trash, file manager) live in the
  // "Files" panel header when that panel is on screen, so the toolbar only
  // offers them as a fallback when the tree isn't visible.
  const filesPanelVisible = leftPanels.includes('files');
  const getDocTitle = (id: string) => documents.find(d => d.id === id)?.title || 'Untitled';
  const resolvedTabItems: OpenTabItem[] = tabItems ?? openTabs.map((tabId) => ({
    id: tabId,
    title: getDocTitle(tabId),
    kind: 'file' as const,
  }));
  return (
    <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-sidebar-border">
        <TooltipProvider delayDuration={300}>
          {/* Show file/folder buttons only when the file tree or open-tabs panel is visible */}
          {(leftPanels.includes('files') || leftPanels.includes('openTabs')) && (
            <>
                  <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onSearchFocus}
                    className="size-8 shrink-0 p-0 text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Search Notes</p>
                </TooltipContent>
              </Tooltip>

              {!filesPanelVisible && (
                <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={onFileManagerOpen}
                        className="size-8 shrink-0 p-0 text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                      >
                        <Folders className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>File Manager</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onAdd(activeId, false)}
                        className="size-8 shrink-0 p-0 text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                      >
                        <FilePlus className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>New File</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onAdd(activeId, true)}
                        className="size-8 shrink-0 p-0 text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                      >
                        <FolderPlus className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>New Folder</p>
                    </TooltipContent>
                  </Tooltip>
                </>
              )}

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onToggleAllExpanded}
                    aria-label={expandToggleLabel}
                    disabled={expandToggleDisabled}
                    className="size-8 shrink-0 p-0 text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent disabled:opacity-40"
                  >
                    {/* The icon shows the action the next click performs. */}
                    {allExpanded ? (
                      <ChevronsDownUp className="h-4 w-4" />
                    ) : (
                      <ChevronsUpDown className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>{expandToggleDisabled ? 'No file tree in this sidebar' : expandToggleLabel}</p>
                </TooltipContent>
              </Tooltip>

              {/* Trash Dropdown */}
              {!filesPanelVisible && (
                <DropdownMenu>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="size-8 shrink-0 p-0 text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>Trash</p>
                    </TooltipContent>
                  </Tooltip>
                  <DropdownMenuContent align="end" className="w-56">
                    {deletedDocs.length > 0 ? (
                      <>
                        {deletedDocs.slice(0, 5).map((doc) => (
                          <DropdownMenuItem
                            key={doc.id}
                            className="flex items-center justify-between"
                            onClick={() => onRestore?.(doc.id)}
                          >
                            <span className="truncate flex-1">{doc.title || 'Untitled'}</span>
                            <RotateCcw className="h-3 w-3 ml-2 opacity-60" />
                          </DropdownMenuItem>
                        ))}
                        {deletedDocs.length > 5 && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem disabled className="text-xs text-center">
                              {deletedDocs.length - 5} more in trash...
                            </DropdownMenuItem>
                          </>
                        )}
                      </>
                    ) : (
                      <DropdownMenuItem disabled className="text-center text-muted-foreground">
                        Trash is empty
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* All Tabs Dropdown */}
              {resolvedTabItems.length > 0 && onTabChange && (
                <DropdownMenu>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="size-8 shrink-0 p-0 text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>All Open Tabs</p>
                    </TooltipContent>
                  </Tooltip>
                  <DropdownMenuContent align="end" className="w-56 max-h-80 overflow-y-auto">
                    {resolvedTabItems.map(({ id: tabId, title, kind }) => (
                      <DropdownMenuItem
                        key={tabId}
                        className={cn(
                          'flex items-center justify-between gap-2 cursor-pointer pr-1',
                          tabId === activeTab && 'font-semibold text-blue-600'
                        )}
                        onSelect={() => onTabChange(tabId)}
                      >
                        <span className="flex items-center gap-2 flex-1 min-w-0">
                          {kind === 'chat' ? (
                            <MessageSquare className="shrink-0 h-3.5 w-3.5 text-blue-500" />
                          ) : (
                            <FileTypeIcon filename={title} size={14} />
                          )}
                          <span className="truncate text-sm">{title}</span>
                        </span>
                        {onTabClose && (
                          <button
                            className="shrink-0 h-5 w-5 flex items-center justify-center rounded hover:bg-destructive/10 hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              onTabClose(tabId);
                            }}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </>
          )}

          {/* View Options Menu */}
          <SidebarViewMenu
            leftPanels={leftPanels}
            onLeftPanelsChange={onLeftPanelsChange}
            rightPanels={rightPanels}
            onRightPanelsChange={onRightPanelsChange}
            showDynamicIsland={showDynamicIsland}
            onToggleDynamicIsland={onToggleDynamicIsland}
            triggerClassName="size-8 shrink-0 p-0 text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            tooltipSide="bottom"
          />

          {/* Show expand/collapse when the outline panel is visible */}
          {leftPanels.includes('outline') && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onToggleOutlineExpanded}
                  className="size-8 shrink-0 p-0 text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                >
                  {outlineExpanded ? (
                    <ChevronsUpDown className="h-4 w-4" />
                  ) : (
                    <ChevronsDownUp className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>{outlineExpanded ? 'Collapse All' : 'Expand All'}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </TooltipProvider>
    </div>
  );
};
