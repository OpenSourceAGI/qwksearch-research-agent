/**
 * The one toolbar both engines render.
 *
 * It is deliberately dumb: it walks `REASON_TOOLBAR` and delegates every
 * decision to the adapter (`execute` / `isActive` / `isEnabled` / `getValue`).
 * There is no `engine === 'plate'` branch anywhere in this file, and it imports
 * neither Tiptap nor Plate — swapping engines must not change a single pixel of
 * the toolbar.
 */

'use client';

import * as React from 'react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

import type { EditorToolbarAdapter } from './editor-types';
import { REASON_TOOLBAR, type ToolbarItem } from './toolbar-schema';

const triggerClass =
  'flex items-center justify-center rounded p-1.5 text-gray-600 transition-colors dark:text-gray-300 disabled:cursor-not-allowed disabled:opacity-40 hover:enabled:bg-gray-100 dark:hover:enabled:bg-slate-800';

const activeClass = 'bg-gray-200 text-gray-900 dark:bg-slate-700 dark:text-white';

const menuItemClass =
  'flex w-full cursor-pointer items-center gap-2 text-xs data-disabled:cursor-not-allowed data-disabled:opacity-40';

/**
 * Re-renders whenever the editor changes so active/disabled state stays in sync
 * with the selection. Adapters without `subscribe` simply never trigger this.
 */
function useAdapterRevision(adapter: EditorToolbarAdapter): number {
  const [revision, setRevision] = React.useState(0);

  React.useEffect(() => {
    if (!adapter.subscribe) return;
    return adapter.subscribe(() => setRevision((n) => n + 1));
  }, [adapter]);

  return revision;
}

function Shortcut({ shortcut }: { shortcut?: string }) {
  if (!shortcut) return null;

  return (
    <span className="ml-auto pl-4 text-[10px] tracking-widest text-gray-400 dark:text-gray-500">
      {shortcut}
    </span>
  );
}

/** Renders one schema node inside an open dropdown. */
function MenuItems({
  items,
  adapter,
}: {
  items: ToolbarItem[];
  adapter: EditorToolbarAdapter;
}) {
  return (
    <>
      {items.map((item) => {
        if (item.kind === 'separator') {
          return <DropdownMenuSeparator key={item.id} />;
        }

        if (item.kind === 'group-label') {
          return (
            <DropdownMenuLabel
              key={item.id}
              className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400"
            >
              {item.label}
            </DropdownMenuLabel>
          );
        }

        if (item.kind === 'menu') {
          const Icon = item.icon;

          return (
            <DropdownMenuSub key={item.id}>
              <DropdownMenuSubTrigger className={menuItemClass}>
                <Icon className="size-3.5 shrink-0 text-gray-500 dark:text-gray-400" />
                {item.label}
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent className="min-w-[200px]">
                  <MenuItems items={item.children} adapter={adapter} />
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
          );
        }

        const Icon = item.icon;
        const active = adapter.isActive(item.id);

        return (
          <DropdownMenuItem
            key={item.id}
            aria-pressed={active}
            className={cn(menuItemClass, active && activeClass)}
            data-command={item.id}
            data-state={active ? 'active' : 'inactive'}
            disabled={!adapter.isEnabled(item.id)}
            onSelect={() => void adapter.execute(item.id)}
          >
            <Icon className="size-3.5 shrink-0 text-gray-500 dark:text-gray-400" />
            <span className="truncate">{item.label}</span>
            <Shortcut shortcut={item.shortcut} />
          </DropdownMenuItem>
        );
      })}
    </>
  );
}

/** Renders one schema node at the top level of the toolbar. */
function TopLevelItem({
  item,
  adapter,
}: {
  item: ToolbarItem;
  adapter: EditorToolbarAdapter;
}) {
  if (item.kind === 'separator') {
    return <div className="mx-1 h-5 w-px bg-gray-200 dark:bg-slate-700" />;
  }

  if (item.kind === 'group-label') {
    return (
      <span className="px-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
        {item.label}
      </span>
    );
  }

  if (item.kind === 'menu') {
    // Contextual menus (the table submenu) only appear while their anchor
    // command is active — both adapters answer `isActive('table')` the same way.
    if (item.visibleWhenActive && !adapter.isActive(item.visibleWhenActive)) {
      return null;
    }

    const Icon = item.icon;

    return (
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger
              aria-label={item.label}
              className={cn(triggerClass, 'data-[state=open]:bg-gray-200 dark:data-[state=open]:bg-slate-700')}
              data-menu={item.id}
            >
              <Icon className="size-4" />
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">{item.label}</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="start" className="min-w-[240px]">
          <MenuItems items={item.children} adapter={adapter} />
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  const Icon = item.icon;
  const active = adapter.isActive(item.id);
  const enabled = adapter.isEnabled(item.id);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          aria-label={item.label}
          aria-pressed={active}
          className={cn(triggerClass, active && activeClass)}
          data-command={item.id}
          data-state={active ? 'active' : 'inactive'}
          disabled={!enabled}
          onClick={() => void adapter.execute(item.id)}
          type="button"
        >
          <Icon className="size-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {item.label}
        {item.shortcut ? (
          <span className="ml-2 text-[10px] tracking-widest opacity-70">
            {item.shortcut}
          </span>
        ) : null}
      </TooltipContent>
    </Tooltip>
  );
}

export interface ReasonToolbarProps {
  adapter: EditorToolbarAdapter;
  /** Override the schema — used by tests and by the floating variant. */
  items?: ToolbarItem[];
  className?: string;
  /** Rendered right-aligned at the end of the toolbar (settings, presence, …). */
  children?: React.ReactNode;
}

export function ReasonToolbar({
  adapter,
  items = REASON_TOOLBAR,
  className,
  children,
}: ReasonToolbarProps) {
  // Subscribing here (rather than per item) keeps a single listener on the
  // editor no matter how many commands the schema declares.
  useAdapterRevision(adapter);

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className={cn(
          'flex flex-wrap items-center gap-0.5 border-b border-gray-200 px-2 py-1 dark:border-slate-700',
          className,
        )}
        data-engine={adapter.engine}
        role="toolbar"
      >
        {items.map((item) => (
          <TopLevelItem
            adapter={adapter}
            item={item}
            key={item.kind === 'separator' ? item.id : item.id}
          />
        ))}
        {children ? <div className="ml-auto flex items-center gap-1">{children}</div> : null}
      </div>
    </TooltipProvider>
  );
}
