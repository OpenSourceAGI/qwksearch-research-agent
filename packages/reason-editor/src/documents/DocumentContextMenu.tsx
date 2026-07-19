/**
 * @module DocumentContextMenu
 * @description Right-click context menu for a document tree node, exposing
 * add-child, add-sibling, rename, duplicate, manage-tags, and delete actions.
 */
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
} from '../ui/context-menu';
import { Plus, Trash2, Copy, Edit, FolderPlus, Tag, Folder, FileText } from 'lucide-react';

/** Props for the {@link DocumentContextMenu} component. */
interface DocumentContextMenuProps {
  /** Menu trigger — typically the tree node row. */
  children: React.ReactNode;
  /** Create a child note under the current node. */
  onAddChild: () => void;
  /** Create a child folder under the current node. */
  onAddChildFolder: () => void;
  /** Create a sibling note next to the current node. */
  onAddSibling: () => void;
  /** Create a sibling folder next to the current node. */
  onAddSiblingFolder: () => void;
  /** Begin inline rename of the current node. */
  onRename: () => void;
  /** Duplicate the document. */
  onDuplicate: () => void;
  /** Move the document to the trash. */
  onDelete: () => void;
  /** Open the tag management dialog for this document. */
  onManageTags: () => void;
}

/**
 * Wraps its `children` in a radix-ui `ContextMenu` and renders a grouped
 * list of document actions. Includes nested submenus for "Add Child" and
 * "Add Sibling" to support both note and folder creation.
 */
export const DocumentContextMenu = ({
  children,
  onAddChild,
  onAddChildFolder,
  onAddSibling,
  onAddSiblingFolder,
  onRename,
  onDuplicate,
  onDelete,
  onManageTags,
}: DocumentContextMenuProps) => {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <FolderPlus className="mr-2 h-4 w-4" />
            Add Child
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuItem onClick={onAddChild}>
              <FileText className="mr-2 h-4 w-4" />
              Note
            </ContextMenuItem>
            <ContextMenuItem onClick={onAddChildFolder}>
              <Folder className="mr-2 h-4 w-4" />
              Folder
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <Plus className="mr-2 h-4 w-4" />
            Add Sibling
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuItem onClick={onAddSibling}>
              <FileText className="mr-2 h-4 w-4" />
              Note
            </ContextMenuItem>
            <ContextMenuItem onClick={onAddSiblingFolder}>
              <Folder className="mr-2 h-4 w-4" />
              Folder
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={onRename}>
          <Edit className="mr-2 h-4 w-4" />
          Rename
        </ContextMenuItem>
        <ContextMenuItem onClick={onDuplicate}>
          <Copy className="mr-2 h-4 w-4" />
          Duplicate
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={onManageTags}>
          <Tag className="mr-2 h-4 w-4" />
          Manage Tags
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};
