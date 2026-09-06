import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { QwkDocument } from './api';
import { draftFromDocument, sortDocuments, useDocsStore } from './store';

const doc = (id: number, updatedAt: string, extra: Partial<QwkDocument> = {}): QwkDocument => ({
  content: `body ${id}`,
  createdAt: updatedAt,
  id,
  isExpanded: 0,
  isFolder: 0,
  metadata: null,
  name: `Doc ${id}`,
  parentId: null,
  title: `Doc ${id}`,
  updatedAt,
  userId: 'user_1',
  ...extra,
});

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' }, status });

describe('docs store helpers', () => {
  it('sorts newest first and builds drafts', () => {
    const sorted = sortDocuments([doc(1, '2026-01-01T00:00:00Z'), doc(2, '2026-02-01T00:00:00Z')]);
    expect(sorted.map((d) => d.id)).toEqual([2, 1]);
    expect(draftFromDocument(doc(3, '2026-01-01', { title: null, name: 'fallback' }))).toEqual({
      content: 'body 3',
      title: 'fallback',
    });
    expect(draftFromDocument(undefined)).toEqual({ content: '', title: '' });
  });
});

describe('docs store', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    useDocsStore.setState({
      activeId: undefined,
      dirty: false,
      documents: [],
      draft: { content: '', title: '' },
      error: undefined,
      initialized: false,
      saving: false,
    });
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it('loads documents and marks loginRequired on 401', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([doc(1, '2026-01-01T00:00:00Z')]));
    await useDocsStore.getState().fetchDocuments();
    expect(useDocsStore.getState().documents).toHaveLength(1);
    expect(useDocsStore.getState().initialized).toBe(true);

    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'nope' }, 401));
    await useDocsStore.getState().fetchDocuments();
    expect(useDocsStore.getState().error).toBe('loginRequired');
  });

  it('creates, selects, edits and saves a document', async () => {
    fetchMock.mockImplementation(async (input: string, init?: RequestInit) => {
      if (input === '/api/doc/documents' && init?.method === 'POST')
        return jsonResponse(doc(9, '2026-03-01T00:00:00Z', { content: '', title: '' }));
      if (input === '/api/doc/documents/9' && init?.method === 'PUT') {
        const body = JSON.parse(String(init.body));
        return jsonResponse(doc(9, '2026-03-02T00:00:00Z', { content: body.content, title: body.title }));
      }
      throw new Error(`unexpected ${input} ${init?.method}`);
    });

    const created = await useDocsStore.getState().create();
    expect(created?.id).toBe(9);
    expect(useDocsStore.getState().activeId).toBe(9);

    useDocsStore.getState().updateDraft({ content: '# Notes', title: 'Research' });
    expect(useDocsStore.getState().dirty).toBe(true);

    await useDocsStore.getState().save();
    const state = useDocsStore.getState();
    expect(state.saving).toBe(false);
    expect(state.dirty).toBe(false);
    expect(state.documents[0]).toMatchObject({ content: '# Notes', id: 9, title: 'Research' });
  });

  it('removes a document and falls back to the next one', async () => {
    useDocsStore.setState({
      activeId: 1,
      documents: [doc(1, '2026-02-01T00:00:00Z'), doc(2, '2026-01-01T00:00:00Z')],
      initialized: true,
    });
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true }));

    await useDocsStore.getState().remove(1);
    expect(useDocsStore.getState().documents.map((d) => d.id)).toEqual([2]);
    expect(useDocsStore.getState().activeId).toBe(2);
  });
});
