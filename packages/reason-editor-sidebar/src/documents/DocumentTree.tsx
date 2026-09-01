/**
 * @module DocumentTree
 * @description Recursive tree view of the document hierarchy. Exports the core
 * `Document` interface used throughout the application, and renders
 * collapsible tree nodes with add/delete inline actions.
 */
import { ChevronRight, FileText, Plus, Trash2, FolderOpen } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../utils/cn';

/**
 * Core document entity shared across the application.
 * A document may be a regular note or a folder (when `isFolder` is `true`).
 */
export interface Document {
  /** Unique string identifier, typically derived from `Date.now()`. */
  id: string;
  /** Human-readable title shown in the sidebar and tab bar. */
  title: string;
  /** Serialised HTML content of the document body. */
  content: string;
  /** ID of the parent document, or `null` for root-level entries. */
  parentId: string | null;
  /** Nested children populated by the tree-builder; not persisted directly. */
  children?: Document[];
  /** Whether the tree node is currently open (showing children). */
  isExpanded?: boolean;
  /** When `true`, the item acts as a folder container rather than a note. */
  isFolder?: boolean;
  /** Archived status — archived items may be hidden from the main view. */
  isArchived?: boolean;
  /** Soft-deleted flag — items are moved to trash before permanent deletion. */
  isDeleted?: boolean;
  /** List of user-defined tag strings. */
  tags?: string[];
  /** Sharing/visibility configuration for this document. */
  sharing?: {
    /** Whether the document is publicly accessible via its share link. */
    isPublic: boolean;
    /** Per-user sharing entries. */
    sharedWith?: Array<{
      /** Recipient e-mail address. */
      email: string;
      /** Access level granted to the recipient. */
      role: 'viewer' | 'editor' | 'commentor';
      /** ISO timestamp when access was granted. */
      sharedAt: string;
    }>;
    /** Publicly-accessible share URL. */
    shareLink?: string;
    /** Linked Google Docs file identifier. */
    googleDocId?: string;
  };
}

/** Props for the {@link DocumentTree} component. */
interface DocumentTreeProps {
  documents: Document[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onAdd: (parentId: string | null) => void;
  onDelete: (id: string) => void;
  onToggleExpand: (id: string) => void;
}

/** Props for the internal {@link TreeNode} recursive component. */
interface TreeNodeProps {
  document: Document;
  level: number;
  isActive: boolean;
  activeId: string | null;
  onSelect: (id: string) => void;
  onAdd: (parentId: string) => void;
  onDelete: (id: string) => void;
  onToggleExpand: (id: string) => void;
}

/**
 * Recursive tree node that renders a single document row with expand/collapse,
 * select, add-child, and delete actions. Renders child nodes when expanded.
 */
const TreeNode = ({
  document,
  level,
  isActive,
  activeId,
  onSelect,
  onAdd,
  onDelete,
  onToggleExpand,
}: TreeNodeProps) => {
  const hasChildren = document.children && document.children.length > 0;

  return (
    <div>
      <div
        className={cn(
          'group flex items-center gap-1 px-2 py-1.5 hover:bg-sidebar-accent rounded-md cursor-pointer transition-colors',
          isActive && 'bg-sidebar-accent'
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
      >
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

        <div className="opacity-0 group-hover:opacity-100 flex gap-0.5 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={(e) => {
              e.stopPropagation();
              onAdd(document.id);
            }}
            title="Add child note"
          >
            <Plus className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-destructive hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(document.id);
            }}
            title="Delete note"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

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
              onDelete={onDelete}
              onToggleExpand={onToggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Renders the complete document hierarchy as a scrollable sidebar panel.
 * Root-level documents are iterated and each is rendered as a `TreeNode`.
 */
export const DocumentTree = ({
  documents,
  activeId,
  onSelect,
  onAdd,
  onDelete,
  onToggleExpand,
}: DocumentTreeProps) => {
  return (
    <div className="flex h-full flex-col bg-sidebar-background">
      <div className="border-b border-sidebar-border px-4 py-4">
        <div className="flex items-center gap-2">
          <FolderOpen className="h-5 w-5 text-sidebar-primary" />
          <h2 className="font-serif text-lg font-semibold text-sidebar-foreground">Notes</h2>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-2">
        {documents.map((doc) => (
          <TreeNode
            key={doc.id}
            document={doc}
            level={0}
            isActive={doc.id === activeId}
            activeId={activeId}
            onSelect={onSelect}
            onAdd={onAdd}
            onDelete={onDelete}
            onToggleExpand={onToggleExpand}
          />
        ))}
      </div>

      <div className="border-t border-sidebar-border p-3">
        <Button
          onClick={() => onAdd(null)}
          className="w-full bg-sidebar-primary hover:bg-sidebar-primary/90 text-sidebar-primary-foreground"
          size="sm"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Note
        </Button>
      </div>
    </div>
  );
};
