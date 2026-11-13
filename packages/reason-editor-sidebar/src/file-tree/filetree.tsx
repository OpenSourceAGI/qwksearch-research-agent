/**
 * @module FileTree
 * @description Headless-tree-powered file/folder tree for the document
 * sidebar. Supports drag-to-reorder, inline rename, expand/collapse, and
 * imperative handle via `DocumentTreeHandle`.
 */
"use client";

import {
  dragAndDropFeature,
  hotkeysCoreFeature,
  keyboardDragAndDropFeature,
  renamingFeature,
  selectionFeature,
  syncDataLoaderFeature,
  type TreeState,
} from "@headless-tree/core";
import { AssistiveTreeDescription, useTree } from "@headless-tree/react";
import { FolderIcon, FolderOpenIcon, Star } from "lucide-react";
import { FileTypeIcon } from "../app-ui/FileTypeIcon";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";

import type { Document } from "../documents/DocumentTree";
import {
  getExpandedLevel,
  getFolderIdsUpToLevel,
  getMaxFolderLevel,
} from "./expandLevels";

export type DocumentTreeHandle = {
  collapseAll: () => void;
  edit: (nodeId: string) => void;
  expandAll: () => void;
  expandToLevel: (level: number) => void;
  /** Deepest folder level currently fully expanded (0 = fully collapsed). */
  getExpandLevel: () => number;
  /** Deepest folder nesting level in the tree (0 = no folders at all). */
  getMaxExpandLevel: () => number;
};
import { Tree, TreeDragLine, TreeItem, TreeItemLabel } from "../app-ui/tree";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../app-ui/alert-dialog";
import { cn } from "../app-utils/utils";
import { FileTreeContextMenu } from "./FileTreeContextMenu";

interface FileTreeItem {
  children?: string[];
  documentId: string;
  isFolder: boolean;
  name: string;
  /** Icon extension for files whose title carries none (e.g. a Google Doc). */
  extension?: string;
}

interface FileTreeProps {
  activeId: string | null;
  documents: Document[];
  onMove: (
    draggedId: string,
    targetId: string | null,
    position: "before" | "after" | "child",
  ) => void;
  onRename?: (id: string, newTitle: string) => void;
  onSelect: (id: string) => void;
  onDelete?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onAddChild?: (parentId: string) => void;
  onAddChildFolder?: (parentId: string) => void;
  onAddSibling?: (itemId: string) => void;
  onAddSiblingFolder?: (itemId: string) => void;
  onCopy?: (id: string) => void;
  onPaste?: (targetId: string | null) => void;
  onNewFile?: (parentId: string | null) => void;
  onNewFolder?: (parentId: string | null) => void;
  onManageTags?: (id: string) => void;
  /**
   * Whether a document is favorited. Favorited files show a gold star
   * after their name.
   */
  isFavorite?: (id: string) => boolean;
  /**
   * Favorites or unfavorites a file. When set, the context menu of every
   * file (not folder) offers "Favorite" / "Unfavorite".
   */
  onToggleFavorite?: (id: string) => void;
  /**
   * Reports the tree's live expansion depth so the toolbar's expand/collapse
   * toggle can label its next step. Fires on mount, whenever the expanded
   * depth or the tree's own depth changes, and with zeroes on unmount.
   */
  onExpandStateChange?: (state: { level: number; maxLevel: number }) => void;
  /**
   * Hands the tree's current expanded-folder set to the host whenever it
   * changes, so the host can persist it. Without this, a stepped
   * expand/collapse lives only in the tree's local state and the next
   * document change (e.g. a rename) resets the tree back to the persisted
   * `isExpanded` flags, throwing the cycle away.
   */
  onExpandedFoldersChange?: (folderIds: string[]) => void;
}

const ROOT_ID = "__root__";
const INDENT = 20;

type DropPlacement = {
  targetId: string | null;
  position: "before" | "after" | "child";
};

/**
 * Turns a headless-tree reorder target into the sibling-relative move the
 * `onMove` callback speaks.
 *
 * `insertionIndex` is the drop slot counted against the parent's children
 * *after* the dragged nodes have been lifted out of them, so the anchor has to
 * be looked up in that same lifted-out list — using the raw `childIndex`
 * against it lands a downward drag one slot too far, which reads as the node
 * refusing to move where it was dropped.
 *
 * Exported for tests.
 */
