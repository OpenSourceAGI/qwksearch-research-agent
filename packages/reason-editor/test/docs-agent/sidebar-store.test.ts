import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  SIDEBAR_DOCUMENTS_STORAGE_KEY,
  createSidebarDocument,
  deleteSidebarDocument,
  listSidebarDocuments,
  renameSidebarDocument,
  subscribeSidebarDocuments,
} from '../../src/docs-agent/shared/sidebar-store';

describe('sidebar-store', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('starts empty', () => {
    expect(listSidebarDocuments()).toEqual([]);
  });

  it('creates a document and lists it', () => {
    const doc = createSidebarDocument('My Notes');

    expect(listSidebarDocuments()).toEqual([{ id: doc.id, title: 'My Notes' }]);
  });

  it('defaults an untitled document', () => {
    const doc = createSidebarDocument();

    expect(doc.title).toBe('Untitled Document');
  });

  it('renames a document', () => {
    const doc = createSidebarDocument('Draft');
    renameSidebarDocument(doc.id, 'Final');

    expect(listSidebarDocuments()).toEqual([{ id: doc.id, title: 'Final' }]);
  });

  it('falls back to a default title when renamed blank', () => {
    const doc = createSidebarDocument('Draft');
    renameSidebarDocument(doc.id, '   ');

    expect(listSidebarDocuments()[0]?.title).toBe('Untitled Document');
  });

  it('soft-deletes a document — it disappears from the list but the record survives', () => {
    const doc = createSidebarDocument('Throwaway');
    deleteSidebarDocument(doc.id);

    expect(listSidebarDocuments()).toEqual([]);

    const stored = JSON.parse(window.localStorage.getItem(SIDEBAR_DOCUMENTS_STORAGE_KEY) ?? '[]');
    expect(stored).toEqual([expect.objectContaining({ id: doc.id, isDeleted: true })]);
  });

  it('excludes folders and nested documents from the sidebar list', () => {
    window.localStorage.setItem(
      SIDEBAR_DOCUMENTS_STORAGE_KEY,
      JSON.stringify([
        { id: 'folder-1', title: 'A Folder', isFolder: true, parentId: null },
        { id: 'child-1', title: 'Nested', parentId: 'folder-1' },
        { id: 'root-1', title: 'Root Doc', parentId: null },
      ]),
    );

    expect(listSidebarDocuments()).toEqual([{ id: 'root-1', title: 'Root Doc' }]);
  });

  it('preserves unrelated fields on an existing record when renaming', () => {
    window.localStorage.setItem(
      SIDEBAR_DOCUMENTS_STORAGE_KEY,
      JSON.stringify([
        { id: 'doc-1', title: 'Old', parentId: null, tags: ['work'], sharing: { isPublic: true } },
      ]),
    );

    renameSidebarDocument('doc-1', 'New');

    const stored = JSON.parse(window.localStorage.getItem(SIDEBAR_DOCUMENTS_STORAGE_KEY) ?? '[]');
    expect(stored).toEqual([
      { id: 'doc-1', title: 'New', parentId: null, tags: ['work'], sharing: { isPublic: true } },
    ]);
  });

  it('notifies subscribers on create, rename and delete', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeSidebarDocuments(listener);

    const doc = createSidebarDocument('One');
    renameSidebarDocument(doc.id, 'Two');
    deleteSidebarDocument(doc.id);

    expect(listener).toHaveBeenCalledTimes(3);

    unsubscribe();
    createSidebarDocument('Three');
    expect(listener).toHaveBeenCalledTimes(3);
  });
});
