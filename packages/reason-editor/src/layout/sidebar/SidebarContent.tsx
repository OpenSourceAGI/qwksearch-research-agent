/**
 * @module SidebarContent
 * @description Renders the main content area of the application sidebar.
 * Switches between `FileTree`, `OutlineView`, or a vertically split panel
 * depending on the active `ViewMode`.
 */
import { RefObject, useState, useCallback } from 'react';
import { FileTree } from '../../filetree';
import { OutlineView, type OutlineViewHandle } from '../../search/OutlineView';
import { Document } from '../../documents/DocumentTree';
import type { ViewMode } from './types';
import type { TableOfContentsEntry } from '@lexical/react/LexicalTableOfContentsPlugin';
import { SplitPane, Pane } from 'react-split-pane';
import { usePersistence } from 'react-split-pane/persistence';
import { X, Edit2, RotateCcw, SplitSquareVertical } from 'lucide-react';
import { FileTypeIcon } from '../../ui/FileTypeIcon';
import { cn } from '../../lib/utils';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '../../ui/context-menu';
import '../../styles/split-pane.css';

type DocumentTreeHandle = { collapseAll: () => void; edit: (nodeId: string) => void; expandAll: () => void; cancelExpand: () => void };

/** Props for the {@link SidebarContent} component. */
interface SidebarContentProps {
  /** Current sidebar display mode (`'tree'`, `'outline'`, or `'split'`). */
  viewMode: ViewMode;
  /** Filtered/flat document list to pass down to the file tree. */
  activeDocuments: Document[];
  /** Heading entries from the Lexical table of contents plugin. */
  headings?: TableOfContentsEntry[];
  /** ID of the currently active/selected document. */
  activeId: string | null;
  /** The full `Document` object for `activeId`. */
  activeDocument: Document | undefined;
  /** Current search query used to filter the outline view. */
  searchQuery: string;
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
  /** Toggles the expanded state of a folder by ID. */
  onToggleExpand: (id: string) => void;
  /** Moves a document in the tree via drag-and-drop. */
  onMove: (draggedId: string, targetId: string | null, position: 'before' | 'after' | 'child') => void;
  /** Opens the tag management UI for a document. */
  onManageTags?: (id: string) => void;
  /** Renames a document. */
  onRename?: (id: string, newTitle: string) => void;
  /** Callback to control the mobile sidebar sheet open state. */
  onOpenChange?: (open: boolean) => void;
  /** Ref forwarded to the `FileTree` component for imperative control. */
  treeRef: RefObject<DocumentTreeHandle | null>;
  /** Ref forwarded to the `OutlineView` component for imperative control. */
  outlineRef: RefObject<OutlineViewHandle | null>;
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
}

/**
 * Renders the sidebar body: a full `FileTree` in tree-mode, a full
 * `OutlineView` in outline-mode, or a resizable split panel in split-mode.
 */
