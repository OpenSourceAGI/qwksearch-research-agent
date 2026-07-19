/**
 * @module DraggableDocumentTree
 * @description Drag-and-drop capable version of `DocumentTree`. Tree nodes
 * expose a grip handle and emit drop events (before / after / child) that are
 * resolved via the `onMove` callback.
 */
import { useState, DragEvent } from 'react';
import { ChevronRight, FileText, GripVertical } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../lib/utils';
import { Document } from './DocumentTree';
import { DocumentContextMenu } from './DocumentContextMenu';

/** Props for the {@link DraggableDocumentTree} component. */
interface DraggableDocumentTreeProps {
  documents: Document[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onAdd: (parentId: string | null, isFolder?: boolean) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onToggleExpand: (id: string) => void;
  onMove: (draggedId: string, targetId: string | null, position: 'before' | 'after' | 'child') => void;
  onManageTags?: (id: string) => void;
}

/** Props for the internal drag-and-drop {@link TreeNode} component. */
interface TreeNodeProps {
  document: Document;
  level: number;
  isActive: boolean;
  activeId: string | null;
  onSelect: (id: string) => void;
  onAdd: (parentId: string, isFolder?: boolean) => void;
  onAddSibling: (parentId: string | null, isFolder?: boolean) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onToggleExpand: (id: string) => void;
  onDragStart: (id: string) => void;
  onDragOver: (id: string, position: 'before' | 'after' | 'child') => void;
  onDrop: () => void;
  draggedId: string | null;
  dropTarget: { id: string; position: 'before' | 'after' | 'child' } | null;
  onManageTags?: (id: string) => void;
}

/**
 * A single tree row with drag-handle, expand/collapse, context-menu, and
 * visual drop-zone indicators (before, after, child).
 */
const TreeNode = ({
  document,
  level,
  isActive,
  activeId,
  onSelect,
  onAdd,
  onAddSibling,
  onDelete,
  onDuplicate,
  onToggleExpand,
  onDragStart,
  onDragOver,
  onDrop,
  draggedId,
  dropTarget,
  onManageTags,
}: TreeNodeProps) => {
  const hasChildren = document.children && document.children.length > 0;
  const isDragging = draggedId === document.id;
  const isDropTarget = dropTarget?.id === document.id;

  const handleDragStart = (e: DragEvent) => {
    e.stopPropagation();
    onDragStart(document.id);
  };

  const handleDragOver = (e: DragEvent, position: 'before' | 'after' | 'child') => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedId !== document.id) {
      onDragOver(document.id, position);
    }
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDrop();
  };

  return (
    <div>
      {/* Drop zone before */}
      <div
        className={cn(
          'h-1 transition-colors',
          isDropTarget && dropTarget?.position === 'before' && 'bg-primary'
        )}
        onDragOver={(e) => handleDragOver(e, 'before')}
        onDrop={handleDrop}
      />

      <DocumentContextMenu
        onAddChild={() => onAdd(document.id, false)}
        onAddChildFolder={() => onAdd(document.id, true)}
        onAddSibling={() => onAddSibling(document.parentId, false)}
        onAddSiblingFolder={() => onAddSibling(document.parentId, true)}
        onRename={() => {
          onSelect(document.id);
          // Focus will be handled by the editor
        }}
        onDuplicate={() => onDuplicate(document.id)}
        onDelete={() => onDelete(document.id)}
        onManageTags={() => onManageTags?.(document.id)}
      >
        <div
          onDragOver={(e) => handleDragOver(e, 'child')}
          onDrop={handleDrop}
          className={cn(
            'group flex items-center gap-1 px-2 py-1.5 hover:bg-sidebar-accent rounded-md cursor-pointer transition-colors',
            isActive && 'bg-sidebar-accent',
            isDragging && 'opacity-50',
            isDropTarget && dropTarget?.position === 'child' && 'ring-2 ring-primary'
          )}
          style={{ paddingLeft: `${level * 12 + 8}px` }}
        >
          <div
            draggable
            onDragStart={handleDragStart}
            className="cursor-grab active:cursor-grabbing"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>

          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'h-5 w-5 p-0 hover:bg-transparent',
              !hasChildren && 'invisible'
            )}
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(document.id);
            }}
          >
            <ChevronRight
              className={cn(
                'h-3 w-3 transition-transform',
                document.isExpanded && 'rotate-90'
              )}
            />
          </Button>

          <div
            className="flex flex-1 items-center gap-2 min-w-0"
            onClick={() => onSelect(document.id)}
          >
            <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            <span className="flex-1 truncate text-sm">{document.title || 'Untitled'}</span>
          </div>
        </div>
      </DocumentContextMenu>

      {/* Drop zone after */}
      <div
        className={cn(
          'h-1 transition-colors',
          isDropTarget && dropTarget?.position === 'after' && 'bg-primary'
        )}
        onDragOver={(e) => handleDragOver(e, 'after')}
        onDrop={handleDrop}
      />

      {document.isExpanded && document.children && (
        <div>
          {document.children.map((child) => (
            <TreeNode
              key={child.id}
              document={child}
              level={level + 1}
              isActive={child.id === activeId}
              activeId={activeId}
              onSelect={onSelect}
              onAdd={onAdd}
              onAddSibling={onAddSibling}
              onDelete={onDelete}
              onDuplicate={onDuplicate}
              onToggleExpand={onToggleExpand}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDrop={onDrop}
              draggedId={draggedId}
              dropTarget={dropTarget}
              onManageTags={onManageTags}
            />
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Full drag-and-drop document tree. Tracks the currently dragged ID and
 * the current drop target, then calls `onMove` when the drop is committed.
 */
export const DraggableDocumentTree = ({
  documents,
  activeId,
  onSelect,
  onAdd,
  onDelete,
  onDuplicate,
  onToggleExpand,
  onMove,
  onManageTags,
}: DraggableDocumentTreeProps) => {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: string; position: 'before' | 'after' | 'child' } | null>(null);

  const handleDragStart = (id: string) => {
    setDraggedId(id);
  };

  const handleDragOver = (id: string, position: 'before' | 'after' | 'child') => {
    setDropTarget({ id, position });
  };

  const handleDrop = () => {
    if (draggedId && dropTarget) {
      onMove(draggedId, dropTarget.id, dropTarget.position);
    }
    setDraggedId(null);
    setDropTarget(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDropTarget(null);
  };

  return (
    <div onDragEnd={handleDragEnd} className="flex-1 overflow-auto p-2">
      {documents.map((doc) => (
        <TreeNode
          key={doc.id}
          document={doc}
          level={0}
          isActive={doc.id === activeId}
          activeId={activeId}
          onSelect={onSelect}
          onAdd={(parentId, isFolder) => onAdd(parentId, isFolder)}
          onAddSibling={(parentId, isFolder) => onAdd(parentId, isFolder)}
          onDelete={onDelete}
          onDuplicate={onDuplicate}
          onToggleExpand={onToggleExpand}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          draggedId={draggedId}
          dropTarget={dropTarget}
          onManageTags={onManageTags}
        />
      ))}
    </div>
  );
};
