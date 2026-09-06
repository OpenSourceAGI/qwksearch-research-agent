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
import { FolderIcon, FolderOpenIcon } from "lucide-react";
import { FileTypeIcon } from "../app-ui/FileTypeIcon";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";

import type { Document } from "../documents/DocumentTree";

export type DocumentTreeHandle = {
  collapseAll: () => void;
  edit: (nodeId: string) => void;
  expandAll: () => void;
  expandToLevel: (level: number) => void;
  cancelExpand: () => void;
  /** Deepest folder level currently fully expanded (0 = fully collapsed). */
  getExpandLevel: () => number;
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
}

const ROOT_ID = "__root__";
const INDENT = 20;

/** Folder ids grouped by nesting depth (index 0 = top-level folders). */
function getFolderIdsByLevel(items: Record<string, FileTreeItem>): string[][] {
  const levels: string[][] = [];
  let frontier = [ROOT_ID];

  while (frontier.length > 0) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const childId of items[id]?.children ?? []) {
        if (items[childId]?.isFolder) next.push(childId);
      }
    }
    if (next.length === 0) break;
    levels.push(next);
    frontier = next;
  }

  return levels;
}

/** Folder ids reachable within `level` levels of nesting (1 = top-level folders). */
function getFolderIdsUpToLevel(items: Record<string, FileTreeItem>, level: number): string[] {
  if (level <= 0) return [];
  return getFolderIdsByLevel(items).slice(0, level).flat();
}

/**
 * Infers the deepest folder level that is currently fully expanded: the
 * largest depth `L` such that every folder at depth <= L is expanded.
 * Returns 0 when any top-level folder is collapsed.
 */
function getExpandedLevel(items: Record<string, FileTreeItem>, expandedItems: string[]): number {
  const expanded = new Set(expandedItems);
  let level = 0;
  for (const idsAtDepth of getFolderIdsByLevel(items)) {
    if (!idsAtDepth.every((id) => expanded.has(id))) break;
    level++;
  }
  return level;
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
  ({ activeId, documents, onMove, onRename, onSelect, onDelete, onDuplicate, onAddChild, onAddChildFolder, onAddSibling, onAddSiblingFolder, onCopy, onPaste, onNewFile: _onNewFile, onNewFolder: _onNewFolder, onManageTags }, ref) => {
    const items = useMemo(() => {
      const built = buildItems(documents);
      return built;
    }, [documents]);
    const expandedItems = useMemo(
      () => documents.filter((doc) => doc.isFolder && doc.isExpanded).map((doc) => doc.id),
      [documents],
    );

    const [state, setState] = useState<Partial<TreeState<FileTreeItem>>>({
      expandedItems,
      selectedItems: activeId ? [activeId] : [],
    });
    const [copiedNodeId, setCopiedNodeId] = useState<string | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    // Must survive re-renders so a queued expandAll can actually be cancelled.
    const expandCancelToken = useRef(false);

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
          const parentChildren = (items[target.item.getId()]?.children ?? []).filter(
            (childId) => !draggedIds.includes(childId),
          );

          const siblingAtIndex = parentChildren[target.childIndex];
          if (siblingAtIndex) {
            for (const draggedId of orderedDraggedIds) {
              onMove(draggedId, siblingAtIndex, "before");
            }
            return;
          }

          const previousSibling = parentChildren[target.childIndex - 1];
          if (previousSibling) {
            for (const draggedId of orderedDraggedIds) {
              onMove(draggedId, previousSibling, "after");
            }
            return;
          }

          moveAsChild(parentId);
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

    useImperativeHandle(ref, () => ({
      collapseAll: () => {
        expandCancelToken.current = true;
        tree.collapseAll();
      },
      edit: (nodeId: string) => {
        if (onRename) {
          tree.getItemInstance(nodeId).startRenaming();
        }
      },
      expandAll: () => {
        expandCancelToken.current = false;
        tree.expandAll(expandCancelToken);
      },
      expandToLevel: (level: number) => {
        expandCancelToken.current = true;
        const ids = getFolderIdsUpToLevel(items, level);
        setState((prev) => ({ ...prev, expandedItems: ids }));
      },
      cancelExpand: () => {
        expandCancelToken.current = true;
      },
      getExpandLevel: () => getExpandedLevel(items, state.expandedItems ?? []),
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
    const treeItems = tree.getItems();

    return (
      <>
        <div className="flex h-full flex-col gap-2 overflow-auto">
          <Tree indent={INDENT} tree={tree}>
            <AssistiveTreeDescription tree={tree} />
            {treeItems.map((item) => {
              const itemId = item.getId();
              if (itemId === ROOT_ID) return null;

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
                            <FileTypeIcon filename={item.getItemName()} size={16} />
                          )}
                          <span className="flex-1 truncate">{item.getItemName()}</span>
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
