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
import { Button } from '@/app-ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/app-ui/tooltip';
import { cn } from '@/lib/utils';

import type { EditorToolbarAdapter } from './editor-types';
import { TOOLBAR_ROW_CLASS, TOOLBAR_SEPARATOR_CLASS, toolbarButtonClass } from './toolbar-look';
import { REASON_TOOLBAR, type ToolbarItem } from './toolbar-schema';
import {
  formatShortcutLabel,
  resolveToolbarShortcut,
  type ToolbarShortcut,
} from './toolbar-shortcuts';
import { ToolbarTooltipBody, useIsMac } from './toolbar-tooltip';

const triggerClass = toolbarButtonClass('sm');

const activeClass = 'bg-accent text-accent-foreground';

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

function Shortcut({
  shortcut,
  engine,
}: {
  shortcut?: ToolbarShortcut;
  engine: EditorToolbarAdapter['engine'];
}) {
  const mac = useIsMac();
  const combo = resolveToolbarShortcut(shortcut, engine);
  if (!combo) return null;

  return (
    <span className="ml-auto pl-4 text-[10px] tracking-widest text-muted-foreground">
      {formatShortcutLabel(combo, mac)}
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
              className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
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
                <Icon className="size-3.5 shrink-0 text-muted-foreground" />
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
            <Icon className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">{item.label}</span>
            <Shortcut engine={adapter.engine} shortcut={item.shortcut} />
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
    return <div aria-hidden className={TOOLBAR_SEPARATOR_CLASS} data-slot="toolbar-separator" role="presentation" />;
  }

  if (item.kind === 'group-label') {
    return (
      <span className="px-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
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
            <DropdownMenuTrigger asChild>
              <Button
                aria-label={item.label}
                className={triggerClass}
                data-menu={item.id}
                size="sm"
                variant="ghost"
              >
                <Icon />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <ToolbarTooltipBody
              description={item.description}
              engine={adapter.engine}
              label={item.label}
            />
          </TooltipContent>
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

  const button = (
    <Button
      aria-label={item.label}
      aria-pressed={active}
      className={triggerClass}
      data-command={item.id}
      data-state={active ? 'active' : 'inactive'}
      disabled={!enabled}
      onClick={() => void adapter.execute(item.id)}
      size="sm"
      type="button"
      variant="ghost"
    >
      <Icon />
    </Button>
  );

  return (
    <Tooltip>
      {/* A disabled button swallows pointer events, so the span keeps its tooltip. */}
      <TooltipTrigger asChild>
        {enabled ? button : <span className="inline-flex">{button}</span>}
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <ToolbarTooltipBody
          description={item.description}
          engine={adapter.engine}
          label={item.label}
          shortcut={item.shortcut}
        />
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
    <TooltipProvider delayDuration={0}>
      <div
        className={cn(TOOLBAR_ROW_CLASS, className)}
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
