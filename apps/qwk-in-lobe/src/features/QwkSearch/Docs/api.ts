/**
 * Client for the QwkSearch documents API (`/api/doc/documents`) served by the
 * Worker from D1. Same contract as the original qwksearch-web routes.
 */

export interface QwkDocument {
  content: string | null;
  createdAt: string;
  id: number;
  isExpanded: number | null;
  isFolder: number | null;
  metadata: string | null;
  name: string;
  parentId: number | null;
  title: string | null;
  updatedAt: string;
  userId: string | null;
}

export class DocsApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'DocsApiError';
  }
}

const request = async <T>(input: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(input, {
    credentials: 'include',
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new DocsApiError(body.error || res.statusText, res.status);
  }

  return (await res.json()) as T;
};

export const listDocuments = () => request<QwkDocument[]>('/api/doc/documents');

export const createDocument = (input: {
  content?: string;
  isFolder?: boolean;
  parentId?: number | null;
  title?: string;
}) =>
  request<QwkDocument>('/api/doc/documents', {
    body: JSON.stringify({ ...input, name: input.title }),
    method: 'POST',
  });

export const getDocument = (id: number) => request<QwkDocument>(`/api/doc/documents/${id}`);

export const updateDocument = (
  id: number,
  patch: Partial<Pick<QwkDocument, 'content' | 'title' | 'parentId'>> & {
    isExpanded?: boolean;
    metadata?: unknown;
  },
) =>
  request<QwkDocument>(`/api/doc/documents/${id}`, {
    body: JSON.stringify({ ...patch, ...(patch.title !== undefined && { name: patch.title }) }),
    method: 'PUT',
  });

export const deleteDocument = (id: number) =>
  request<{ success: boolean }>(`/api/doc/documents/${id}`, { method: 'DELETE' });