export function resolveDropPlacement(
  parentChildren: string[],
  draggedIds: string[],
  insertionIndex: number,
  parentId: string | null,
): DropPlacement {
  const siblings = parentChildren.filter((childId) => !draggedIds.includes(childId));

  const siblingAtIndex = siblings[insertionIndex];
  if (siblingAtIndex) return { targetId: siblingAtIndex, position: "before" };

  const previousSibling = siblings[insertionIndex - 1];
  if (previousSibling) return { targetId: previousSibling, position: "after" };

  // Dropping into an empty parent (or past the end of an emptied one).
  return { targetId: parentId, position: "child" };
}

function buildItems(documents: Document[]): Record<string, FileTreeItem> {
  const items: Record<string, FileTreeItem> = {
    [ROOT_ID]: {
      children: [],
      documentId: ROOT_ID,
      isFolder: true,
      name: "Root",
    },
  };

  for (const doc of documents) {
    items[doc.id] = {
      children: [],
      documentId: doc.id,
      isFolder: !!doc.isFolder,
      name: doc.title || "Untitled",
      extension: doc.external?.extension,
    };
  }

  for (const doc of documents) {
    const parentId = doc.parentId && items[doc.parentId] ? doc.parentId : ROOT_ID;
    items[parentId].children = [...(items[parentId].children ?? []), doc.id];
  }

  for (const itemId of Object.keys(items)) {
    if (itemId === ROOT_ID) continue;
    if ((items[itemId].children?.length ?? 0) > 0) {
      items[itemId].isFolder = true;
    }
  }

  return items;
}

