/**
 * @module OutlineView
 * @description Collapsible heading outline derived from `TocEntry` tuples emitted
 * by the Tiptap editor. Supports expand/collapse (per-heading and by heading level),
 * drag-to-reorder, search filtering, and persistent collapse preferences via `localStorage`.
 */
import { HashIcon, ChevronRightIcon } from 'lucide-react';
import { cn } from '../app-utils/utils';
import { useMemo, useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import type { TocEntry } from '../app-types/toc';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
  ContextMenuCheckboxItem,
} from '../app-ui/context-menu';

/** Internal flattened representation of a single heading in the document. */
export interface OutlineItem {
  /** Stable identifier (from TocEntry) used for navigation and collapse state. */
  id: string;
  /** Heading level (1–6) corresponding to H1–H6. */
  level: number;
  /** Plain-text content extracted from the heading node. */
  text: string;
  /** Sequential index in the original heading list. */
  line: number;
}

/**
 * Returns the subset of `outline` whose heading text contains `query`
 * (case-insensitive). Returns `outline` unchanged when `query` is blank.
 */
export function filterOutline(outline: OutlineItem[], query: string): OutlineItem[] {
  const trimmed = query.trim();
  if (!trimmed) return outline;
  const q = trimmed.toLowerCase();
  return outline.filter((item) => item.text.toLowerCase().includes(q));
}

/**
 * Returns whether the item at `itemIndex` within the full (unfiltered)
 * `outline` is hidden because one of its ancestors is collapsed.
 *
 * @param outline - The full, unfiltered heading list.
 * @param collapsedIds - IDs of currently collapsed headings.
 * @param itemIndex - Index of the item within `outline` (not a filtered subset).
 */
export function isHiddenByCollapsedAncestor(
  outline: OutlineItem[],
  collapsedIds: Set<string>,
  itemIndex: number
): boolean {
  const currentLevel = outline[itemIndex].level;

  for (let i = itemIndex - 1; i >= 0; i--) {
    if (outline[i].level < currentLevel) {
      if (collapsedIds.has(outline[i].id)) {
        return true;
      }
      if (outline[i].level === 1) break;
    }
  }

  return false;
}

/**
 * Imperative handle exposed to parent components via a forwarded ref.
 * Allows programmatic expand/collapse of the entire outline.
 */
export interface OutlineViewHandle {
  /** Expands all heading nodes. */
  expandAll: () => void;
  /** Collapses all H1 nodes (hiding their children). */
  collapseAll: () => void;
}

/** Props for the {@link OutlineView} component. */
interface OutlineViewProps {
  /** Heading entries from the Tiptap editor's TOC extractor. */
  headings?: TocEntry[];
  /** Called when the user clicks a heading; receives the heading key. */
  onNavigate?: (key: string) => void;
  /** Optional drag-reorder callback receiving source and target indices. */
  onReorder?: (fromIndex: number, toIndex: number) => void;
  /** Filters the heading list to items whose text contains this query. */
  searchQuery?: string;
}

/** `localStorage` key for persisting default collapse-level preference. */
const STORAGE_KEY = 'outline-collapse-preferences';

/**
 * Collapsible document outline panel. Renders a heading tree built from
 * `headings` with click-to-navigate, expand/collapse, drag-to-reorder,
 * search filtering, and a context menu for bulk collapse-level controls.
 */
