/**
 * @module SidebarToolbar
 * @description Compact icon toolbar rendered at the top of the sidebar. Shows
 * context-sensitive controls based on `leftPanels`: file-source switcher, search,
 * file manager, new file/folder, and expand/collapse buttons.
 */
import { RefObject } from 'react';
import type { AnyFileSource } from './app-types/fileSource';
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
import { Search, FilePlus, FolderPlus, ChevronsDownUp, ChevronsUpDown, Check, Folders, Trash2, RotateCcw, MoreHorizontal, X, MessageSquare } from 'lucide-react';
import { getSourceIcon, getSourceTypeLabel } from './fileSourceUtils';
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
  /** Available file source configurations. */
  sources: AnyFileSource[];
  /** The currently active file source object, or `null` if none selected. */
  activeSource: AnyFileSource | null;
  /** ID of the currently active file source. */
  activeFileSourceId: string;
  /** Called when the user selects a different file source from the dropdown. */
  onFileSourceChange?: (sourceId: string) => void;
  /** Selects a source by ID and updates the active source state. */
  onSourceSelect: (sourceId: string) => void;
  /** Whether all tree nodes are currently expanded (drives the toggle icon). */
  allExpanded: boolean;
  /** Tooltip label describing what the expand-all toggle will do next (cycles by folder level). */
  expandToggleLabel: string;
  /** Whether all outline entries are currently expanded. */
  outlineExpanded: boolean;
  /** Toggles expand/collapse of all tree nodes. */
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
  /** Opens the settings dialog, optionally navigating to a specific section. */
  onSettingsClick?: (section?: string) => void;
  /** Suppresses the settings button when `true` (mobile layout). */
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
 * file-source, search, file-manager, new-file/folder, and collapse-all
 * buttons; the outline panel additionally shows an expand/collapse toggle.
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
  sources,
  activeSource,
  activeFileSourceId,
  onFileSourceChange,
  onSourceSelect,
  allExpanded,
  expandToggleLabel,
  outlineExpanded,
  onToggleAllExpanded,
  onToggleOutlineExpanded,
  treeRef,
  outlineRef,
  deletedDocs = [],
  onRestore,
  showDynamicIsland = false,
  onToggleDynamicIsland,
  onSettingsClick,
  isMobile,
  openTabs = [],
  activeTab,
  onTabChange,
  onTabClose,
  documents = [],
  tabItems,
}: SidebarToolbarProps) => {
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
              {/* File Source Dropdown */}
              {onFileSourceChange && (
                <DropdownMenu>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="size-8 shrink-0 p-0 text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                        >
                          {activeSource && getSourceIcon(activeSource.type)}
                        </Button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>Storage Source: {activeSource?.name || 'Select Source'}</p>
                    </TooltipContent>
                  </Tooltip>
                  <DropdownMenuContent align="start" className="w-56">
                    {sources.map((source, index) => (
                      <div key={source.id}>
                        {index > 0 && sources[index - 1]?.type !== source.type && (
                          <DropdownMenuSeparator />
                        )}
                        <DropdownMenuItem
                          onClick={() => onSourceSelect(source.id)}
                          className="flex items-center justify-between cursor-pointer"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {getSourceIcon(source.type)}
                            <div className="flex flex-col flex-1 min-w-0">
                              <span className="truncate text-sm">{source.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {getSourceTypeLabel(source.type)}
                              </span>
                            </div>
                          </div>
                          {source.id === activeFileSourceId && (
                            <Check className="h-4 w-4 ml-2 shrink-0" />
                          )}
                        </DropdownMenuItem>
                      </div>
                    ))}
                    {sources.length === 1 && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem disabled className="text-xs text-center text-muted-foreground">
                          Add sources in Settings
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

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

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onToggleAllExpanded}
                    className="size-8 shrink-0 p-0 text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                  >
                    {allExpanded ? (
                      <ChevronsUpDown className="h-4 w-4" />
                    ) : (
                      <ChevronsDownUp className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>{expandToggleLabel}</p>
                </TooltipContent>
              </Tooltip>

              {/* Trash Dropdown */}
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
