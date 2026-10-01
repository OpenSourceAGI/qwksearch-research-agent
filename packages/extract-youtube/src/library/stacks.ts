/**
 * @fileoverview Stacked playlists — small groups of videos that are the same
 * thing seen from two angles, and so share one slot in a grid.
 *
 * A talk and the Q&A recorded after it, a video split across two uploads, the
 * parts of a short series: rendering each as its own card scatters them across
 * a listing. A stack renders as **one** card (or one list row) with `<` / `>`
 * arrows that flip between its members.
 *
 * Two halves, both ported from debate-ai.com (where the stack was a debate
 * round and the round-analysis video made from it):
 *
 * - **Forming stacks** — {@link buildVideoStacks} / {@link assignVideoStacks}.
 *   Nothing is hand-maintained: a video whose YouTube description links to
 *   another video in the library is stacked with it. Channels already write
 *   those links ("Part 2: https://youtu.be/…"), so linking two videos is an
 *   edit to a description, not to a curated list. Every link is undirected,
 *   links to ids the library doesn't hold are ignored, and a description that
 *   links to dozens of videos is a playlist dump rather than a statement that
 *   they belong together, so it is skipped.
 * - **Rendering stacks** — {@link buildVideoSlots}. Purely positional: the
 *   *first* member of a stack to appear in a feed keeps its place and the rest
 *   fold into it, so the grid's order is still the feed's order.
 *
 * Kept free of React so both rules are testable as list-in, list-out functions.
 */

import type { VideoItem } from './types';

/**
 * YouTube ids found in a description. `watch?v=`, `youtu.be/`, `/embed/`,
 * `/shorts/` and `/live/`. The trailing lookahead stops a longer token from
 * being truncated into a valid-looking 11-character id.
 */
