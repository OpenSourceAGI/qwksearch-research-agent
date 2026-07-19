/**
 * @module EnhancedOutlineView
 * @description Extended outline panel that builds a heading tree from raw HTML
 * document content rather than Lexical's TOC plugin. Also shows document
 * metadata (status, priority, tags, due-date) and a tabbed `ResearchQuotes`
 * panel alongside the heading outline.
 */
import { Hash, ChevronRight, Tag, Share2, Calendar, AlertCircle, Quote, GripVertical, Filter, X } from 'lucide-react';
import { cn } from '../lib/utils';
import React, { useMemo, useState, useEffect } from 'react';
import { DocumentExtended } from '../types/document';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { DocumentActionsMenu } from '../documents/DocumentActionsMenu';
import { ResearchQuotes } from '../features/ResearchQuotes';
import { Input } from '../ui/input';
import Fuse from 'fuse.js';
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
} from '../ui/context-menu';

/** Internal flat representation of a parsed heading node. */
interface OutlineItem {
  /** Unique identifier generated as `"heading-${index}"`. */
  id: string;
  /** Heading level 1–6 parsed from the HTML tag name. */
  level: number;
  /** Plain-text content of the heading element. */
  text: string;
  /** Sequential index used as the navigation target. */
  line: number;
}

/** Props for the {@link EnhancedOutlineView} component. */
interface EnhancedOutlineViewProps {
  /** The document whose heading structure and metadata are visualised. */
  document: DocumentExtended;
  /** Called with the sequential heading index when the user clicks an item. */
  onNavigate?: (line: number) => void;
  /** Propagates partial updates back to the parent state. */
  onDocumentUpdate?: (updates: Partial<DocumentExtended>) => void;
  /** Optional drag-reorder callback receiving source and target indices. */
  onReorder?: (fromIndex: number, toIndex: number) => void;
}

/** `localStorage` key shared with {@link OutlineView} for collapse preferences. */
const STORAGE_KEY = 'outline-collapse-preferences';

/**
 * Heading outline panel for the enhanced right-side panel. Parses `document.content`
 * as HTML to extract headings, renders them in a collapsible tree with
 * drag-to-reorder support, and presents document metadata and a quotes tab.
 */
