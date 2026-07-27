/**
 * @module documentUtils
 * @description Utility functions for document tree operations: building
 * flat lists from nested trees, collecting descendant IDs, and resolving
 * drop positions for drag-and-drop reordering.
 */
import type { Document } from "../document-management/DocumentTree";

/**
 * Utility functions for document tree operations
 */

/**
 * Generate a unique ID for a new document
 */
export function generateDocumentId(): string {
  return `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Find a document by ID in the tree
 */
export function findDocumentById(documents: Document[], id: string): Document | null {
  for (const doc of documents) {
    if (doc.id === id) return doc;
    if (doc.children) {
      const found = findDocumentById(doc.children, id);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Find the parent document of a given document ID
 */
export function findParentDocument(documents: Document[], id: string): Document | null {
  for (const doc of documents) {
    if (doc.children?.some((child) => child.id === id)) {
      return doc;
    }
    if (doc.children) {
      const found = findParentDocument(doc.children, id);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Get all siblings of a document (including itself)
 */
export function getSiblings(documents: Document[], id: string): Document[] {
  const parent = findParentDocument(documents, id);
  if (parent) {
    return parent.children || [];
  }
  // Root level siblings
  return documents.filter((doc) => !doc.parentId);
}

/**
 * Create a new document with default values
 */
export function createDocument(
  parentId: string | null,
  isFolder: boolean = false
): Document {
  return {
    id: generateDocumentId(),
    title: isFolder ? "New Folder" : "Untitled",
    content: "",
    parentId,
    isFolder,
    isExpanded: false,
    isArchived: false,
    isDeleted: false,
    tags: [],
    children: [],
  };
}

/**
 * Deep clone a document (for duplication)
 * Generates new IDs for the cloned document and all children
 */
export function cloneDocument(doc: Document, newParentId?: string | null): Document {
  const cloned: Document = {
    ...doc,
    id: generateDocumentId(),
    title: `${doc.title} (Copy)`,
    parentId: newParentId !== undefined ? newParentId : doc.parentId,
    children: doc.children?.map((child) => cloneDocument(child, undefined)),
  };
  return cloned;
}

/**
 * Flatten a document tree into a flat array
 */
export function flattenDocuments(documents: Document[]): Document[] {
  const result: Document[] = [];
  for (const doc of documents) {
    result.push(doc);
    if (doc.children) {
      result.push(...flattenDocuments(doc.children));
    }
  }
  return result;
}

/**
 * Build a tree structure from flat documents array
 */
export function buildDocumentTree(documents: Document[]): Document[] {
  const docMap = new Map<string, Document>();
  const roots: Document[] = [];

  // Create a map of all documents
  for (const doc of documents) {
    docMap.set(doc.id, { ...doc, children: [] });
  }

  // Build the tree
  for (const doc of docMap.values()) {
    if (doc.parentId) {
      const parent = docMap.get(doc.parentId);
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(doc);
      } else {
        // Parent not found, treat as root
        roots.push(doc);
      }
    } else {
      roots.push(doc);
    }
  }

  return roots;
}

/**
 * Update a document in the tree
 */
export function updateDocument(
  documents: Document[],
  id: string,
  updates: Partial<Document>
): Document[] {
  return documents.map((doc) => {
    if (doc.id === id) {
      return { ...doc, ...updates };
    }
    if (doc.children) {
      return {
        ...doc,
        children: updateDocument(doc.children, id, updates),
      };
    }
    return doc;
  });
}

/**
 * Delete a document from the tree
 */
export function deleteDocument(documents: Document[], id: string): Document[] {
  return documents
    .filter((doc) => doc.id !== id)
    .map((doc) => {
      if (doc.children) {
        return {
          ...doc,
          children: deleteDocument(doc.children, id),
        };
      }
      return doc;
    });
}

/**
 * Add a document to the tree
 */
export function addDocument(
  documents: Document[],
  newDoc: Document,
  parentId: string | null
): Document[] {
  if (!parentId) {
    // Add to root
    return [...documents, newDoc];
  }

  return documents.map((doc) => {
    if (doc.id === parentId) {
      return {
        ...doc,
        children: [...(doc.children || []), newDoc],
      };
    }
    if (doc.children) {
      return {
        ...doc,
        children: addDocument(doc.children, newDoc, parentId),
      };
    }
    return doc;
  });
}

/**
 * Move a document to a new position in the tree
 */
export function moveDocument(
  documents: Document[],
  draggedId: string,
  targetId: string | null,
  position: "before" | "after" | "child"
): Document[] {
  const draggedDoc = findDocumentById(documents, draggedId);
  if (!draggedDoc) return documents;

  // Remove from current position
  let updatedDocs = deleteDocument(documents, draggedId);

  if (position === "child") {
    // Add as child of target
    updatedDocs = addDocument(updatedDocs, draggedDoc, targetId);
  } else {
    // Add as sibling of target
    const target = targetId ? findDocumentById(updatedDocs, targetId) : null;
    const targetParentId = target?.parentId || null;

    // Add to parent's children
    if (!targetParentId) {
      // Root level
      const targetIndex = updatedDocs.findIndex((d) => d.id === targetId);
      const insertIndex = position === "before" ? targetIndex : targetIndex + 1;
      updatedDocs.splice(insertIndex, 0, { ...draggedDoc, parentId: null });
    } else {
      // Nested level
      updatedDocs = updatedDocs.map((doc) => {
        if (doc.id === targetParentId) {
          const children = doc.children || [];
          const targetIndex = children.findIndex((c) => c.id === targetId);
          const insertIndex = position === "before" ? targetIndex : targetIndex + 1;
          const newChildren = [...children];
          newChildren.splice(insertIndex, 0, { ...draggedDoc, parentId: targetParentId });
          return { ...doc, children: newChildren };
        }
        if (doc.children) {
          return {
            ...doc,
            children: moveDocument(doc.children, draggedId, targetId, position),
          };
        }
        return doc;
      });
    }
  }

  return updatedDocs;
}

/**
 * Check if a document is an ancestor of another document
 */
export function isAncestor(
  documents: Document[],
  ancestorId: string,
  descendantId: string
): boolean {
  const ancestor = findDocumentById(documents, ancestorId);
  if (!ancestor) return false;

  const checkChildren = (doc: Document): boolean => {
    if (doc.id === descendantId) return true;
    return doc.children?.some((child) => checkChildren(child)) || false;
  };

  return checkChildren(ancestor);
}
