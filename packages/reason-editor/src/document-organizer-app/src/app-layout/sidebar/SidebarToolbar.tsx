/**
 * @module SidebarToolbar
 * @description Compact icon toolbar rendered at the top of the sidebar. Shows
 * context-sensitive controls based on `viewMode`: file-source switcher, search,
 * file manager, new file/folder, and expand/collapse buttons.
 */
import { RefObject } from 'react';
import { Button } from '../../shared-components/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../shared-components/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '../../shared-components/dropdown-menu';
import { Search, FilePlus, FolderPlus, ChevronsDownUp, ChevronsUpDown, Check, Folders, Trash2, Columns2, RotateCcw, MoreHorizontal, X } from 'lucide-react';
import { AnyFileSource } from '../../type-definitions/fileSource';
import { getSourceIcon, getSourceTypeLabel } from './fileSourceUtils';
import type { DocumentTreeHandle } from '../../file-tree-navigation/filetree';
import type { OutlineViewHandle } from '../../search-and-outline/OutlineView';
import type { ViewMode } from './types';
import { cn } from '../../utility-functions/utils';
import { Document } from '../../document-management/DocumentTree';

/** Props for the {@link SidebarToolbar} component. */
interface SidebarToolbarProps {
  /** Active sidebar view mode — controls which toolbar buttons are shown. */
  viewMode: ViewMode;
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
  /** Whether all tree nodes are currently expanded. */
  allExpanded: boolean;
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
  /** Whether the right-side outline panel is currently visible. */
  showRightOutline?: boolean;
  /** Toggles the right-side outline panel. */
  onToggleRightOutline?: () => void;
  /** Changes the current view mode. */
  onViewModeChange?: (mode: ViewMode) => void;
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
}

/**
 * Sidebar toolbar strip. Renders different button sets based on `viewMode`:
 * tree/split modes show file-source, search, file-manager, new-file/folder,
 * and collapse-all buttons; outline/split modes additionally show an
 * outline expand/collapse toggle.
 */
export const SidebarToolbar = ({
  viewMode,
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
  outlineExpanded,
  onToggleAllExpanded,
  onToggleOutlineExpanded,
  _treeRef,
  _outlineRef,
  deletedDocs = [],
  onRestore,
  showRightOutline = false,
  onToggleRightOutline,
  onViewModeChange,
  _onSettingsClick,
  _isMobile,
  openTabs = [],
  activeTab,
  onTabChange,
  onTabClose,
  documents = [],
}: SidebarToolbarProps) => {
  const getDocTitle = (id: string) => documents.find(d => d.id === id)?.title || 'Untitled';
  return (
    <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-sidebar-border">
        <TooltipProvider delayDuration={300}>
          {/* Show file/folder buttons only in tree or split view */}
          {(viewMode === 'tree' || viewMode === 'split') && (
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
                  <p>{allExpanded ? 'Collapse All' : 'Expand All'}</p>
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
              {openTabs.length > 0 && onTabChange && (
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
                    {openTabs.map((tabId) => (
                      <DropdownMenuItem
                        key={tabId}
                        className={cn(
                          'flex items-center justify-between gap-2 cursor-pointer pr-1',
                          tabId === activeTab && 'font-semibold text-blue-600'
                        )}
                        onSelect={() => onTabChange(tabId)}
                      >
                        <span className="truncate flex-1 text-sm">{getDocTitle(tabId)}</span>
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

              {/* Split View Menu */}
              {onViewModeChange && (
                <DropdownMenu>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn(
                            'size-8 shrink-0 p-0 text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent',
                            (viewMode === 'split' || showRightOutline) && 'bg-sidebar-accent text-sidebar-foreground'
                          )}
                        >
                          <Columns2 className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>Split View Options</p>
                    </TooltipContent>
                  </Tooltip>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem
                      onClick={() => {
                        onViewModeChange(viewMode === 'split' ? 'tree' : 'split');
                        if (showRightOutline && onToggleRightOutline) {
                          onToggleRightOutline();
                        }
                      }}
                      className="flex items-center justify-between"
                    >
                      <span>Split View in Sidebar</span>
                      {viewMode === 'split' && !showRightOutline && (
                        <span className="text-xs text-muted-foreground">✓</span>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        if (onToggleRightOutline) {
                          onToggleRightOutline();
                          if (viewMode === 'split') {
                            onViewModeChange('tree');
                          }
                        }
                      }}
                      className="flex items-center justify-between"
                    >
                      <span>Outline on Right Side</span>
                      {showRightOutline && (
                        <span className="text-xs text-muted-foreground">✓</span>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => {
                        if (viewMode !== 'tree') {
                          onViewModeChange('tree');
                        }
                        if (showRightOutline && onToggleRightOutline) {
                          onToggleRightOutline();
                        }
                      }}
                      className="flex items-center justify-between"
                    >
                      <span>Disable Split View</span>
                      {viewMode === 'tree' && !showRightOutline && (
                        <span className="text-xs text-muted-foreground">✓</span>
                      )}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

            </>
          )}

          {/* Show expand/collapse in outline or split view */}
          {(viewMode === 'outline' || viewMode === 'split') && (
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
