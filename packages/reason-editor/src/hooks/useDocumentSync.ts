/**
 * @module useDocumentSync
 * @description React hook that synchronises the in-memory document list with a
 * remote REST API database. Supports debounced saves, batch sync on an interval,
 * and per-document delete operations.
 */
import {
  useState,
  useEffect,
  useCallback,
  useRef,
  Dispatch,
  SetStateAction,
} from "react";
import { Document } from "../documents/DocumentTree";
import { toast } from "sonner";
import grab from "grab-url";

/** Configuration options for {@link useDocumentSync}. */
interface UseDocumentSyncOptions {
  /** When `false` (default) all sync operations are no-ops. */
  enableSync?: boolean;
  /** Milliseconds between automatic interval-based sync passes. Defaults to `5000`. */
  syncInterval?: number;
}

/**
 * Provides document synchronisation state and operations.
 *
 * @param documents - Current in-memory document list.
 * @param setDocuments - State setter for updating the document list.
 * @param options - Sync configuration (enable / interval).
 * @returns An object containing sync status flags and CRUD callbacks.
 */
export function useDocumentSync(
  documents: Document[],
  setDocuments: Dispatch<SetStateAction<Document[]>>,
  options: UseDocumentSyncOptions = {},
) {
  const { enableSync = false, syncInterval = 5000 } = options;
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const pendingChangesRef = useRef<Map<string, Document>>(new Map());
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  /**
   * Fetches all documents from the remote API and replaces the current
   * in-memory list. Transforms database rows into the local `Document` shape.
   *
   * @returns The loaded documents on success, or `null` on failure.
   */
  const loadFromDatabase = useCallback(async () => {
    if (!enableSync) return;

    try {
      const dbDocuments = await grab("/api/doc/documents");

      // Transform database documents to match the app's Document interface
      const transformedDocs: Document[] = dbDocuments.map((doc: any) => ({
        id: doc.id.toString(),
        title: doc.title || doc.name || "Untitled",
        content: doc.content || "",
        parentId: doc.parentId ? doc.parentId.toString() : null,
        children: [],
        isExpanded: doc.isExpanded === 1,
        isFolder: doc.isFolder === 1,
        tags: doc.metadata ? JSON.parse(doc.metadata).tags || [] : [],
        metadata: doc.metadata ? JSON.parse(doc.metadata) : undefined,
      }));

      setDocuments(transformedDocs);
      setLastSyncTime(new Date());
      return transformedDocs;
    } catch (error) {
      console.error("Error loading documents from database:", error);
      toast.error("Failed to load documents from database");
      return null;
    }
  }, [enableSync, setDocuments]);

  /**
   * Saves a single document to the database.
   * Creates a new record when the document ID is non-numeric (client-generated),
   * otherwise updates the existing record and returns the saved data.
   *
   * @param doc - The document to persist.
   * @returns The server response on success, or `null` on failure.
   */
  const saveDocument = useCallback(
    async (doc: Document) => {
      if (!enableSync) return;

      try {
        const payload = {
          name: doc.title || "Untitled",
          title: doc.title || "Untitled",
          content: doc.content || "",
          parentId: doc.parentId ? parseInt(doc.parentId) : null,
          isFolder: doc.isFolder || false,
          metadata: {
            tags: doc.tags || [],
            isExpanded: doc.isExpanded || false,
            ...((doc as any).metadata || {}),
          },
        };

        // Check if document exists in database (has numeric ID)
        const isNewDoc = isNaN(parseInt(doc.id));

        if (isNewDoc) {
          // Create new document
          const newDoc = await grab("/api/doc/documents", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: payload,
          });

          // Update the document ID with the database ID
          setDocuments((docs) =>
            docs.map((d) =>
              d.id === doc.id ? { ...d, id: newDoc.id.toString() } : d,
            ),
          );

          return newDoc;
        } else {
          // Update existing document
          return await grab(`doc/documents/${doc.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: payload,
          });
        }
      } catch (error) {
        console.error("Error saving document:", error);
        toast.error("Failed to save document to database");
        return null;
      }
    },
    [enableSync, setDocuments],
  );

  /**
   * Flushes all accumulated pending changes by calling `saveDocument` for each
   * entry in the pending-changes map, then clears the map on success.
   */
  const syncPendingChanges = useCallback(async () => {
    if (!enableSync || pendingChangesRef.current.size === 0) return;

    setIsSyncing(true);

    try {
      const changes = Array.from(pendingChangesRef.current.values());
      await Promise.all(changes.map((doc) => saveDocument(doc)));

      pendingChangesRef.current.clear();
      setLastSyncTime(new Date());
    } catch (error) {
      console.error("Error syncing changes:", error);
    } finally {
      setIsSyncing(false);
    }
  }, [enableSync, saveDocument]);

  /**
   * Adds a document to the pending-changes queue and debounces the sync
   * operation by 2 seconds from the last call.
   *
   * @param doc - The document whose latest state should be synced.
   */
  const queueDocumentForSync = useCallback(
    (doc: Document) => {
      if (!enableSync) return;

      pendingChangesRef.current.set(doc.id, doc);

      // Debounce sync
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }

      syncTimeoutRef.current = setTimeout(() => {
        syncPendingChanges();
      }, 2000); // Wait 2 seconds after last change before syncing
    },
    [enableSync, syncPendingChanges],
  );

  /**
   * Permanently deletes a document from the remote API database.
   *
   * @param docId - ID of the document to remove.
   * @returns `true` on success, `false` on failure.
   */
  const deleteDocument = useCallback(
    async (docId: string) => {
      if (!enableSync) return;

      try {
        await grab(`doc/documents/${docId}`, {
          method: "DELETE",
        });

        return true;
      } catch (error) {
        console.error("Error deleting document:", error);
        toast.error("Failed to delete document from database");
        return false;
      }
    },
    [enableSync],
  );

  // Auto-sync on interval
  useEffect(() => {
    if (!enableSync || syncInterval <= 0) return;

    const interval = setInterval(() => {
      if (pendingChangesRef.current.size > 0) {
        syncPendingChanges();
      }
    }, syncInterval);

    return () => clearInterval(interval);
  }, [enableSync, syncInterval, syncPendingChanges]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

  return {
    isSyncing,
    lastSyncTime,
    loadFromDatabase,
    saveDocument,
    deleteDocument,
    queueDocumentForSync,
    syncPendingChanges,
  };
}
