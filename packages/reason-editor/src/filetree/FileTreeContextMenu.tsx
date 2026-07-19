import { useRef } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "../ui/context-menu";
import {
  FolderIcon,
  FilePlus,
  Copy,
  Trash2,
  Pencil,
  Clipboard,
  ClipboardPaste,
  FileText,
  Plus,
  FolderPlus,
  Tag,
} from "lucide-react";

interface FileTreeContextMenuProps {
  children: React.ReactNode;
  itemId: string;
  isFolder: boolean;
  hasCopiedItem: boolean;
  onAddChild?: (itemId: string) => void;
  onAddChildFolder?: (itemId: string) => void;
  onAddSibling?: (itemId: string) => void;
  onAddSiblingFolder?: (itemId: string) => void;
  onRename?: (itemId: string) => void;
  onDuplicate?: (itemId: string) => void;
  onCopy?: (itemId: string) => void;
  onPaste?: (targetId: string | null) => void;
  onDelete?: (itemId: string) => void;
  onManageTags?: (itemId: string) => void;
}

/**
 * Context menu wrapper component for file tree items
 * Provides all context menu actions with keyboard shortcuts
 */
const LONG_PRESS_DELAY_MS = 500;
const LONG_PRESS_MOVE_THRESHOLD_PX = 10;

export const FileTreeContextMenu = ({
  children,
  itemId,
  isFolder,
  hasCopiedItem,
  onAddChild,
  onAddChildFolder,
  onAddSibling,
  onAddSiblingFolder,
  onRename,
  onDuplicate,
  onCopy,
  onPaste,
  onDelete,
  onManageTags,
}: FileTreeContextMenuProps) => {
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);

  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
    const el = e.currentTarget;
    const touchX = touch.clientX;
    const touchY = touch.clientY;

    longPressTimerRef.current = setTimeout(() => {
      el.dispatchEvent(
        new MouseEvent("contextmenu", {
          bubbles: true,
          cancelable: true,
          clientX: touchX,
          clientY: touchY,
        }),
      );
    }, LONG_PRESS_DELAY_MS);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!touchStartPosRef.current) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartPosRef.current.x);
    const dy = Math.abs(touch.clientY - touchStartPosRef.current.y);
    if (dx > LONG_PRESS_MOVE_THRESHOLD_PX || dy > LONG_PRESS_MOVE_THRESHOLD_PX) {
      cancelLongPress();
    }
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className="contents"
          onTouchStart={handleTouchStart}
          onTouchEnd={cancelLongPress}
          onTouchCancel={cancelLongPress}
          onTouchMove={handleTouchMove}
        >
          {children}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>


        <ContextMenuItem
          onClick={() => isFolder ? onAddChild?.(itemId) : onAddSibling?.(itemId)}
          disabled={isFolder ? !onAddChild : !onAddSibling}
        >
          <FileText className="mr-2 h-4 w-4" />
          Add Note
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => isFolder ? onAddChildFolder?.(itemId) : onAddSiblingFolder?.(itemId)}
          disabled={isFolder ? !onAddChildFolder : !onAddSiblingFolder}
        >
          <FolderIcon className="mr-2 h-4 w-4" />
          Add Folder
        </ContextMenuItem>


        {/* Rename */}
        <ContextMenuItem
          onClick={() => onRename?.(itemId)}
          disabled={!onRename}
        >
          <Pencil className="mr-2 h-4 w-4" />
          Rename
          <ContextMenuShortcut>F2</ContextMenuShortcut>
        </ContextMenuItem>

        {/* Duplicate */}
        <ContextMenuItem
          onClick={() => onDuplicate?.(itemId)}
          disabled={!onDuplicate}
        >
          <Copy className="mr-2 h-4 w-4" />
          Duplicate
          <ContextMenuShortcut>⌘D</ContextMenuShortcut>
        </ContextMenuItem>

        <ContextMenuSeparator />

        {/* Copy */}
        <ContextMenuItem
          onClick={() => onCopy?.(itemId)}
          disabled={!onCopy}
        >
          <Clipboard className="mr-2 h-4 w-4" />
          Copy
          <ContextMenuShortcut>⌘C</ContextMenuShortcut>
        </ContextMenuItem>

        {/* Paste */}
        <ContextMenuItem
          onClick={() => {
            const targetId = isFolder ? itemId : null;
            onPaste?.(targetId);
          }}
          disabled={!hasCopiedItem || !onPaste}
        >
          <ClipboardPaste className="mr-2 h-4 w-4" />
          Paste
          <ContextMenuShortcut>⌘V</ContextMenuShortcut>
        </ContextMenuItem>

        {/* Manage Tags */}
        <ContextMenuItem
          onClick={() => onManageTags?.(itemId)}
          disabled={!onManageTags}
        >
          <Tag className="mr-2 h-4 w-4" />
          Manage Tags
        </ContextMenuItem>

        <ContextMenuSeparator />

        {/* Delete */}
        <ContextMenuItem
          onClick={() => onDelete?.(itemId)}
          disabled={!onDelete}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
          <ContextMenuShortcut>Del</ContextMenuShortcut>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};

