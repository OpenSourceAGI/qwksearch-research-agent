/**
 * @module useFileTreeOperations
 * @description Hook that encapsulates all imperative file-tree operations
 * exposed via the DocumentTreeHandle ref (expand-all, collapse-all,
 * scroll-to-active, etc.).
 */
import { useCallback, useState } from "react";
import type { Document } from "../documents/DocumentTree";

/**
 * Hook that provides all file tree context menu operations
 * Manages state and handlers for copy/paste, rename, delete, etc.
 */
export function useFileTreeOperations(
  documents: Document[],
  onDocumentUpdate: (id: string, updates: Partial<Document>) => void,
  onDocumentCreate: (parentId: string | null, isFolder: boolean) => void,
  onDocumentDelete: (id: string) => void,
  onDocumentDuplicate: (id: string) => void,
) {
  const [copiedNodeId, setCopiedNodeId] = useState<string | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Find document by ID
  const findDocument = useCallback(
    (id: string): Document | null => {
      const find = (docs: Document[]): Document | null => {
        for (const doc of docs) {
          if (doc.id === id) return doc;
          if (doc.children) {
            const found = find(doc.children);
            if (found) return found;
          }
        }
        return null;
      };
      return find(documents);
    },
    [documents]
  );

  // Get parent of a document
  const findParent = useCallback(
    (id: string): Document | null => {
      const find = (docs: Document[]): Document | null => {
        for (const doc of docs) {
          if (doc.children?.some((child) => child.id === id)) {
            return doc;
          }
          if (doc.children) {
            const found = find(doc.children);
            if (found) return found;
          }
        }
        return null;
      };
      return find(documents);
    },
    [documents]
  );

  // Get siblings of a document
  const getSiblings = useCallback(
    (id: string): Document[] => {
      const parent = findParent(id);
      if (parent) {
        return parent.children || [];
      }
      // Root level siblings
      return documents.filter((doc) => !doc.parentId);
    },
    [documents, findParent]
  );

  // Add child note
  const handleAddChild = useCallback(
    (parentId: string) => {
      onDocumentCreate(parentId, false);
    },
    [onDocumentCreate]
  );

  // Add child folder
  const handleAddChildFolder = useCallback(
    (parentId: string) => {
      onDocumentCreate(parentId, true);
    },
    [onDocumentCreate]
  );

  // Add sibling note
  const handleAddSibling = useCallback(
    (itemId: string) => {
      const doc = findDocument(itemId);
      if (doc) {
        onDocumentCreate(doc.parentId, false);
      }
    },
    [findDocument, onDocumentCreate]
  );

  // Add sibling folder
  const handleAddSiblingFolder = useCallback(
    (itemId: string) => {
      const doc = findDocument(itemId);
      if (doc) {
        onDocumentCreate(doc.parentId, true);
      }
    },
    [findDocument, onDocumentCreate]
  );

  // Rename document
  const handleRename = useCallback(
    (id: string, newTitle: string) => {
      onDocumentUpdate(id, { title: newTitle });
    },
    [onDocumentUpdate]
  );

  // Start editing
  const handleStartEdit = useCallback((id: string) => {
    setEditingNodeId(id);
  }, []);

  // Cancel editing
  const handleCancelEdit = useCallback(() => {
    setEditingNodeId(null);
  }, []);

  // Duplicate document
  const handleDuplicate = useCallback(
    (id: string) => {
      onDocumentDuplicate(id);
    },
    [onDocumentDuplicate]
  );

  // Copy document
  const handleCopy = useCallback((id: string) => {
    setCopiedNodeId(id);
  }, []);

  // Paste document
  const handlePaste = useCallback(
    (_targetId: string | null) => {
      if (!copiedNodeId) return;

      const copiedDoc = findDocument(copiedNodeId);
      if (!copiedDoc) return;

      // Create a deep copy of the document
      onDocumentDuplicate(copiedNodeId);

      // TODO: Move the duplicated document to the target location
      // This would require additional move logic in the parent component
    },
    [copiedNodeId, findDocument, onDocumentDuplicate]
  );

  // Delete document (show confirmation)
  const handleDeleteRequest = useCallback((id: string) => {
    setDeleteConfirmId(id);
  }, []);

  // Confirm delete
  const handleDeleteConfirm = useCallback(() => {
    if (deleteConfirmId) {
      onDocumentDelete(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  }, [deleteConfirmId, onDocumentDelete]);

  // Cancel delete
  const handleDeleteCancel = useCallback(() => {
    setDeleteConfirmId(null);
  }, []);

  // Manage tags (placeholder)
  const handleManageTags = useCallback(
    (id: string) => {
      // TODO: Implement tag management dialog
      console.log("Manage tags for document:", id);
    },
    []
  );

  return {
    // State
    copiedNodeId,
    editingNodeId,
    deleteConfirmId,

    // Handlers
    handleAddChild,
    handleAddChildFolder,
    handleAddSibling,
    handleAddSiblingFolder,
    handleRename,
    handleStartEdit,
    handleCancelEdit,
    handleDuplicate,
    handleCopy,
    handlePaste,
    handleDeleteRequest,
    handleDeleteConfirm,
    handleDeleteCancel,
    handleManageTags,

    // Utilities
    findDocument,
    findParent,
    getSiblings,
  };
}
