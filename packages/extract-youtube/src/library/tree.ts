/**
 * @fileoverview Grouping a list of video slots into the collapsible tree that
 * `<VideoList grouped />` renders — the same shape as a file tree, where a row
 * is either a folder you open or a leaf you act on.
 *
 * Ported from debate-ai.com's `video-tree.ts`, which hard-coded two
 * hierarchies (season → tournament for rounds, season → channel → category for
 * lectures). Here the hierarchy is a list of {@link VideoGrouper}s the caller
 * chooses — {@link groupByYear}, {@link groupByChannel},
 * {@link groupByCategory}, {@link groupByCustomField}, or your own — and the
 * rules that made the original read well are kept:
 *
 * - Grouping runs on the **slot**, not the video, so a stacked playlist sits in
 *   one leaf and flipping it on screen never re-files the row.
 * - Groups sort above loose leaves; placeholder groups ("Unsorted") sort last.
 * - A column sort re-orders videos *within* their group, never the groups —
 *   see {@link sortVideoTreeLeaves}.
 *
 * Kept free of React so the grouping rule is testable as list-in, tree-out.
 */

import type { VideoItem } from './types';
import type { VideoSlot } from './stacks';

/** Label used for videos missing the field a level groups by. */
export const UNGROUPED_LABEL = 'Unsorted';

/** One level of a video's path through the tree. */
export interface GroupStep {
  /** Stable id of the level, e.g. `year`. Drives the row's icon in the UI. */
  kind: string;
  label: string;
  /** Sort position among siblings: numbers ascending, strings by locale. */
  sortValue: number | string;
  /** Placeholder groups (`Unsorted`) sort after their siblings. */
  trailing?: boolean;
}

/**
 * Where one video sits at one level of the tree. Return `null` to stop the
 * video's path at the level above — it then renders as a loose row there
 * rather than under an `Unsorted` placeholder.
 */
export type VideoGrouper<T extends VideoItem = VideoItem> = (video: T) => GroupStep | null;

/** A leaf: one rendered row, standing for one slot. */
export interface VideoTreeLeaf<T extends VideoItem = VideoItem> {
  type: 'video';
  key: string;
  slot: VideoSlot<T>;
}

/** A branch: a year, a channel, a category, … */
export interface VideoTreeGroup<T extends VideoItem = VideoItem> {
  type: 'group';
  /** Path key — this group's and its ancestors' labels. */
  key: string;
  kind: string;
  label: string;
  children: VideoTreeNode<T>[];
  /** Videos below this group at any depth, stack members included. */
  videoCount: number;
  /** Summed views of those videos. */
  viewCount: number;
  /** Newest publish date below this group. */
  latestDate: string | null;
  /** Oldest publish date below this group. */
  earliestDate: string | null;
  sortValue: number | string;
  trailing: boolean;
}

export type VideoTreeNode<T extends VideoItem = VideoItem> = VideoTreeGroup<T> | VideoTreeLeaf<T>;

/** Groups by publish year, newest first. Undated videos go under `Undated`, last. */
export const groupByYear: VideoGrouper = (video) => {
  const ms = video.publishedAt ? Date.parse(video.publishedAt) : NaN;
  if (!Number.isFinite(ms)) return { kind: 'year', label: 'Undated', sortValue: 0, trailing: true };
  const year = new Date(ms).getUTCFullYear();
  // Negated: the newest year heads the list.
  return { kind: 'year', label: String(year), sortValue: -year };
};

/** Groups by channel name, alphabetically. */
export const groupByChannel: VideoGrouper = (video) => {
  const channel = video.channel?.trim();
  return {
    kind: 'channel',
    label: channel || UNGROUPED_LABEL,
    sortValue: channel?.toLowerCase() ?? '',
    trailing: !channel,
  };
};

/** Groups by category, alphabetically. */
export const groupByCategory: VideoGrouper = (video) => {
  const category = video.category?.trim();
  return {
    kind: 'category',
    label: category || UNGROUPED_LABEL,
    sortValue: category?.toLowerCase() ?? '',
    trailing: !category,
  };
};

/**
 * Groups by one of the host's custom fields. With `skipEmpty`, a video missing
 * the field stops at the level above instead of landing under `Unsorted` — how
 * debate-ai.com slotted a round with no tournament between the tournaments of
 * its season.
 */
export function groupByCustomField(key: string, options: { skipEmpty?: boolean } = {}): VideoGrouper {
  return (video) => {
    const raw = video.custom?.[key];
    const value = raw === null || raw === undefined ? '' : String(raw).trim();
    if (!value) {
      return options.skipEmpty
        ? null
        : { kind: key, label: UNGROUPED_LABEL, sortValue: '', trailing: true };
    }
    return { kind: key, label: value, sortValue: value.toLowerCase() };
  };
}

/** Names of the built-in groupers, for props that take a string. */
export type BuiltInGrouping = 'year' | 'channel' | 'category';

export const BUILT_IN_GROUPERS: Record<BuiltInGrouping, VideoGrouper> = {
  year: groupByYear,
  channel: groupByChannel,
  category: groupByCategory,
};

/** Resolves a mix of built-in names and grouper functions. */
export function resolveGroupers<T extends VideoItem>(
  groupBy: ReadonlyArray<BuiltInGrouping | VideoGrouper<T>>,
): VideoGrouper<T>[] {
  return groupBy.map((entry) =>
    typeof entry === 'string' ? (BUILT_IN_GROUPERS[entry] as VideoGrouper<T>) : entry,
  );
}

function dateTime(value: string | null | undefined): number | null {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : null;
}

