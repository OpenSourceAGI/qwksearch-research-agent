/**
 * Chrome shared by both demo routes: the document title, the engine switcher,
 * and the collaboration status line. Deliberately thin — everything that is
 * part of the *editor* (toolbar included) comes from
 * `react-reason-editor/docs-agent`, so the only visible difference between the
 * two routes is the editor itself.
 */

'use client';

import Link from 'next/link';

import type { ReactNode } from 'react';

export function DemoShell({
  children,
  documentId,
  engine,
  title,
  collaborative,
}: {
  children: ReactNode;
  documentId: string;
  engine: 'tiptap' | 'plate';
  title: string;
  collaborative: boolean;
}) {
  const other = engine === 'tiptap' ? 'plate' : 'tiptap';

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-background">
      <header className="flex shrink-0 items-center gap-3 border-b border-gray-200 px-4 py-2 dark:border-slate-700">
        <span className="truncate text-sm font-semibold">{title}</span>
        <span className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-600 dark:bg-slate-800 dark:text-gray-300">
          {engine}
        </span>
        <span className="text-[11px] text-gray-500 dark:text-gray-400">
          {collaborative
            ? `room reason-editor:${engine}:${documentId}`
            : 'collaboration off — set NEXT_PUBLIC_HOCUSPOCUS_URL'}
        </span>
        <Link
          className="ml-auto rounded border border-gray-200 px-2 py-1 text-xs hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-800"
          href={`/docs/demo/${other}/${documentId}`}
        >
          Open {other} version
        </Link>
      </header>
      <main className="min-h-0 flex-1">{children}</main>
    </div>
  );
}