export const OutlineView = forwardRef<OutlineViewHandle, OutlineViewProps>(({ headings = [], onNavigate, onReorder: _onReorder, searchQuery = '' }, ref) => {
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [defaultCollapseLevel, setDefaultCollapseLevel] = useState<number | null>(null);

  // Derive flat outline from TocEntry list: [key, text, tag]
  const outline = useMemo<OutlineItem[]>(() => {
    return headings.map(([key, text, tag], index) => ({
      id: key,
      level: parseInt(tag[1], 10),
      text,
      line: index,
    }));
  }, [headings]);

  useImperativeHandle(ref, () => ({
    expandAll: () => {
      setCollapsedIds(new Set());
    },
    collapseAll: () => {
      const newCollapsed = new Set<string>();
      outline.forEach((item) => {
        if (item.level === 1) {
          newCollapsed.add(item.id);
        }
      });
      setCollapsedIds(newCollapsed);
    },
  }));

  // Load preferences from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const prefs = JSON.parse(stored);
        setDefaultCollapseLevel(prefs.defaultCollapseLevel || null);
        if (prefs.defaultCollapseLevel) {
          applyCollapseToLevel(prefs.defaultCollapseLevel);
        }
      }
    } catch (e) {
      console.error('Failed to load outline preferences:', e);
    }
  }, []);

  /**
   * Persists the default collapse level to `localStorage`.
   *
   * @param level - The heading level to auto-collapse on load, or `null` to disable.
   */
  const saveDefaultCollapseLevel = (level: number | null) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ defaultCollapseLevel: level }));
      setDefaultCollapseLevel(level);
    } catch (e) {
      console.error('Failed to save outline preferences:', e);
    }
  };

  /**
   * Returns the memoized, filtered subset of `outline`.
   * When `searchQuery` is empty the full list is returned.
   */
  const filteredOutline = useMemo(() => filterOutline(outline, searchQuery), [outline, searchQuery]);

  /** Maps each heading's ID to its index within the full (unfiltered) `outline`. */
  const outlineIndexById = useMemo(() => {
    const map = new Map<string, number>();
    outline.forEach((item, index) => map.set(item.id, index));
    return map;
  }, [outline]);

  /**
   * Returns the IDs of all headings that are direct or indirect children
   * of the heading with the given `itemId`.
   *
   * @param itemId - The key of the parent heading.
   * @returns Array of child heading IDs.
   */
  const getChildrenIds = (itemId: string): string[] => {
    const index = outline.findIndex((item) => item.id === itemId);
    if (index === -1) return [];

    const parentLevel = outline[index].level;
    const children: string[] = [];

    for (let i = index + 1; i < outline.length; i++) {
      if (outline[i].level <= parentLevel) break;
      children.push(outline[i].id);
    }

    return children;
  };

  /**
   * Toggles the collapsed state of a heading. When collapsing, children
   * are also removed from the visible set.
   *
   * @param itemId - The key of the heading to toggle.
   */
  const toggleCollapse = (itemId: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
        const children = getChildrenIds(itemId);
        children.forEach((childId) => next.delete(childId));
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  /**
   * Collapses all headings at the specified level and re-applies the
   * collapsed-IDs set.
   *
   * @param level - Heading level to collapse (1 = H1, 2 = H2, …).
   */
  const applyCollapseToLevel = (level: number) => {
    const newCollapsed = new Set<string>();
    outline.forEach((item) => {
      if (item.level === level) {
        newCollapsed.add(item.id);
      }
    });
    setCollapsedIds(newCollapsed);
  };

  if (outline.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center">
        <div>
          <HashIcon className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-3" />
          <p className="text-sm text-muted-foreground">
            No headings found in this document
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Use the heading buttons in the toolbar
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-auto">
      {filteredOutline.map((item) => {
        const actualIndex = outlineIndexById.get(item.id) ?? -1;
        const nextItem = outline[actualIndex + 1];
        const hasChildren = nextItem && nextItem.level > item.level;
        const isCollapsed = collapsedIds.has(item.id);

        if (actualIndex !== -1 && isHiddenByCollapsedAncestor(outline, collapsedIds, actualIndex)) {
          return null;
        }

        return (
          <ContextMenu key={item.id}>
            <ContextMenuTrigger>
              <div
                className={cn(
                  'flex items-center gap-1 rounded-md cursor-pointer transition-colors hover:bg-sidebar-accent',
                  item.level === 1 && 'py-1.5 mt-0.5',
                  item.level === 2 && 'py-1',
                  item.level >= 3 && 'py-0.5'
                )}
                style={{ paddingLeft: `${(item.level - 1) * 12 + 4}px`, paddingRight: '4px' }}
                onClick={() => onNavigate?.(item.id)}
              >
                <button
                  className={cn(
                    'h-4 w-4 p-0 shrink-0 flex items-center justify-center hover:bg-transparent',
                    !hasChildren && 'invisible'
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleCollapse(item.id);
                  }}
                >
                  <ChevronRightIcon
                    className={cn(
                      'h-3 w-3 transition-transform text-muted-foreground',
                      !isCollapsed && 'rotate-90'
                    )}
                  />
                </button>

                <HashIcon
                  className={cn(
                    'shrink-0',
                    item.level === 1 && 'h-3.5 w-3.5 text-blue-500',
                    item.level === 2 && 'h-3 w-3 text-indigo-400',
                    item.level >= 3 && 'h-2.5 w-2.5 text-muted-foreground'
                  )}
                />
                <span
                  className={cn(
                    'flex-1 truncate',
                    item.level === 1 && 'text-sm font-semibold text-foreground',
                    item.level === 2 && 'text-sm font-medium text-foreground/90',
                    item.level === 3 && 'text-xs text-foreground/80',
                    item.level >= 4 && 'text-xs text-muted-foreground'
                  )}
                >
                  {item.text}
                </span>
              </div>
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuSub>
                <ContextMenuSubTrigger>Collapse to...</ContextMenuSubTrigger>
                <ContextMenuSubContent>
                  <ContextMenuItem onClick={() => applyCollapseToLevel(1)}>
                    Heading 1
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => applyCollapseToLevel(2)}>
                    Heading 2
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => applyCollapseToLevel(3)}>
                    Heading 3
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => applyCollapseToLevel(4)}>
                    Heading 4
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => setCollapsedIds(new Set())}>
                    Expand All
                  </ContextMenuItem>
                </ContextMenuSubContent>
              </ContextMenuSub>
              <ContextMenuSeparator />
              <ContextMenuCheckboxItem
                checked={defaultCollapseLevel !== null}
                onCheckedChange={(checked) => {
                  if (checked) {
                    const firstCollapsed = outline.find(item => collapsedIds.has(item.id));
                    if (firstCollapsed) {
                      saveDefaultCollapseLevel(firstCollapsed.level);
                    }
                  } else {
                    saveDefaultCollapseLevel(null);
                  }
                }}
              >
                Keep this collapse level as default
              </ContextMenuCheckboxItem>
            </ContextMenuContent>
          </ContextMenu>
        );
      })}
    </div>
  );
});
