/**
 * The Reason Editor's document list — a lighter-weight view onto the same data
 * the production file-tree already owns (`src/documents/DocumentTree.tsx`), not
 * a second store. Both read and write the `REASON-documents` localStorage
 * array, the same key `apps/qwksearch-web/lib/reason-demo/document-api.ts`
 * loads a single document from, so a document created here shows up in the real
 * app's sidebar and vice versa.
 *
 * Kept deliberately small: a flat, root-level list with create/rename/delete —
 * "the editor for the sidebar items" the dual-engine workspace needs — rather
 * than the full nested tree (drag-and-drop, folders, tags) the production
 * sidebar supports. Nothing here may import `@tiptap/*` or `platejs*`, same
 * rule as the rest of `docs-agent/shared`.
 */

export const SIDEBAR_DOCUMENTS_STORAGE_KEY = 'REASON-documents';

export interface SidebarDocument {
  id: string;
  title: string;
}

/**
 * The subset of the production `Document` shape (see
 * `src/documents/DocumentTree.tsx`) this module reads and writes. Unknown
 * fields on an existing record are preserved verbatim so this never corrupts
 * data the real file-tree relies on (tags, sharing, `isArchived`, …).
 */
interface StoredDocumentRecord {
  id: string;
  title?: string;
  content?: string;
  parentId?: string | null;
  isFolder?: boolean;
  isDeleted?: boolean;
  [key: string]: unknown;
}

const CHANGE_EVENT = 'reason-documents-changed';

function readAll(): StoredDocumentRecord[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(SIDEBAR_DOCUMENTS_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StoredDocumentRecord[]) : [];
  } catch {
    return [];
  }
}

function writeAll(records: StoredDocumentRecord[]): void {
  if (typeof window === 'undefined') return;

  window.localStorage.setItem(SIDEBAR_DOCUMENTS_STORAGE_KEY, JSON.stringify(records));
  // `storage` only fires in *other* tabs; same-tab listeners need this instead.
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function toSidebarDocument(record: StoredDocumentRecord): SidebarDocument {
  return { id: record.id, title: record.title?.trim() || 'Untitled Document' };
}

/** Root-level, non-folder, non-deleted documents — what the sidebar lists. */
export function listSidebarDocuments(): SidebarDocument[] {
  return readAll()
    .filter((record) => !record.isFolder && !record.isDeleted && !record.parentId)
    .map(toSidebarDocument);
}

export function createSidebarDocument(title = 'Untitled Document'): SidebarDocument {
  const record: StoredDocumentRecord = {
    id: `doc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    content: '',
    parentId: null,
  };

  writeAll([...readAll(), record]);

  return toSidebarDocument(record);
}

export function renameSidebarDocument(id: string, title: string): void {
  const trimmed = title.trim() || 'Untitled Document';
  writeAll(readAll().map((record) => (record.id === id ? { ...record, title: trimmed } : record)));
}

/** Soft-delete, matching the production tree's `isDeleted` convention — recoverable, not destructive. */
export function deleteSidebarDocument(id: string): void {
  writeAll(
    readAll().map((record) => (record.id === id ? { ...record, isDeleted: true } : record)),
  );
}

/** Notifies on both same-tab writes and cross-tab `storage` events. */
export function subscribeSidebarDocuments(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const onStorage = (event: StorageEvent) => {
    if (event.key === SIDEBAR_DOCUMENTS_STORAGE_KEY) listener();
  };

  window.addEventListener(CHANGE_EVENT, listener);
  window.addEventListener('storage', onStorage);

  return () => {
    window.removeEventListener(CHANGE_EVENT, listener);
    window.removeEventListener('storage', onStorage);
  };
}
