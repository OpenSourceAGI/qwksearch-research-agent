/**
 * The one document source both demo routes read from.
 *
 * `/docs/demo/tiptap/:id` and `/docs/demo/plate/:id` are backed by this module,
 * so the two engines are always compared against the same document. Only their
 * *collaboration* state is separate — see `collaborationRoom()` in
 * `react-reason-editor/docs-agent`.
 *
 * Documents live where the REASON docs app already keeps them: the
 * `REASON-documents` localStorage entry.
 */

export const DOCUMENTS_STORAGE_KEY = 'REASON-documents';

export interface ReasonDemoDocument {
  id: string;
  title: string;
  /** Document body as HTML — the format the Tiptap editor persists. */
  html: string;
}

interface StoredDocument {
  id: string;
  title?: string;
  content?: string;
  isFolder?: boolean;
}

const FALLBACK_HTML =
  '<h1>Reason Editor</h1><p>This document is empty. Start typing, or open the same URL in a second tab to see live collaboration.</p>';

function readStoredDocuments(): StoredDocument[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(DOCUMENTS_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);

    return Array.isArray(parsed) ? (parsed as StoredDocument[]) : [];
  } catch {
    return [];
  }
}

/** Loads one document, falling back to an empty seed when it does not exist yet. */
export function loadDemoDocument(documentId: string): ReasonDemoDocument {
  const stored = readStoredDocuments().find(
    (document) => document.id === documentId && !document.isFolder,
  );

  return {
    id: documentId,
    title: stored?.title ?? 'Untitled Document',
    html: stored?.content?.trim() ? stored.content : FALLBACK_HTML,
  };
}

/** The signed-in user, as far as the demo routes need one. */
export interface ReasonDemoUser {
  id: string;
  name: string;
}

const USER_STORAGE_KEY = 'REASON-demo-user';

/**
 * Demo identity. A real deployment replaces this with the Better Auth session
 * and passes the session token to Hocuspocus instead of a generated id — the
 * collaboration server rejects tokens it cannot verify once `REASON_AUTH_URL`
 * is configured.
 */
export function loadDemoUser(): ReasonDemoUser {
  if (typeof window === 'undefined') return { id: 'anonymous', name: 'Anonymous' };

  try {
    const raw = window.localStorage.getItem(USER_STORAGE_KEY);
    if (raw) return JSON.parse(raw) as ReasonDemoUser;
  } catch {
    /* fall through and mint a new one */
  }

  const id = `user-${Math.random().toString(36).slice(2, 8)}`;
  const user: ReasonDemoUser = { id, name: `Guest ${id.slice(-4)}` };

  try {
    window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  } catch {
    /* private mode — a per-tab identity is fine for the demo */
  }

  return user;
}
