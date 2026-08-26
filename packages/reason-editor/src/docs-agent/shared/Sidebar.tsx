/**
 * The Reason Editor's document navigation sidebar — engine-neutral and shared
 * by both routes exactly like `ReasonToolbar`: this file imports neither
 * Tiptap nor Plate, and renders identically regardless of which one is
 * mounted next to it. It lists the documents `sidebar-store.ts` reads from the
 * production file-tree's own storage, with inline create/rename/delete — the
 * "editor for the sidebar items" alongside the two content editors.
 *
 * Routing is left to the host: this component only reports which document was
 * picked, created or should be navigated to after a delete, and asks the host
 * for each row's href, so it works the same whether the host is Next.js
 * (`next/link`/`useRouter`) or a plain router.
 */

'use client';

import * as React from 'react';

import { FileText, Pencil, Plus, Trash2 } from 'lucide-react';

import { cn } from '@/lib/utils';

import {
  createSidebarDocument,
  deleteSidebarDocument,
  listSidebarDocuments,
  renameSidebarDocument,
  subscribeSidebarDocuments,
  type SidebarDocument,
} from './sidebar-store';

export interface ReasonSidebarProps {
  activeDocumentId: string;
  /** Builds the href for a document row; the host owns routing. */
  linkForDocument: (documentId: string) => string;
  /** Called after creating a document, or after deleting the active one. */
  onNavigate: (documentId: string) => void;
  className?: string;
}

export function ReasonSidebar({
  activeDocumentId,
  linkForDocument,
  onNavigate,
  className,
}: ReasonSidebarProps) {
  const [documents, setDocuments] = React.useState<SidebarDocument[]>([]);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [draftTitle, setDraftTitle] = React.useState('');

  const refresh = React.useCallback(() => {
    setDocuments(listSidebarDocuments());
  }, []);

  React.useEffect(() => {
    refresh();
    return subscribeSidebarDocuments(refresh);
  }, [refresh]);

  const startRename = (doc: SidebarDocument) => {
    setEditingId(doc.id);
    setDraftTitle(doc.title);
  };

  const commitRename = () => {
    if (editingId) renameSidebarDocument(editingId, draftTitle);
    setEditingId(null);
  };

  const handleCreate = () => {
    const doc = createSidebarDocument();
    onNavigate(doc.id);
  };

  const handleDelete = (doc: SidebarDocument) => {
    if (typeof window !== 'undefined' && !window.confirm(`Delete "${doc.title}"?`)) return;

    deleteSidebarDocument(doc.id);

    if (doc.id !== activeDocumentId) return;

    const next = documents.find((candidate) => candidate.id !== doc.id);
    onNavigate(next ? next.id : createSidebarDocument().id);
  };

  return (
    <nav
      aria-label="Documents"
      className={cn(
        'flex w-56 shrink-0 flex-col gap-0.5 overflow-y-auto border-r border-gray-200 bg-gray-50 p-2 dark:border-slate-700 dark:bg-slate-900',
        className,
      )}
      data-testid="reason-sidebar"
    >
      <div className="flex items-center justify-between px-1 pb-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
          Documents
        </span>
        <button
          aria-label="New document"
          className="rounded p-1 text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-slate-800"
          onClick={handleCreate}
          type="button"
        >
          <Plus className="size-3.5" />
        </button>
      </div>

      {documents.map((doc) => {
        const active = doc.id === activeDocumentId;
        const editing = editingId === doc.id;

        return (
          <div
            className={cn(
              'group flex items-center gap-1.5 rounded px-1.5 py-1 text-sm',
              active
                ? 'bg-gray-200 text-gray-900 dark:bg-slate-700 dark:text-white'
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-800',
            )}
            data-document-id={doc.id}
            key={doc.id}
          >
            <FileText className="size-3.5 shrink-0 opacity-60" />

            {editing ? (
              <input
                autoFocus
                className="min-w-0 flex-1 rounded border border-gray-300 bg-white px-1 py-0.5 text-sm dark:border-slate-600 dark:bg-slate-800"
                onBlur={commitRename}
                onChange={(event) => setDraftTitle(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') commitRename();
                  if (event.key === 'Escape') setEditingId(null);
                }}
                value={draftTitle}
              />
            ) : (
              <a className="min-w-0 flex-1 truncate" href={linkForDocument(doc.id)}>
                {doc.title}
              </a>
            )}

            {!editing && (
              <div className="hidden shrink-0 items-center gap-0.5 group-hover:flex">
                <button
                  aria-label={`Rename ${doc.title}`}
                  className="rounded p-0.5 text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-700"
                  onClick={() => startRename(doc)}
                  type="button"
                >
                  <Pencil className="size-3" />
                </button>
                <button
                  aria-label={`Delete ${doc.title}`}
                  className="rounded p-0.5 text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-700"
                  onClick={() => handleDelete(doc)}
                  type="button"
                >
                  <Trash2 className="size-3" />
                </button>
              </div>
            )}
          </div>
        );
      })}

      {documents.length === 0 && (
        <p className="px-1.5 py-2 text-xs text-gray-400">No documents yet.</p>
      )}
    </nav>
  );
}
