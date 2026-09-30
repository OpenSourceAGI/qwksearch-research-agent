/**
 * @fileoverview The dense layout: the same videos as `<VideoGrid>`, as table
 * rows — optionally grouped into a collapsible tree.
 *
 * Ported from debate-ai.com's `VideoListRows` / `VideoTreeRows`. What carried
 * over:
 *
 * - **Columns are drag-resizable and click-sortable.** In a grouped list a sort
 *   re-orders the videos *within* their group, never the groups themselves
 *   (see `sortVideoTreeLeaves`).
 * - **`groupBy` builds a tree** — `['year', 'channel']`, or your own
 *   `VideoGrouper`s. A group row opens and closes on click, and the `L1 … Ln`
 *   buttons in the first header move every group at once: `L1` leaves only the
 *   outermost groups standing, the last level shows every video.
 * - **One row per slot:** a stacked playlist is one row, with its `<` / `>`
 *   control inline, and grouping follows the member the feed returned so
 *   flipping a row never re-files it.
 * - **Clicking a row plays it** in the floating player (or calls `onPlay`).
 */

'use client';

import { memo, useCallback, useMemo, useState, type ReactNode } from 'react';
import { ChevronDown, ChevronRight, ChevronUp, EyeOff, Eye, ListPlus, Star } from 'lucide-react';

import { buildVideoSlots, type VideoSlot, type VideoStackMap } from '../../library/stacks';
import {
  buildVideoTree,
  countVideoTreeLeaves,
  groupKeysFromDepth,
  resolveGroupers,
  sortVideoTreeLeaves,
  videoTreeDepth,
  type BuiltInGrouping,
  type VideoGrouper,
  type VideoTreeNode,
} from '../../library/tree';
import type { CustomFieldDef, VideoItem } from '../../library/types';
import { usePlayerSelector, youtubePlayer } from '../player/playerStore';
import { formatCustomCell, formatVideoDate, formatViewCount, thumbnailFor, toPlayerVideo } from './format';
import { StackNav, defaultStackLabel } from './StackNav';
import { ColumnResizeHandle, useResizableColumns } from './useResizableColumns';
import { HideConfirm, hasId, type VideoActionProps } from './VideoCard';
import { GridStylesProvider } from './styles';

export type SortDirection = 'asc' | 'desc';

/** A column the list can sort by: a built-in one or `custom:<fieldKey>`. */
export type VideoListColumn = 'title' | 'channel' | 'date' | 'views' | `custom:${string}`;

export interface VideoListProps extends VideoActionProps {
  videos: readonly VideoItem[];
  /** Members of the stacks on screen; see `VideoGrid`. */
  stacks?: VideoStackMap | null;
  stacksEnabled?: boolean;
  stackLabel?: (video: VideoItem, index: number) => string | undefined;
  /**
   * Group rows into a tree, outermost level first: built-in `'year'`,
   * `'channel'`, `'category'`, or any `VideoGrouper` (e.g.
   * `groupByCustomField('speaker')`). Omit for a flat list.
   */
  groupBy?: ReadonlyArray<BuiltInGrouping | VideoGrouper>;
  /** Tree level the list opens at (1 = only outermost groups). Default: fully open. */
  defaultCollapseDepth?: number;
  /** Column the list opens sorted by. Without it rows keep the feed's order. */
  defaultSort?: { column: VideoListColumn; direction: SortDirection };
  /** Show the thumbnail in the title cell. Default `true`. */
  showThumbnails?: boolean;
  /** Hide the Channel column — e.g. when grouping by channel already says it. */
  hideChannelColumn?: boolean;
  emptyState?: ReactNode;
  className?: string;
}

interface ColumnDef {
  key: VideoListColumn;
  label: string;
  numeric?: boolean;
  width: number;
  value: (video: VideoItem) => string | number;
  render: (video: VideoItem) => ReactNode;
}