const YOUTUBE_LINK_PATTERN =
  /(?:youtube\.com\/watch\?(?:[^\s"'<>]*&)?v=|youtu\.be\/|youtube\.com\/(?:embed|shorts|live)\/)([A-Za-z0-9_-]{11})(?![A-Za-z0-9_-])/g;

/** Links read from one description, at most. More than this is a playlist dump. */
export const MAX_LINKS_PER_DESCRIPTION = 8;

/** Members one stack may hold. Past this the group is a channel index, not "the same video twice". */
export const MAX_STACK_SIZE = 12;

/** The fields stack formation reads. */
export interface StackableVideo {
  videoId: string;
  description?: string | null;
  publishedAt?: string | null;
}

/** One stack: its key (the primary member's id) and its members in display order. */
export interface VideoStack {
  key: string;
  memberIds: string[];
}

/**
 * Extracts the YouTube ids a description links to, in first-seen order.
 *
 * @param description - Raw video description.
 * @returns De-duplicated video ids; empty when it links to none.
 */
export function extractLinkedVideoIds(description: string | null | undefined): string[] {
  if (!description) return [];
  const ids: string[] = [];
  const seen = new Set<string>();
  // A fresh regex per call: the `g` flag makes a shared literal stateful, and
  // a leftover `lastIndex` would skip links at random.
  const pattern = new RegExp(YOUTUBE_LINK_PATTERN.source, 'g');
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(description)) !== null) {
    const id = match[1];
    if (seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

/** Disjoint-set find with path compression. */
function find(parents: Map<string, string>, id: string): string {
  let root = parents.get(id) ?? id;
  while (root !== (parents.get(root) ?? root)) root = parents.get(root) ?? root;
  let cursor = id;
  while (cursor !== root) {
    const next = parents.get(cursor) ?? cursor;
    parents.set(cursor, root);
    cursor = next;
  }
  return root;
}

/**
 * Disjoint-set union. Both ids are registered first, so a video that is only
 * ever a link *target* — the original every follow-up points at — is still a
 * known node when groups are collected.
 */
function union(parents: Map<string, string>, a: string, b: string): void {
  if (!parents.has(a)) parents.set(a, a);
  if (!parents.has(b)) parents.set(b, b);
  const rootA = find(parents, a);
  const rootB = find(parents, b);
  if (rootA !== rootB) parents.set(rootA, rootB);
}

function publishedTime(video: StackableVideo): number {
  const ms = video.publishedAt ? Date.parse(video.publishedAt) : NaN;
  // Undated sorts last rather than to 1970, which would put a legacy upload
  // ahead of the video it follows up on.
  return Number.isFinite(ms) ? ms : Number.MAX_SAFE_INTEGER;
}

/**
 * Groups videos into stacks by the links their descriptions carry.
 *
 * Members are ordered oldest first (the original before its follow-ups), then
 * by id. Single-video groups are not stacks and are left out, as are groups
 * past {@link MAX_STACK_SIZE}. Output order is deterministic.
 *
 * @param videos - Every video in the library.
 * @param rank - Optional extra ordering applied before the date, e.g. to put a
 *   full recording ahead of its highlights whatever their upload dates.
 */
export function buildVideoStacks<T extends StackableVideo>(
  videos: readonly T[],
  rank?: (video: T) => number,
): VideoStack[] {
  const byId = new Map<string, T>();
  for (const video of videos) byId.set(video.videoId, video);

  const parents = new Map<string, string>();
  for (const video of videos) {
    const targets = extractLinkedVideoIds(video.description).filter(
      (id) => id !== video.videoId && byId.has(id),
    );
    if (targets.length > MAX_LINKS_PER_DESCRIPTION) continue;
    for (const target of targets) union(parents, video.videoId, target);
  }

  const groups = new Map<string, T[]>();
  for (const video of videos) {
    if (!parents.has(video.videoId)) continue;
    const root = find(parents, video.videoId);
    const group = groups.get(root);
    if (group) group.push(video);
    else groups.set(root, [video]);
  }

  const compare = (a: T, b: T) => {
    if (rank) {
      const diff = rank(a) - rank(b);
      if (diff !== 0) return diff;
    }
    const when = publishedTime(a) - publishedTime(b);
    if (when !== 0) return when;
    return a.videoId.localeCompare(b.videoId);
  };

  const stacks: VideoStack[] = [];
  for (const group of groups.values()) {
    if (group.length < 2 || group.length > MAX_STACK_SIZE) continue;
    const ordered = [...group].sort(compare);
    stacks.push({ key: ordered[0].videoId, memberIds: ordered.map((video) => video.videoId) });
  }
  stacks.sort((a, b) => a.key.localeCompare(b.key));
  return stacks;
}

/**
 * Computes every video's `stackKey` / `stackPosition` from the stacks its
 * description links form. Returns the placement rather than mutating, so a
 * store can write only the rows whose placement changed.
 */
export function assignVideoStacks<T extends StackableVideo>(
  videos: readonly T[],
  rank?: (video: T) => number,
): Map<string, { stackKey: string | null; stackPosition: number }> {
  const placement = new Map<string, { stackKey: string | null; stackPosition: number }>();
  for (const video of videos) placement.set(video.videoId, { stackKey: null, stackPosition: 0 });
  for (const stack of buildVideoStacks(videos, rank)) {
    stack.memberIds.forEach((videoId, position) => {
      placement.set(videoId, { stackKey: stack.key, stackPosition: position });
    });
  }
  return placement;
}

/** Members of the stacks currently on screen, keyed by stack key, in display order. */
export type VideoStackMap<T extends VideoItem = VideoItem> = Record<string, T[]>;

/** One rendered slot: a single video, or a stack the user can flip through. */
export interface VideoSlot<T extends VideoItem = VideoItem> {
  /** Stable React key. */
  key: string;
  /** The videos in this slot — one entry unless it is a stack. */
  videos: T[];
  /** Index of the member the feed itself returned, which the slot opens on. */
  initialIndex: number;
}

/** A video's stack key, or `null` when it stands alone. */
export function stackKeyOf(video: VideoItem): string | null {
  return typeof video.stackKey === 'string' && video.stackKey.length > 0 ? video.stackKey : null;
}

/** Distinct stack keys of a loaded feed, in first-seen order — what to resolve to members. */
export function collectStackKeys(videos: readonly VideoItem[]): string[] {
  const keys: string[] = [];
  const seen = new Set<string>();
  for (const video of videos) {
    const key = stackKeyOf(video);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    keys.push(key);
  }
  return keys;
}

/**
 * Groups a feed into the slots to render.
 *
 * When `stacks` is omitted, members are taken from the feed itself (videos
 * sharing a `stackKey`, ordered by `stackPosition`) — enough when the whole
 * library is loaded. A paged feed passes `stacks` resolved from the server,
 * because a stack's companion is usually not on the same page.
 *
 * A video whose stack has not resolved yet renders as itself, so the grid
 * never waits on stack resolution to show results.
 *
 * @param videos - Videos in feed order.
 * @param stacks - Members per stack key; omitted to derive from `videos`.
 * @param enabled - `false` gives every video its own slot.
 */
export function buildVideoSlots<T extends VideoItem>(
  videos: readonly T[],
  stacks?: VideoStackMap<T> | null,
  enabled = true,
): VideoSlot<T>[] {
  const members = stacks ?? groupStacksFromFeed(videos);
  const slots: VideoSlot<T>[] = [];
  const placed = new Set<string>();

  videos.forEach((video, index) => {
    const key = enabled ? stackKeyOf(video) : null;
    const group = key ? members[key] : undefined;

    if (!key || !group || group.length < 2) {
      slots.push({ key: `${video.videoId}-${index}`, videos: [video], initialIndex: 0 });
      return;
    }

    // Later members of a stack already on screen fold into the slot holding
    // their place rather than opening a second one.
    if (placed.has(key)) return;
    placed.add(key);

    const opensAt = Math.max(0, group.findIndex((member) => member.videoId === video.videoId));
    slots.push({ key: `stack-${key}-${index}`, videos: group, initialIndex: opensAt });
  });

  return slots;
}

function groupStacksFromFeed<T extends VideoItem>(videos: readonly T[]): VideoStackMap<T> {
  const map: VideoStackMap<T> = {};
  for (const video of videos) {
    const key = stackKeyOf(video);
    if (!key) continue;
    (map[key] ??= []).push(video);
  }
  for (const key of Object.keys(map)) {
    map[key].sort((a, b) => (a.stackPosition ?? 0) - (b.stackPosition ?? 0));
  }
  return map;
}
