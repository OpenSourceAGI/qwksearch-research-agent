/**
 * @file shared.tsx
 * @description Small building blocks shared by the playground widgets: a
 * framed panel, labelled fields and a JSON/result view.
 */
'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Panel({ title, source, children }: { title: string; source: string; children: ReactNode }) {
  return (
    <div className="not-prose my-6 overflow-hidden rounded-xl border bg-fd-card text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-fd-muted/50 px-4 py-2.5">
        <span className="font-semibold">{title}</span>
        <span className="font-mono text-xs text-fd-muted-foreground">runs {source}</span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-fd-muted-foreground">
        {label}
        {hint ? <span className="ml-1 font-normal opacity-75">· {hint}</span> : null}
      </span>
      {children}
    </label>
  );
}

export const inputClass =
  'w-full rounded-md border bg-fd-background px-2.5 py-1.5 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-fd-ring';

export function ResultView({ ok, title, children }: { ok: boolean | 'warn'; title: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        'mt-4 rounded-lg border p-3',
        ok === true && 'border-fd-primary/40 bg-fd-primary/5',
        ok === 'warn' && 'border-amber-500/40 bg-amber-500/5',
        ok === false && 'border-[var(--color-loss)]/40 bg-[var(--color-loss)]/5',
      )}
    >
      <div
        className={cn(
          'mb-2 text-xs font-semibold uppercase tracking-wide',
          ok === true && 'text-fd-primary',
          ok === 'warn' && 'text-amber-600 dark:text-amber-400',
          ok === false && 'text-[var(--color-loss)]',
        )}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

export function Json({ value }: { value: unknown }) {
  return (
    <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-all font-mono text-xs leading-relaxed">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

/** Parses "1, 2.5, 3" or "1 2 3" into numbers; non-numbers become NaN. */
export function parseNumbers(text: string): number[] {
  return text
    .split(/[\s,;]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map(Number);
}
