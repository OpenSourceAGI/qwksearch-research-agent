/**
 * State for the QwkSearch Docs workspace: the document list (shared with the
 * nav panel) and the active document draft with save tracking.
 */
import { shallow } from 'zustand/shallow';
import { createWithEqualityFn } from 'zustand/traditional';

import {
  createDocument,
  deleteDocument,
  DocsApiError,
  listDocuments,
  type QwkDocument,
  updateDocument,
} from './api';

export type DocsErrorKind = 'load' | 'loginRequired' | 'save';

export interface DocsDraft {
  content: string;
  title: string;
}

export interface DocsState {
  activeId?: number;
  dirty: boolean;
  documents: QwkDocument[];
  draft: DocsDraft;
  error?: DocsErrorKind;
  initialized: boolean;
  loading: boolean;
  saving: boolean;
}

export interface DocsActions {
  create: (options?: { isFolder?: boolean; parentId?: number | null }) => Promise<QwkDocument | undefined>;
  fetchDocuments: () => Promise<void>;
  remove: (id: number) => Promise<void>;
  save: () => Promise<void>;
  select: (id?: number) => void;
  updateDraft: (patch: Partial<DocsDraft>) => void;
}

export type DocsStore = DocsState & DocsActions;

const emptyDraft: DocsDraft = { content: '', title: '' };

const initialState: DocsState = {
  activeId: undefined,
  dirty: false,
  documents: [],
  draft: emptyDraft,
  error: undefined,
  initialized: false,
  loading: false,
  saving: false,
};

const toErrorKind = (error: unknown, fallback: DocsErrorKind): DocsErrorKind =>
  error instanceof DocsApiError && (error.status === 401 || error.status === 403)
    ? 'loginRequired'
    : fallback;

/** Newest first, folders excluded from the editable list. */
export const sortDocuments = (documents: QwkDocument[]): QwkDocument[] =>
  [...documents].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

export const draftFromDocument = (doc?: QwkDocument): DocsDraft =>
  doc ? { content: doc.content ?? '', title: doc.title ?? doc.name ?? '' } : emptyDraft;

export const useDocsStore = createWithEqualityFn<DocsStore>()(
  (set, get) => ({
    ...initialState,

    create: async (options = {}) => {
      try {
        const created = await createDocument({
          content: '',
          isFolder: options.isFolder,
          parentId: options.parentId ?? null,
          title: '',
        });
        set({ documents: sortDocuments([created, ...get().documents]), error: undefined });
        if (!options.isFolder) get().select(created.id);
        return created;
      } catch (error) {
        set({ error: toErrorKind(error, 'save') });
        return undefined;
      }
    },

    fetchDocuments: async () => {
      set({ error: undefined, loading: true });
      try {
        const documents = sortDocuments(await listDocuments());
        const { activeId } = get();
        const active = documents.find((doc) => doc.id === activeId);
        set({
          documents,
          draft: get().dirty ? get().draft : draftFromDocument(active),
          initialized: true,
          loading: false,
        });
      } catch (error) {
        set({ error: toErrorKind(error, 'load'), initialized: true, loading: false });
      }
    },

    remove: async (id) => {
      try {
        await deleteDocument(id);
        const documents = get().documents.filter((doc) => doc.id !== id);
        set({ documents });
        if (get().activeId === id) get().select(documents.find((doc) => !doc.isFolder)?.id);
      } catch (error) {
        set({ error: toErrorKind(error, 'save') });
      }
    },

    save: async () => {
      const { activeId, dirty, draft } = get();
      if (activeId === undefined || !dirty || get().saving) return;

      set({ error: undefined, saving: true });
      try {
        const updated = await updateDocument(activeId, { content: draft.content, title: draft.title });
        set({
          dirty: get().draft !== draft, // edits made while saving keep the dirty flag
          documents: sortDocuments(
            get().documents.map((doc) => (doc.id === updated.id ? updated : doc)),
          ),
          saving: false,
        });
      } catch (error) {
        set({ error: toErrorKind(error, 'save'), saving: false });
      }
    },

    select: (id) => {
      const doc = get().documents.find((item) => item.id === id);
      set({ activeId: doc?.id, dirty: false, draft: draftFromDocument(doc) });
    },

    updateDraft: (patch) => set({ dirty: true, draft: { ...get().draft, ...patch } }),
  }),
  shallow,
);
