/**
 * The body of a toolbar tooltip: name, one-line description, and the keyboard
 * shortcut as a row of `<kbd>` badges. Both toolbars (the schema-driven
 * `ReasonToolbar` and the Plate playground toolbar) render this, so a button's
 * tooltip is always built from the same schema data.
 */

'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

import type { EditorEngine } from './editor-types';
import {
  formatShortcutKeys,
  isMacPlatform,
  resolveToolbarShortcut,
  type ToolbarShortcut,
} from './toolbar-shortcuts';

export interface ToolbarTooltipBodyProps {
  label: string;
  description?: string;
  shortcut?: ToolbarShortcut;
  engine: EditorEngine;
  /** Override platform detection (tests, SSR). */
  mac?: boolean;
  className?: string;
}

/** Whether to show Cmd-style shortcuts; resolved after mount so SSR output matches. */
export function useIsMac(override?: boolean): boolean {
  const [isMac, setIsMac] = React.useState(override ?? false);

  React.useEffect(() => {
    if (override === undefined) setIsMac(isMacPlatform());
  }, [override]);

  return override ?? isMac;
}

export function ToolbarKbd({ keys, className }: { keys: string[]; className?: string }) {
  return (
    <span className={cn('flex items-center gap-1', className)}>
      {keys.map((key, index) => (
        <kbd
          className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-b-2 border-border bg-muted px-1 font-sans text-[11px] font-medium leading-none text-muted-foreground"
          key={`${key}-${index}`}
        >
          {key}
        </kbd>
      ))}
    </span>
  );
}

export function ToolbarTooltipBody({
  label,
  description,
  shortcut,
  engine,
  mac,
  className,
}: ToolbarTooltipBodyProps) {
  const isMac = useIsMac(mac);
  const combo = resolveToolbarShortcut(shortcut, engine);
  const keys = combo ? formatShortcutKeys(combo, isMac) : [];

  return (
    <div
      className={cn('flex max-w-[16rem] flex-col gap-1 text-left', className)}
      data-slot="toolbar-tooltip"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="font-medium text-foreground">{label}</span>
        {keys.length ? <ToolbarKbd keys={keys} /> : null}
      </div>
      {description ? (
        <p className="text-xs leading-snug text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}