export const SidebarContent = ({
  viewMode,
  activeDocuments,
  activeId,
  activeDocument,
  searchQuery,
  headings = [],
  isMobile,
  onSelect,
  onAdd,
  onDelete,
  onDuplicate,
  onToggleExpand,
  onMove,
  onManageTags,
  onRename,
  onOpenChange,
  treeRef,
  outlineRef,
  openTabs = [],
  activeTab,
  onTabChange,
  onTabClose,
  onTabRename,
  onSplitRight,
  onReopenLastClosed,
  canReopenLastClosed = false,
}: SidebarContentProps) => {
  // Track copied document for copy/paste operations
  const [copiedDocId, setCopiedDocId] = useState<string | null>(null);

  /**
   * Wraps `onSelect` to also close the mobile sidebar sheet when a document
   * is selected on a narrow viewport.
   *
   * @param id - Document ID that was selected.
   */
  const handleSelect = (id: string) => {
    onSelect(id);
    if (isMobile && onOpenChange) {
      onOpenChange(false);
    }
  };

  /**
   * Wraps `onManageTags` to also close the mobile sheet when tag management
   * is triggered from the sidebar.
   *
   * @param id - Document ID whose tags should be managed.
   */
  const handleManageTags = (id: string) => {
    onManageTags?.(id);
    if (isMobile && onOpenChange) {
      onOpenChange(false);
    }
  };

  /**
   * Calls the globally registered `__scrollToHeading` helper (set by
   * `LexicalEditorWrapper`) to scroll the editor to the heading with the
   * given text.
   *
   * @param headingText - The text content of the target heading.
   */
  const handleNavigate = (headingText: string) => {
    if ((window as any).__scrollToHeading) {
      (window as any).__scrollToHeading(headingText);
    }
  };

  /**
   * Copy a document - just store the ID for later paste
   */
  const handleCopy = useCallback((id: string) => {
    setCopiedDocId(id);
  }, []);

  /**
   * Paste a copied document to a target location
   */
  const handlePaste = useCallback((targetId: string | null) => {
    if (!copiedDocId) return;

    // Duplicate the copied document
    onDuplicate(copiedDocId);

    // TODO: Move the duplicated document to the target location
    // This would require tracking the newly created document ID
    // and then calling onMove to place it in the right location
  }, [copiedDocId, onDuplicate]);

  // Use persistence hook for resizable panels
  const [panelSizes, setPanelSizes] = usePersistence({ key: 'sidebar-panels' });

  return (
    <div className="h-full">
      <SplitPane direction="vertical" onResize={setPanelSizes}>
        {/* Open files list */}
        <Pane size={panelSizes?.[0] || '35%'} minSize="0px">
          <div className="h-full overflow-auto">
            <div className="px-1 py-1">
              <p className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Open Files</p>
              {openTabs.length === 0 ? (
                <div className="px-2 py-3 text-xs text-muted-foreground">No open files</div>
              ) : (
                openTabs.map((tabId) => {
                  const doc = activeDocuments.find(d => d.id === tabId);
                  const title = doc?.title || 'Untitled';
                  const isActive = tabId === activeTab;
                  return (
                    <ContextMenu key={tabId}>
                      <ContextMenuTrigger>
                        <div
                          className={cn(
                            'group flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer transition-colors hover:bg-sidebar-accent',
                            isActive && 'bg-sidebar-accent text-blue-600 font-medium'
                          )}
                          onClick={() => onTabChange?.(tabId)}
                        >
                          <FileTypeIcon filename={title} size={14} />
                          <span className="flex-1 truncate text-sm">{title}</span>
                          {onTabClose && (
                            <button
                              className="shrink-0 h-4 w-4 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                onTabClose(tabId);
                              }}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </ContextMenuTrigger>
                      <ContextMenuContent>
                        {onTabRename && (
                          <ContextMenuItem onClick={() => {
                            const newTitle = window.prompt('Rename document', title);
                            if (newTitle?.trim()) onTabRename(tabId, newTitle.trim());
                          }}>
                            <Edit2 className="mr-2 h-4 w-4" />
                            Rename
                          </ContextMenuItem>
                        )}
                        {onTabClose && (
                          <ContextMenuItem
                            onClick={() => onTabClose(tabId)}
                            className="text-destructive focus:text-destructive"
                          >
                            <X className="mr-2 h-4 w-4" />
                            Close
                          </ContextMenuItem>
                        )}
                        <ContextMenuSeparator />
                        {onSplitRight && (
                          <ContextMenuItem onClick={() => onSplitRight(tabId)}>
                            <SplitSquareVertical className="mr-2 h-4 w-4" />
                            Split Right
                          </ContextMenuItem>
                        )}
                        {onReopenLastClosed && (
                          <ContextMenuItem
                            onClick={onReopenLastClosed}
                            disabled={!canReopenLastClosed}
                          >
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Reopen Last Closed
                          </ContextMenuItem>
                        )}
                      </ContextMenuContent>
                    </ContextMenu>
                  );
                })
              )}
            </div>
          </div>
        </Pane>

        {/* File tree */}
        <Pane minSize="0px">
          <div className="h-full overflow-auto">
            <FileTree
              ref={treeRef}
              documents={activeDocuments}
              activeId={activeId}
              onSelect={handleSelect}
              onMove={onMove}
              onRename={onRename}
              onDelete={onDelete}
              onDuplicate={onDuplicate}
              onAddChild={(parentId) => onAdd(parentId, false)}
              onAddChildFolder={(parentId) => onAdd(parentId, true)}
              onAddSibling={(itemId) => {
                const item = activeDocuments.find(d => d.id === itemId);
                onAdd(item?.parentId || null, false);
              }}
              onAddSiblingFolder={(itemId) => {
                const item = activeDocuments.find(d => d.id === itemId);
                onAdd(item?.parentId || null, true);
              }}
              onCopy={handleCopy}
              onPaste={handlePaste}
              onManageTags={handleManageTags}
            />
          </div>
        </Pane>
      </SplitPane>
    </div>
  );
};
