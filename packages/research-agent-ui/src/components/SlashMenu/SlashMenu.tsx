'use client';

/**
 * @fileoverview The slash menu popup: a listbox of commands and files anchored
 * just above the chat input.
 *
 * Built on the shared Radix popover so it escapes clipping and flips when
 * there is no room above. Focus never leaves the textarea — the combobox
 * attributes on the textarea (see {@link slashComboboxProps}) point at this
 * listbox through `aria-activedescendant`.
 */
import { useEffect, type RefObject } from 'react';
import { Popover, PopoverAnchor, PopoverContent } from '../../ui/popover';
import { cn } from '../../lib/utils';
import { highlightSegments, windowDescription } from './slashMatch';
import type { SlashMenuState } from './useSlashMenu';

const GROUP_LABEL: Record<string, string> = {
  command: 'Commands',
  file: 'Files',
};

/** Attributes to spread on the textarea so assistive tech sees the combobox. */
export function slashComboboxProps(menu: Pick<SlashMenuState, 'open' | 'listboxId' | 'activeOptionId'>) {
  return {
    role: 'combobox' as const,
    'aria-haspopup': 'listbox' as const,
    'aria-autocomplete': 'list' as const,
    'aria-expanded': menu.open,
    'aria-controls': menu.open ? menu.listboxId : undefined,
    'aria-activedescendant': menu.activeOptionId,
  };
}

function Highlighted({ text, indices }: { text: string; indices: readonly number[] }) {
  return (
    <>
      {highlightSegments(text, indices).map((seg, i) =>
        seg.match ? (
          <span key={i} className="text-blue-600 dark:text-blue-400" data-match>
            {seg.text}
          </span>
        ) : (
          <span key={i}>{seg.text}</span>
        ),
      )}
    </>
  );
}

interface SlashMenuProps {
  menu: SlashMenuState;
  /** Element the popup attaches to and matches the width of (the input card). */
  anchorRef: RefObject<HTMLElement | null>;
  /** Library documents are still being fetched. */
  loadingFiles?: boolean;
  className?: string;
}

export function SlashMenu({ menu, anchorRef, loadingFiles = false, className }: SlashMenuProps) {
  const { open, groups, results, activeIndex, listboxId, optionId } = menu;

  useEffect(() => {
    if (!open) return;
    const el = document.getElementById(optionId(activeIndex));
    if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ block: 'nearest' });
  }, [open, activeIndex, optionId]);

  let flatIndex = -1;

  return (
    <Popover open={open} onOpenChange={(next) => !next && menu.close()}>
      <PopoverAnchor virtualRef={anchorRef as RefObject<{ getBoundingClientRect(): DOMRect }>} />
      <PopoverContent
        side="top"
        align="center"
        sideOffset={8}
        collisionPadding={8}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={(e) => {
          if (anchorRef.current?.contains(e.target as Node)) e.preventDefault();
        }}
        className={cn(
          'w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-1rem)] overflow-hidden rounded-2xl p-1.5',
          'border border-bg-300 bg-gray-50 text-text-200 shadow-xl dark:border-white/10 dark:bg-[#30302E] dark:text-text-100',
          className,
        )}
        data-testid="slash-menu"
      >
        {results.length === 0 ? (
          <div role="status" className="px-3 py-6 text-center text-sm text-text-400">
            {loadingFiles ? 'Loading files…' : 'No matching commands or files'}
          </div>
        ) : (
          <div
            id={listboxId}
            role="listbox"
            aria-label="Commands and files"
            className="custom-scrollbar max-h-72 overflow-y-auto overscroll-contain"
          >
            {groups.map((group) => {
              const headingId = `${listboxId}-group-${group.kind}`;
              return (
                <div key={group.kind} role="group" aria-labelledby={headingId}>
                  <div
                    id={headingId}
                    role="presentation"
                    className="px-2.5 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wider text-text-400"
                  >
                    {GROUP_LABEL[group.kind] ?? group.kind}
                    {group.kind === 'file' && loadingFiles ? ' · loading…' : ''}
                  </div>
                  {group.rows.map((row) => {
                    flatIndex += 1;
                    const index = flatIndex;
                    const active = index === activeIndex;
                    const desc = windowDescription(
                      row.item.description ?? '',
                      row.descriptionIndices,
                    );
                    return (
                      <div
                        key={row.item.id}
                        id={optionId(index)}
                        role="option"
                        aria-selected={active}
                        data-active={active || undefined}
                        data-kind={row.item.kind}
                        className={cn(
                          'flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm',
                          active ? 'bg-bg-200 dark:bg-white/10' : 'bg-transparent',
                        )}
                        onMouseMove={() => {
                          if (!active) menu.setActiveIndex(index);
                        }}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => menu.select(index)}
                      >
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center text-text-400">
                          {row.item.icon}
                        </span>
                        <span className="shrink-0 font-semibold text-text-100 dark:text-white">
                          <Highlighted text={row.item.name} indices={row.nameIndices} />
                        </span>
                        {row.item.description ? (
                          <span className="min-w-0 flex-1 truncate text-text-400">
                            <Highlighted text={desc.text} indices={desc.indices} />
                          </span>
                        ) : (
                          <span className="flex-1" />
                        )}
                        {row.item.hint ? (
                          <span className="shrink-0 pl-2 text-xs text-text-500">{row.item.hint}</span>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