const FileTree = forwardRef<DocumentTreeHandle, FileTreeProps>(
  ({ activeId, documents, onMove, onRename, onSelect, onDelete, onDuplicate, onAddChild, onAddChildFolder, onAddSibling, onAddSiblingFolder, onCopy, onPaste, onNewFile: _onNewFile, onNewFolder: _onNewFolder, onManageTags, isFavorite, onToggleFavorite, onExpandStateChange, onExpandedFoldersChange }, ref) => {
    const items = useMemo(() => {
      const built = buildItems(documents);
      return built;
    }, [documents]);
    // Use the tree's own notion of a folder (`buildItems` promotes any item
    // with children) so an id set written back by the host round-trips
    // instead of dropping entries the tree still draws as folders.
    const expandedItems = useMemo(
      () => documents.filter((doc) => items[doc.id]?.isFolder && doc.isExpanded).map((doc) => doc.id),
      [documents, items],
    );

    const [state, setState] = useState<Partial<TreeState<FileTreeItem>>>({
      expandedItems,
      selectedItems: activeId ? [activeId] : [],
    });
    const [copiedNodeId, setCopiedNodeId] = useState<string | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    const tree = useTree<FileTreeItem>({
      canReorder: true,
      dataLoader: {
        getChildren: (itemId) => {
          const item = items[itemId];
          if (!item) {
            return [];
          }
          return item.children ?? [];
        },
        getItem: (itemId) => {
          const item = items[itemId];
          if (!item) {
            // Return a fallback item to prevent crashes
            return {
              children: [],
              documentId: itemId,
              isFolder: false,
              name: 'Deleted Item',
            };
          }
          return item;
        },
      },
      features: [
        syncDataLoaderFeature,
        selectionFeature,
        hotkeysCoreFeature,
        renamingFeature,
        dragAndDropFeature,
        keyboardDragAndDropFeature,
      ],
      getItemName: (item) => item.getItemData().name,
      onRename: (item, value) => {
        const newTitle = value.trim() || 'Untitled';
        onRename?.(item.getId(), newTitle);
      },
      indent: INDENT,
      isItemFolder: (item) => item.getItemData()?.isFolder ?? false,
      onDrop: (draggedItems, target) => {
        const draggedIds = draggedItems
          .map((draggedItem) => draggedItem.getId())
          .filter((id) => id !== ROOT_ID);

        if (draggedIds.length === 0) return;

        const orderedDraggedIds = [...draggedIds].reverse();
        const moveAsChild = (parentId: string | null) => {
          for (const draggedId of orderedDraggedIds) {
            onMove(draggedId, parentId, "child");
          }
        };

        if ("childIndex" in target) {
          const parentId = target.item.getId() === ROOT_ID ? null : target.item.getId();
          const placement = resolveDropPlacement(
            items[target.item.getId()]?.children ?? [],
            draggedIds,
            target.insertionIndex,
            parentId,
          );

          for (const draggedId of orderedDraggedIds) {
            onMove(draggedId, placement.targetId, placement.position);
          }
          return;
        }

        const targetId = target.item.getId() === ROOT_ID ? null : target.item.getId();
        moveAsChild(targetId);
      },
      rootItemId: ROOT_ID,
      setState,
      state,
    });

    // Selection follows the active document. Kept separate from expansion
    // sync so switching documents doesn't clobber the current expansion.
    useEffect(() => {
      setState((prev) => ({
        ...prev,
        selectedItems: activeId && items[activeId] ? [activeId] : [],
      }));
    }, [activeId, items]);

    // Re-sync expansion from the documents' persisted `isExpanded` flags only
    // when that derived list actually changes by value. Comparing by content
    // (not array identity, which churns on every parent re-render) is what
    // lets imperative expandToLevel/collapseAll changes stick.
    const expandedItemsKey = expandedItems.join('\n');
    useEffect(() => {
      setState((prev) => ({ ...prev, expandedItems }));
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [expandedItemsKey]);

    // The toggle cycles one folder level at a time, so it needs the level the
    // tree is *actually* at — folders can also be opened by hand or restored
    // from persisted state, not just by the toggle.
    const maxExpandLevel = useMemo(() => getMaxFolderLevel(items, ROOT_ID), [items]);
    const expandLevel = useMemo(
      () => getExpandedLevel(items, ROOT_ID, state.expandedItems ?? []),
      [items, state.expandedItems],
    );

    const onExpandStateChangeRef = useRef(onExpandStateChange);
    useEffect(() => {
      onExpandStateChangeRef.current = onExpandStateChange;
    }, [onExpandStateChange]);
    useEffect(() => {
      onExpandStateChangeRef.current?.({ level: expandLevel, maxLevel: maxExpandLevel });
    }, [expandLevel, maxExpandLevel]);
    // Without a mounted tree there is nothing to expand; let the toolbar know.
    useEffect(
      () => () => onExpandStateChangeRef.current?.({ level: 0, maxLevel: 0 }),
      [],
    );

    // Reports the tree's live expanded-folder set to the host so it can be
    // persisted, keyed by content (not array identity) so it only fires when
    // the actual set changes.
    const currentExpandedItems = state.expandedItems ?? [];
    const onExpandedFoldersChangeRef = useRef(onExpandedFoldersChange);
    useEffect(() => {
      onExpandedFoldersChangeRef.current = onExpandedFoldersChange;
    }, [onExpandedFoldersChange]);
    const currentExpandedItemsKey = currentExpandedItems.join('\n');
    useEffect(() => {
      onExpandedFoldersChangeRef.current?.(currentExpandedItems);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentExpandedItemsKey]);

    useImperativeHandle(ref, () => ({
      collapseAll: () => {
        setState((prev) => ({ ...prev, expandedItems: [] }));
      },
      edit: (nodeId: string) => {
        if (onRename) {
          tree.getItemInstance(nodeId).startRenaming();
        }
      },
      // Every folder at once, taken from the level math rather than
      // headless-tree's asynchronous walk: the set has to be known
      // synchronously to be handed to the host.
      expandAll: () => {
        const ids = getFolderIdsUpToLevel(items, ROOT_ID, maxExpandLevel);
        setState((prev) => ({ ...prev, expandedItems: ids }));
      },
      expandToLevel: (level: number) => {
        const ids = getFolderIdsUpToLevel(items, ROOT_ID, Math.min(level, maxExpandLevel));
        setState((prev) => ({ ...prev, expandedItems: ids }));
      },
      getExpandLevel: () => expandLevel,
      getMaxExpandLevel: () => maxExpandLevel,
    }));

    const handleDeleteConfirm = () => {
      if (deleteConfirmId && onDelete) {
        onDelete(deleteConfirmId);
        setDeleteConfirmId(null);

        // Clear selection if the deleted item was selected
        setState((prev) => ({
          ...prev,
          selectedItems: prev.selectedItems?.filter(id => id !== deleteConfirmId) ?? [],
        }));
      }
    };

    const deleteNodeName = deleteConfirmId ? items[deleteConfirmId]?.name : "";

    // headless-tree caches the flattened item list and only rebuilds it by
    // itself when the expanded set changes, so a move/add/delete that only
    // reshapes the data would keep rendering the previous structure — a
    // dragged node would snap straight back to where it came from. Ask for a
    // rebuild whenever the derived items change, before reading getItems()
    // (which performs any scheduled rebuild) on the very same render.
    const lastItemsRef = useRef<Record<string, FileTreeItem> | null>(null);
    if (lastItemsRef.current !== items) {
      lastItemsRef.current = items;
      tree.scheduleRebuildTree();
    }

    const treeItems = tree.getItems();

    return (
      <>
        <div className="flex h-full flex-col gap-2 overflow-auto">
          <Tree indent={INDENT} tree={tree}>
            <AssistiveTreeDescription tree={tree} />
            {treeItems.map((item) => {
              const itemId = item.getId();
              if (itemId === ROOT_ID) return null;
              const isFolderItem = item.isFolder();
              const favorited = !isFolderItem && !!isFavorite?.(itemId);

              return (
                <TreeItem item={item} key={itemId}>
                  <FileTreeContextMenu
                    itemId={itemId}
                    isFolder={item.isFolder()}
                    hasCopiedItem={!!copiedNodeId}
                    onAddChild={onAddChild}
                    onAddChildFolder={onAddChildFolder}
                    onAddSibling={onAddSibling}
                    onAddSiblingFolder={onAddSiblingFolder}
                    onRename={onRename ? () => item.startRenaming() : undefined}
                    onDuplicate={onDuplicate}
                    onCopy={onCopy ? (id) => {
                      setCopiedNodeId(id);
                      onCopy(id);
                    } : undefined}
                    onPaste={onPaste ? () => {
                      if (copiedNodeId) {
                        const target = item.isFolder() ? itemId : null;
                        onPaste(target);
                      }
                    } : undefined}
                    onDelete={onDelete ? () => setDeleteConfirmId(itemId) : undefined}
                    onManageTags={onManageTags}
                    isFavorite={favorited}
                    onToggleFavorite={!isFolderItem ? onToggleFavorite : undefined}
                  >
                    {item.isRenaming() ? (
                      <TreeItemLabel
                        className="w-full text-left"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          {...item.getRenameInputProps()}
                          className="flex-1 w-full rounded border bg-background px-1 text-sm outline-none focus:ring-2 focus:ring-ring"
                        />
                      </TreeItemLabel>
                    ) : (
                      <TreeItemLabel
                        className={cn(
                          "w-full text-left",
                          activeId === itemId && "bg-accent text-accent-foreground",
                        )}
                        onClick={() => onSelect(itemId)}
                        onDoubleClick={() => onRename && item.startRenaming()}
                      >
                        <span className="flex items-center gap-2 w-full min-w-0">
                          {item.isFolder() ? (
                            item.isExpanded() ? (
                              <FolderOpenIcon className="pointer-events-none size-4 shrink-0 text-muted-foreground" />
                            ) : (
                              <FolderIcon className="pointer-events-none size-4 shrink-0 text-muted-foreground" />
                            )
                          ) : (
                            <FileTypeIcon filename={item.getItemName()} extension={item.getItemData()?.extension} size={16} />
                          )}
                          <span className="flex-1 truncate">{item.getItemName()}</span>
                          {favorited && (
                            <Star
                              aria-label="Favorite"
                              data-testid="favorite-star"
                              className="pointer-events-none size-3.5 shrink-0 fill-amber-400 text-amber-400"
                            />
                          )}
                        </span>
                      </TreeItemLabel>
                    )}
                  </FileTreeContextMenu>
                </TreeItem>
              );
            })}
            <TreeDragLine />
          </Tree>
        </div>

        <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Move to Trash?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to move &quot;{deleteNodeName}&quot; to trash? You can restore it later from the trash.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirm}>Move to Trash</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  },
);

FileTree.displayName = 'FileTree';

export { FileTree };
export default FileTree;
