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
  return (title || 'Untitled')
    .trim()
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '-');
}

export function convertDocumentsToFileItems(documents: Document[]): FileItem[] {
  // Build a map from doc.id → doc for parent lookup
  const byId = new Map<string, Document>();
  for (const doc of documents) byId.set(doc.id, doc);

  // Build path for a doc by walking up parentId chain
  function pathFor(doc: Document): string {
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

  function parentPathFor(doc: Document): string {
    if (!doc.parentId) return '0';
    const parent = byId.get(doc.parentId);
    return parent ? pathFor(parent) : '0';
  }

  return documents.map(doc => ({
    id: pathFor(doc),
    parent: parentPathFor(doc),
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
  const byId = new Map<string, Document>();
  for (const doc of documents) byId.set(doc.id, doc);

  function pathFor(doc: Document): string {
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

  const map = new Map<string, string>();
  for (const doc of documents) {
    if (!doc.isFolder) {
      map.set(pathFor(doc), doc.id);
    }
  }
  return map;
}