function customColumn(def: CustomFieldDef): ColumnDef {
  return {
    key: `custom:${def.key}`,
    label: def.label,
    numeric: def.type === 'number',
    width: def.type === 'boolean' ? 90 : 140,
    value: (video) => {
      const raw = video.custom?.[def.key];
      if (typeof raw === 'number') return raw;
      if (typeof raw === 'boolean') return raw ? 1 : 0;
      return (raw ?? '').toString().toLowerCase();
    },
    render: (video) => {
      const raw = video.custom?.[def.key];
      if (def.type === 'url' && typeof raw === 'string') {
        return (
          <a href={raw} target="_blank" rel="noopener noreferrer" onClick={(event) => event.stopPropagation()}>
            Link
          </a>
        );
      }
      return formatCustomCell(def, raw);
    },
  };
}

function leadVideo(slot: VideoSlot): VideoItem {
  return slot.videos[slot.initialIndex] ?? slot.videos[0];
}

interface RowContext extends VideoActionProps {
  columns: ColumnDef[];
  showThumbnails: boolean;
  stackLabel: (video: VideoItem, index: number) => string | undefined;
  onRequestHide: (video: VideoItem) => void;
}

const ListRow = memo(function ListRow({ slot, depth, ctx }: { slot: VideoSlot; depth: number; ctx: RowContext }) {
  const [index, setIndex] = useState(slot.initialIndex);
  const position = Math.min(Math.max(index, 0), slot.videos.length - 1);
  const video = slot.videos[position] ?? slot.videos[0];
  const isPlaying = usePlayerSelector((state) => state.activeVideo?.videoId === video.videoId);
  const isQueued = usePlayerSelector((state) => state.queue.some((item) => item.videoId === video.videoId));
  const isFavorite = hasId(ctx.favorites, video.videoId);
  const isHidden = hasId(ctx.hidden, video.videoId);
  const play = () => (ctx.onPlay ? ctx.onPlay(video) : youtubePlayer.play(toPlayerVideo(video)));
  const stop = (event: { stopPropagation: () => void }) => event.stopPropagation();

  return (
    <tr
      className={`eytg-row${isPlaying ? ' eytg-playing' : ''}`}
      onClick={play}
      style={isHidden ? { opacity: 0.6 } : undefined}
      aria-label={video.title || video.videoId}
    >
      {ctx.columns.map((column) =>
        column.key === 'title' ? (
          <td key="title" style={{ paddingLeft: 10 + depth * 18 }}>
            <div className="eytg-row-title">
              {ctx.showThumbnails && <img className="eytg-row-thumb" src={thumbnailFor(video.videoId)} alt="" loading="lazy" />}
              <div className="eytg-row-text">
                <strong title={video.title}>{video.title || video.videoId}</strong>
                <span>
                  {[video.category, video.featured ? 'Top pick' : null, isQueued && !isPlaying ? 'Queued' : null]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
                {slot.videos.length > 1 && (
                  <div onClick={stop}>
                    <StackNav
                      variant="inline"
                      index={position}
                      count={slot.videos.length}
                      label={ctx.stackLabel(video, position)}
                      onSelect={setIndex}
                    />
                  </div>
                )}
              </div>
            </div>
          </td>
        ) : (
          <td key={column.key} className={column.numeric ? 'eytg-num' : undefined}>
            {column.render(video)}
          </td>
        ),
      )}
      <td onClick={stop}>
        <div className="eytg-row-actions">
          {ctx.onToggleFavorite && (
            <button
              type="button"
              className={`eytg-icon-btn${isFavorite ? ' eytg-on' : ''}`}
              onClick={() => ctx.onToggleFavorite?.(video.videoId)}
              aria-pressed={isFavorite}
              aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Star size={14} fill={isFavorite ? 'currentColor' : 'none'} />
            </button>
          )}
          {ctx.showQueueButton !== false && (
            <button
              type="button"
              className="eytg-icon-btn"
              onClick={() => youtubePlayer.addToQueue(toPlayerVideo(video))}
              disabled={isPlaying || isQueued}
              aria-label="Add to queue"
            >
              <ListPlus size={14} />
            </button>
          )}
          {ctx.renderActions?.(video)}
          {isHidden
            ? ctx.onUnhide && (
                <button type="button" className="eytg-icon-btn" onClick={() => ctx.onUnhide?.(video.videoId)} aria-label="Unhide">
                  <Eye size={14} />
                </button>
              )
            : ctx.onHide && (
                <button type="button" className="eytg-icon-btn" onClick={() => ctx.onRequestHide(video)} aria-label="Hide">
                  <EyeOff size={14} />
                </button>
              )}
        </div>
      </td>
    </tr>
  );
});

function VideoListComponent({
  videos,
  stacks,
  stacksEnabled = true,
  stackLabel = defaultStackLabel,
  groupBy,
  defaultCollapseDepth,
  defaultSort,
  showThumbnails = true,
  hideChannelColumn = false,
  emptyState,
  className,
  customFields,
  ...actions
}: VideoListProps) {
  const columns = useMemo<ColumnDef[]>(() => {
    const list: ColumnDef[] = [
      {
        key: 'title',
        label: 'Video',
        width: showThumbnails ? 420 : 320,
        value: (video) => (video.title ?? '').toLowerCase(),
        render: () => null,
      },
    ];
    if (!hideChannelColumn) {
      list.push({
        key: 'channel',
        label: 'Channel',
        width: 160,
        value: (video) => (video.channel ?? '').toLowerCase(),
        render: (video) => video.channel ?? '',
      });
    }
    for (const def of customFields ?? []) if (def.showInList) list.push(customColumn(def));
    list.push(
      {
        key: 'date',
        label: 'Date',
        width: 110,
        value: (video) => (video.publishedAt ? Date.parse(video.publishedAt) || 0 : 0),
        render: (video) => formatVideoDate(video.publishedAt, true),
      },
      {
        key: 'views',
        label: 'Views',
        numeric: true,
        width: 90,
        value: (video) => video.viewCount ?? 0,
        render: (video) => formatViewCount(video.viewCount),
      },
    );
    return list;
  }, [customFields, hideChannelColumn, showThumbnails]);

  const defaultWidths = useMemo(
    () => Object.fromEntries(columns.map((column) => [column.key, column.width])) as Record<string, number>,
    [columns],
  );
  const { widths, startResize } = useResizableColumns<string>(defaultWidths);
  const [sort, setSort] = useState<{ column: VideoListColumn; direction: SortDirection } | null>(defaultSort ?? null);
  const [pendingHide, setPendingHide] = useState<VideoItem | null>(null);

  const slots = useMemo(() => buildVideoSlots(videos, stacks, stacksEnabled), [videos, stacks, stacksEnabled]);
  const groupers = useMemo(() => (groupBy && groupBy.length > 0 ? resolveGroupers(groupBy) : []), [groupBy]);
  const tree = useMemo(() => buildVideoTree(slots, groupers), [slots, groupers]);

  const compare = useCallback(
    (a: VideoSlot, b: VideoSlot) => {
      if (!sort) return 0;
      const column = columns.find((candidate) => candidate.key === sort.column);
      if (!column) return 0;
      const left = column.value(leadVideo(a));
      const right = column.value(leadVideo(b));
      const order = typeof left === 'number' && typeof right === 'number' ? left - right : String(left).localeCompare(String(right));
      return sort.direction === 'asc' ? order : -order;
    },
    [columns, sort],
  );
  const sortedTree = useMemo(() => (sort ? sortVideoTreeLeaves(tree, compare) : tree), [tree, sort, compare]);

  const depth = videoTreeDepth(tree);
  const [collapsed, setCollapsed] = useState<Set<string>>(() =>
    new Set(defaultCollapseDepth ? groupKeysFromDepth(tree, defaultCollapseDepth - 1) : []),
  );
  const [level, setLevel] = useState<number>(defaultCollapseDepth ?? depth);

  const setTreeLevel = (next: number) => {
    setLevel(next);
    setCollapsed(new Set(groupKeysFromDepth(tree, next - 1)));
  };
  const toggleGroup = (key: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  // A new column opens in its natural direction (A→Z for text, biggest or
  // newest first for numbers); clicking it again flips it.
  const toggleSort = (column: VideoListColumn) =>
    setSort((prev) =>
      prev?.column === column
        ? { column, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { column, direction: column === 'title' || column === 'channel' ? 'asc' : 'desc' },
    );

  const ctx: RowContext = {
    ...actions,
    columns,
    showThumbnails,
    stackLabel,
    onRequestHide: setPendingHide,
  };

  const rows: ReactNode[] = [];
  const walk = (nodes: VideoTreeNode[], nodeDepth: number) => {
    for (const node of nodes) {
      if (node.type === 'video') {
        rows.push(<ListRow key={node.key} slot={node.slot} depth={nodeDepth} ctx={ctx} />);
        continue;
      }
      const open = !collapsed.has(node.key);
      rows.push(
        <tr key={node.key} className="eytg-group-row" onClick={() => toggleGroup(node.key)} aria-expanded={open}>
          <td colSpan={columns.length + 1} style={{ paddingLeft: 10 + nodeDepth * 18 }}>
            <span className="eytg-group-label">
              {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              {node.label}
              <span className="eytg-group-count">
                {`${node.videoCount} video${node.videoCount === 1 ? '' : 's'} · ${formatViewCount(node.viewCount)} views`}
              </span>
            </span>
          </td>
        </tr>,
      );
      if (open) walk(node.children, nodeDepth + 1);
    }
  };
  walk(sortedTree, 0);

  return (
    <GridStylesProvider>
      <div className={`eytg-root${className ? ` ${className}` : ''}`}>
        {countVideoTreeLeaves(tree) === 0 ? (
          <div className="eytg-empty">{emptyState ?? 'No videos to show.'}</div>
        ) : (
          <div className="eytg-table-wrap">
            <table className="eytg-table">
              <colgroup>
                {columns.map((column) => (
                  <col key={column.key} style={{ width: widths[column.key] ?? column.width }} />
                ))}
                <col style={{ width: 120 }} />
              </colgroup>
              <thead>
                <tr>
                  {columns.map((column, columnIndex) => {
                    const active = sort?.column === column.key;
                    return (
                      <th key={column.key} className={column.numeric ? 'eytg-num' : undefined} aria-sort={active ? (sort?.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
                        <button type="button" className="eytg-th-btn" onClick={() => toggleSort(column.key)}>
                          {column.label}
                          {active && (sort?.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                        </button>
                        {columnIndex === 0 && groupers.length > 0 && depth > 1 && (
                          <span className="eytg-levels" role="group" aria-label="Tree level">
                            {Array.from({ length: depth }, (_, i) => i + 1).map((n) => (
                              <button
                                type="button"
                                key={n}
                                className={level === n ? 'eytg-on' : undefined}
                                onClick={() => setTreeLevel(n)}
                                title={n === depth ? 'Show every video' : `Show ${n} level${n === 1 ? '' : 's'}`}
                              >
                                {`L${n}`}
                              </button>
                            ))}
                          </span>
                        )}
                        <ColumnResizeHandle label={column.label} onResizeStart={(x) => startResize(column.key, x)} />
                      </th>
                    );
                  })}
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>{rows}</tbody>
            </table>
          </div>
        )}
        {pendingHide && actions.onHide && (
          <HideConfirm
            title={pendingHide.title}
            onCancel={() => setPendingHide(null)}
            onConfirm={() => {
              actions.onHide?.(pendingHide.videoId);
              setPendingHide(null);
            }}
          />
        )}
      </div>
    </GridStylesProvider>
  );
}

export const VideoList = memo(VideoListComponent);