function earlierDate(current: string | null, candidate: string | null | undefined): string | null {
  const candidateTime = dateTime(candidate);
  if (candidateTime === null) return current;
  const currentTime = dateTime(current);
  return currentTime === null || candidateTime < currentTime ? (candidate as string) : current;
}

function laterDate(current: string | null, candidate: string | null | undefined): string | null {
  const candidateTime = dateTime(candidate);
  if (candidateTime === null) return current;
  const currentTime = dateTime(current);
  return currentTime === null || candidateTime > currentTime ? (candidate as string) : current;
}

/**
 * Orders siblings: groups above leaves, placeholder groups last, otherwise by
 * the level's sort value. Leaves compare equal, so a stable sort keeps them in
 * feed order.
 */
export function compareTreeNodes<T extends VideoItem>(a: VideoTreeNode<T>, b: VideoTreeNode<T>): number {
  if (a.type !== b.type) return a.type === 'group' ? -1 : 1;
  if (a.type !== 'group' || b.type !== 'group') return 0;
  if (a.trailing !== b.trailing) return a.trailing ? 1 : -1;
  if (typeof a.sortValue === 'number' && typeof b.sortValue === 'number') {
    return a.sortValue - b.sortValue;
  }
  return String(a.sortValue).localeCompare(String(b.sortValue));
}

function sortTree<T extends VideoItem>(nodes: VideoTreeNode<T>[]): void {
  nodes.sort(compareTreeNodes);
  for (const node of nodes) if (node.type === 'group') sortTree(node.children);
}

/**
 * Groups slots into a tree.
 *
 * @param slots - Slots in feed order, from `buildVideoSlots`.
 * @param groupers - One per level, outermost first.
 * @returns The roots of the tree.
 */
export function buildVideoTree<T extends VideoItem>(
  slots: readonly VideoSlot<T>[],
  groupers: readonly VideoGrouper<T>[],
): VideoTreeNode<T>[] {
  const roots: VideoTreeNode<T>[] = [];
  const groups = new Map<string, VideoTreeGroup<T>>();

  for (const slot of slots) {
    // The member the feed returned decides where the slot sits, so flipping a
    // stack on screen never re-files the row.
    const video = slot.videos[slot.initialIndex] ?? slot.videos[0];
    if (!video) continue;
    const views = slot.videos.reduce((total, member) => total + (member.viewCount ?? 0), 0);

    let siblings = roots;
    let key = '';
    for (const grouper of groupers) {
      const step = grouper(video);
      if (!step) break;
      key = key ? `${key} / ${step.kind}:${step.label}` : `${step.kind}:${step.label}`;
      let group = groups.get(key);
      if (!group) {
        group = {
          type: 'group',
          key,
          kind: step.kind,
          label: step.label,
          children: [],
          videoCount: 0,
          viewCount: 0,
          latestDate: null,
          earliestDate: null,
          sortValue: step.sortValue,
          trailing: step.trailing ?? false,
        };
        groups.set(key, group);
        siblings.push(group);
      }
      group.videoCount += slot.videos.length;
      group.viewCount += views;
      group.latestDate = laterDate(group.latestDate, video.publishedAt);
      group.earliestDate = earlierDate(group.earliestDate, video.publishedAt);
      siblings = group.children;
    }
    siblings.push({ type: 'video', key: slot.key, slot });
  }

  sortTree(roots);
  return roots;
}

/**
 * Levels of rows the tree has — group levels plus the videos. The collapse
 * control offers this many levels. At least 1, even when empty.
 */
export function videoTreeDepth<T extends VideoItem>(nodes: readonly VideoTreeNode<T>[]): number {
  let deepest = 0;
  for (const node of nodes) {
    const depth = node.type === 'group' ? 1 + videoTreeDepth(node.children) : 1;
    if (depth > deepest) deepest = depth;
  }
  return Math.max(1, deepest);
}

/**
 * Re-orders the leaves inside each group, for a column sort. Groups keep the
 * hierarchy's own order — a year is where it is because of when it was, not
 * because of the column a row is sorted by.
 *
 * @returns A new tree; the input is left alone.
 */
export function sortVideoTreeLeaves<T extends VideoItem>(
  nodes: readonly VideoTreeNode<T>[],
  compare: (a: VideoSlot<T>, b: VideoSlot<T>) => number,
): VideoTreeNode<T>[] {
  const leaves = nodes.filter((node): node is VideoTreeLeaf<T> => node.type === 'video');
  const sortedLeaves = [...leaves].sort((a, b) => compare(a.slot, b.slot));
  let next = 0;
  return nodes.map((node) =>
    node.type === 'group'
      ? { ...node, children: sortVideoTreeLeaves(node.children, compare) }
      : sortedLeaves[next++],
  );
}

/** Leaves in a tree — the rows it would render fully open. */
export function countVideoTreeLeaves<T extends VideoItem>(nodes: readonly VideoTreeNode<T>[]): number {
  return nodes.reduce(
    (total, node) => total + (node.type === 'group' ? countVideoTreeLeaves(node.children) : 1),
    0,
  );
}

/**
 * Keys of every group at `depth` or deeper (0 = roots). The list collapses
 * these to show the tree down to a given level.
 */
export function groupKeysFromDepth<T extends VideoItem>(
  nodes: readonly VideoTreeNode<T>[],
  depth: number,
  current = 0,
): string[] {
  const keys: string[] = [];
  for (const node of nodes) {
    if (node.type !== 'group') continue;
    if (current >= depth) keys.push(node.key);
    keys.push(...groupKeysFromDepth(node.children, depth, current + 1));
  }
  return keys;
}