export const EnhancedOutlineView = ({
  document,
  onNavigate,
  onDocumentUpdate,
  onReorder,
}: EnhancedOutlineViewProps) => {
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [defaultCollapseLevel, setDefaultCollapseLevel] = useState<number | null>(null);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dragOverItem, setDragOverItem] = useState<string | null>(null);
  const [filterQuery, setFilterQuery] = useState<string>('');
  const [showFilter, setShowFilter] = useState<boolean>(false);

  const outline = useMemo(() => {
    const items: OutlineItem[] = [];

    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      return items;
    }

    // Parse HTML content for headings
    const parser = new DOMParser();
    const doc = parser.parseFromString(document.content, 'text/html');
    const headings = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');

    headings.forEach((heading, index) => {
      const level = parseInt(heading.tagName.substring(1));
      const text = heading.textContent || '';

      items.push({
        id: `heading-${index}`,
        level: level,
        text: text,
        line: index, // Note: line numbers don't apply to HTML, but keeping for navigation
      });
    });

    return items;
  }, [document.content]);

  // Fuse.js configuration for fuzzy search
  const fuse = useMemo(() => {
    return new Fuse(outline, {
      keys: ['text'],
      threshold: 0.3,
      includeScore: true,
      includeMatches: true,
    });
  }, [outline]);

  // Filtered outline based on search query
  const filteredOutline = useMemo(() => {
    if (!filterQuery.trim()) {
      return outline;
    }

    const results = fuse.search(filterQuery);
    return results.map(result => result.item);
  }, [outline, filterQuery, fuse]);

  // Get match indices for highlighting
  const getMatchIndices = (itemId: string): [number, number][] => {
    if (!filterQuery.trim()) return [];

    const results = fuse.search(filterQuery);
    const result = results.find(r => r.item.id === itemId);

    if (result && result.matches) {
      const textMatch = result.matches.find(m => m.key === 'text');
      return textMatch?.indices || [];
    }

    return [];
  };

  // Highlight matched text segments
  const highlightText = (text: string, itemId: string) => {
    const matches = getMatchIndices(itemId);
    if (matches.length === 0) {
      return <>{text}</>;
    }

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    // Sort matches by start index
    const sortedMatches = [...matches].sort((a, b) => a[0] - b[0]);

    sortedMatches.forEach(([start, end], idx) => {
      // Add text before the match
      if (start > lastIndex) {
        parts.push(text.substring(lastIndex, start));
      }

      // Add highlighted match
      parts.push(
        <mark key={`match-${idx}`} className="bg-yellow-300 dark:bg-yellow-600 rounded px-0.5">
          {text.substring(start, end + 1)}
        </mark>
      );

      lastIndex = end + 1;
    });

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return <>{parts}</>;
  };

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
   * Persists the default collapse level preference to `localStorage`.
   *
   * @param level - Heading level to auto-collapse on load, or `null` to disable.
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
   * Returns all IDs that are direct or transitive children of `itemId`.
   *
   * @param itemId - ID of the parent heading.
   * @returns Array of descendant IDs.
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
   * Toggles the collapsed state of a heading. Expanding also restores
   * all previously-hidden descendants.
   *
   * @param itemId - ID of the heading to toggle.
   */
  const toggleCollapse = (itemId: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        // Expand: remove this item and all its descendants from collapsed
        next.delete(itemId);
        const children = getChildrenIds(itemId);
        children.forEach((childId) => next.delete(childId));
      } else {
        // Collapse: add this item to collapsed
        next.add(itemId);
      }
      return next;
    });
  };

  /**
   * Returns `true` if an ancestor heading at a lower level is currently
   * collapsed, hiding this item from the list.
   *
   * @param itemIndex - Zero-based position in the flat `outline` array.
   */
  const isHiddenByParent = (itemIndex: number): boolean => {
    const currentLevel = outline[itemIndex].level;

    // Look backwards for parent items
    for (let i = itemIndex - 1; i >= 0; i--) {
      if (outline[i].level < currentLevel) {
        // Found a parent
        if (collapsedIds.has(outline[i].id)) {
          return true;
        }
        // Continue checking higher-level parents
        if (outline[i].level === 1) break;
      }
    }

    return false;
  };

  /**
   * Collapses all headings at the given level.
   *
   * @param level - Target heading level.
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

  /**
   * Drag-start handler: records the ID of the heading being dragged.
   *
   * @param e - Native drag event.
   * @param itemId - ID of the dragged heading.
   */
  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    setDraggedItem(itemId);
    e.dataTransfer.effectAllowed = 'move';
  };

  /**
   * Drag-over handler: tracks the current drop target.
   *
   * @param e - Native drag event.
   * @param itemId - ID of the heading being hovered.
   */
  const handleDragOver = (e: React.DragEvent, itemId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverItem(itemId);
  };

  /** Drag-end handler: clears all drag state. */
  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverItem(null);
  };

  /**
   * Drop handler: fires `onReorder` with the resolved source and target indices.
   *
   * @param e - Native drop event.
   * @param targetId - ID of the heading that received the drop.
   */
  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedItem || draggedItem === targetId) return;

    const fromIndex = outline.findIndex((item) => item.id === draggedItem);
    const toIndex = outline.findIndex((item) => item.id === targetId);

    if (fromIndex !== -1 && toIndex !== -1 && onReorder) {
      onReorder(fromIndex, toIndex);
    }

    setDraggedItem(null);
    setDragOverItem(null);
  };

  const statusColors = {
    draft: 'bg-gray-500',
    'in-progress': 'bg-blue-500',
    review: 'bg-yellow-500',
    final: 'bg-green-500',
  };

  const priorityColors = {
    low: 'bg-gray-400',
    medium: 'bg-orange-400',
    high: 'bg-red-500',
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header with metadata and actions */}
      <div className="border-b p-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <h3 className="font-semibold truncate">{document.title || 'Untitled'}</h3>
            {document.metadata?.status && (
              <Badge
                className={`${statusColors[document.metadata.status]} text-white text-xs`}
                variant="secondary"
              >
                {document.metadata.status}
              </Badge>
            )}
            {document.metadata?.priority && (
              <Badge
                className={`${priorityColors[document.metadata.priority]} text-white text-xs`}
                variant="secondary"
              >
                {document.metadata.priority}
              </Badge>
            )}
          </div>
          <DocumentActionsMenu
            document={document}
            onMetadataUpdate={(metadata) =>
              onDocumentUpdate?.({ metadata })
            }
            onSharingUpdate={(sharing) =>
              onDocumentUpdate?.({ sharing })
            }
            onDelete={() => { }}
            onDuplicate={() => { }}
          />
        </div>

        {/* Metadata display */}
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {document.metadata?.tags && document.metadata.tags.length > 0 && (
            <div className="flex items-center gap-1">
              <Tag className="h-3 w-3" />
              <div className="flex gap-1">
                {document.metadata.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {document.metadata?.dueDate && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>Due: {new Date(document.metadata.dueDate).toLocaleDateString()}</span>
            </div>
          )}

          {document.sharing?.isPublic && (
            <div className="flex items-center gap-1">
              <Share2 className="h-3 w-3" />
              <span>Public</span>
            </div>
          )}

          {document.sharing?.sharedWith && document.sharing.sharedWith.length > 0 && (
            <div className="flex items-center gap-1">
              <Share2 className="h-3 w-3" />
              <span>Shared with {document.sharing.sharedWith.length}</span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs for Outline and Quotes */}
      <Tabs defaultValue="outline" className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start border-b rounded-none h-auto p-0">
          <TabsTrigger value="outline" className="rounded-none data-[state=active]:border-b-2">
            <Hash className="h-4 w-4 mr-2" />
            Outline ({outline.length})
          </TabsTrigger>
          <TabsTrigger value="quotes" className="rounded-none data-[state=active]:border-b-2">
            <Quote className="h-4 w-4 mr-2" />
            Quotes ({document.quotes?.length || 0})
          </TabsTrigger>
          <div className="ml-auto flex items-center px-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => {
                setShowFilter(!showFilter);
                if (showFilter) {
                  setFilterQuery('');
                }
              }}
              title="Filter headings"
            >
              <Filter className={cn("h-4 w-4", filterQuery && "text-primary")} />
            </Button>
          </div>
        </TabsList>

        <TabsContent value="outline" className="flex-1 overflow-auto p-2 mt-0">
          {/* Filter input */}
          {showFilter && (
            <div className="mb-3 px-1">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Filter headings..."
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  className="pr-8"
                  autoFocus
                />
                {filterQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                    onClick={() => setFilterQuery('')}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
              {filterQuery && (
                <p className="text-xs text-muted-foreground mt-1 px-1">
                  {filteredOutline.length} of {outline.length} headings
                </p>
              )}
            </div>
          )}

          {outline.length === 0 ? (
            <div className="flex h-full items-center justify-center p-6 text-center">
              <div>
                <Hash className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-3" />
                <p className="text-sm text-muted-foreground">
                  No headings found in this document
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Use the heading buttons in the toolbar
                </p>
              </div>
            </div>
          ) : filteredOutline.length === 0 ? (
            <div className="flex h-full items-center justify-center p-6 text-center">
              <div>
                <Filter className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-3" />
                <p className="text-sm text-muted-foreground">
                  No headings match your filter
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Try a different search term
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredOutline.map((item) => {
                // Find the original index in the full outline
                const originalIndex = outline.findIndex(o => o.id === item.id);
                const nextItem = outline[originalIndex + 1];
                const hasChildren = nextItem && nextItem.level > item.level;
                const isCollapsed = collapsedIds.has(item.id);

                // When filtering, show all matched items regardless of parent collapse state
                // Only check parent collapse when no filter is active
                if (!filterQuery.trim() && isHiddenByParent(originalIndex)) {
                  return null;
                }

                return (
                  <ContextMenu key={item.id}>
                    <ContextMenuTrigger>
                      <div
                        draggable
                        onDragStart={(e) => handleDragStart(e, item.id)}
                        onDragOver={(e) => handleDragOver(e, item.id)}
                        onDragEnd={handleDragEnd}
                        onDrop={(e) => handleDrop(e, item.id)}
                        className={cn(
                          'group flex items-center gap-1 px-2 py-1.5 hover:bg-sidebar-accent rounded-md cursor-pointer transition-colors',
                          draggedItem === item.id && 'opacity-50',
                          dragOverItem === item.id && 'border-t-2 border-primary'
                        )}
                        style={{ paddingLeft: `${(item.level - 1) * 12 + 8}px` }}
                        onClick={() => onNavigate?.(item.line)}
                      >
                        <GripVertical className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity cursor-grab" />

                        <button
                          className={cn(
                            'h-5 w-5 p-0 flex items-center justify-center hover:bg-transparent',
                            !hasChildren && 'invisible'
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleCollapse(item.id);
                          }}
                        >
                          <ChevronRight
                            className={cn(
                              'h-3 w-3 transition-transform text-muted-foreground',
                              !isCollapsed && 'rotate-90'
                            )}
                          />
                        </button>

                        <Hash
                          className={cn(
                            'h-3 w-3 flex-shrink-0 text-muted-foreground',
                            item.level === 1 && 'h-4 w-4'
                          )}
                        />
                        <span
                          className={cn(
                            'flex-1 truncate text-sm',
                            item.level === 1 && 'font-semibold',
                            item.level === 2 && 'font-medium'
                          )}
                        >
                          {highlightText(item.text, item.id)}
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
                            // Save current first collapsed level as default
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
          )}
        </TabsContent>

        <TabsContent value="quotes" className="flex-1 overflow-auto p-2 mt-0">
          <ResearchQuotes
            documentId={document.id}
            quotes={document.quotes || []}
            onQuotesChange={(quotes) => onDocumentUpdate?.({ quotes })}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};
