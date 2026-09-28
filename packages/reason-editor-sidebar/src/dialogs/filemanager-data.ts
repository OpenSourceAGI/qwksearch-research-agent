/**
 * @module filemanager-data
 * @description Static seed data and type definitions for the FileManagerModal
 * demo: sample folders, files, and breadcrumb paths.
 */
import type { Document } from '../documents/DocumentTree';

export interface FileItem {
  id: string;
  parent?: string;
  type: "folder" | "file";
  date?: Date;
  size?: number;
}

function slugify(title: string): string {
  // Dots are kept so a name survives the round trip through the file
  // manager: "report.pdf" has to come back out as "report.pdf", not
  // "reportpdf". Everything else that would need escaping in a path
  // segment (notably "/") is dropped.
  return (title || 'Untitled')
    .trim()
    .replace(/[^a-zA-Z0-9\s-.]/g, '')
    .replace(/\s+/g, '-');
}

/**
 * Builds the "/a/b/c" path the file manager uses as an item ID by walking the
 * document's `parentId` chain and slugifying every title on the way up.
 * `0` is the file manager's root, which is not a real document.
 */
export function pathOf(documents: Document[], doc: Document): string {
  const byId = new Map<string, Document>();
  for (const d of documents) byId.set(d.id, d);

  const segments: string[] = [slugify(doc.title)];
  let current = doc;
  while (current.parentId) {
    const parent = byId.get(current.parentId);
    if (!parent) break;
    segments.unshift(slugify(parent.title));
    current = parent;
  }
  return '/' + segments.join('/');
}

/** The path of a document's parent folder, or `'0'` for the file-manager root. */
function parentPathOf(documents: Document[], doc: Document): string {
  if (!doc.parentId) return '0';
  const byId = new Map<string, Document>();
  for (const d of documents) byId.set(d.id, d);
  const parent = byId.get(doc.parentId);
  return parent ? pathOf(documents, parent) : '0';
}

export function convertDocumentsToFileItems(documents: Document[]): FileItem[] {
  return documents.map(doc => ({
    id: pathOf(documents, doc),
    parent: parentPathOf(documents, doc),
    type: doc.isFolder ? 'folder' : 'file',
    date: new Date(),
    size: doc.isFolder ? undefined : (doc.content?.length || 0),
  }));
}

export function getData(documents: Document[] = []): FileItem[] {
  return convertDocumentsToFileItems(documents);
}

/** Returns a map from file path → document ID for reverse-lookup when a file is opened. */
export function getPathToDocIdMap(documents: Document[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const doc of documents) {
    if (!doc.isFolder) {
      map.set(pathOf(documents, doc), doc.id);
    }
  }
  return map;
}

/**
 * Returns a map from *every* file-manager path → document ID, folders
 * included. "Add new" and "Upload file" report the destination as a path,
 * and the host needs to turn that path back into a `parentId`, which means
 * folders have to be resolvable too.
 */
export function getPathToNodeIdMap(documents: Document[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const doc of documents) {
    map.set(pathOf(documents, doc), doc.id);
  }
  return map;
}
