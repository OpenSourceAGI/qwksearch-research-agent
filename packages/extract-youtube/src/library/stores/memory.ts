/**
 * @fileoverview An in-memory {@link VideoLibraryStore}.
 *
 * What the live demo, the Storybook stories and the test suite run on. On a
 * Cloudflare Worker it lives for as long as the isolate does — edits survive
 * a few requests, then quietly reset when the isolate is recycled, which is
 * exactly right for a public demo and exactly wrong for production. Use the
 * D1 store (`createD1LibraryStore`) for anything that must persist.
 */

import { applyLibraryQuery } from '../query';
import { normalizeLibraryVideo } from '../fields';
import type { LibraryRowUpdate, VideoLibraryStore } from '../store';
import type { CustomFieldDef, LibraryExclusion, LibraryVideo } from '../types';

export interface MemoryLibraryStoreOptions {
  /** Rows to start with. Normalised with `normalizeLibraryVideo`, so partial rows are fine. */
  seed?: ReadonlyArray<Partial<LibraryVideo> & { videoId: string }>;
  /** Custom fields, used when normalising the seed. */
  customFields?: readonly CustomFieldDef[];
}

/** Rows are copied in and out, so a caller mutating a returned object cannot corrupt the store. */
function clone(video: LibraryVideo): LibraryVideo {
  return { ...video, tags: [...video.tags], custom: { ...video.custom } };
}

export function createMemoryLibraryStore(options: MemoryLibraryStoreOptions = {}): VideoLibraryStore {
  const rows = new Map<string, LibraryVideo>();
  const exclusions = new Map<string, LibraryExclusion>();
  for (const seed of options.seed ?? []) {
    rows.set(seed.videoId, normalizeLibraryVideo(seed, options.customFields));
  }

  const update = async (videoId: string, fields: Partial<LibraryVideo>) => {
    const current = rows.get(videoId);
    if (!current) return;
    rows.set(videoId, clone({ ...current, ...fields, videoId }));
  };

  return {
    async list(query) {
      const page = applyLibraryQuery([...rows.values()], query);
      return { ...page, videos: page.videos.map(clone) };
    },
    async get(videoId) {
      const row = rows.get(videoId);
      return row ? clone(row) : null;
    },
    async getMany(videoIds) {
      return videoIds.map((id) => rows.get(id)).filter((row): row is LibraryVideo => !!row).map(clone);
    },
    async all() {
      return [...rows.values()].map(clone);
    },
    async getStacks(keys) {
      const wanted = new Set(keys);
      const stacks: Record<string, LibraryVideo[]> = {};
      for (const row of rows.values()) {
        if (!row.stackKey || !wanted.has(row.stackKey)) continue;
        (stacks[row.stackKey] ??= []).push(clone(row));
      }
      for (const key of Object.keys(stacks)) {
        stacks[key].sort((a, b) => a.stackPosition - b.stackPosition);
      }
      return stacks;
    },
    async categories() {
      const set = new Set<string>();
      for (const row of rows.values()) if (row.category) set.add(row.category);
      return [...set].sort((a, b) => a.localeCompare(b));
    },
    async insert(video) {
      if (rows.has(video.videoId)) throw new Error(`Video ${video.videoId} already exists`);
      rows.set(video.videoId, clone(video));
    },
    update,
    async updateMany(updates: readonly LibraryRowUpdate[]) {
      for (const { videoId, fields } of updates) await update(videoId, fields);
    },
    async remove(videoId) {
      return rows.delete(videoId);
    },
    async addExclusion(exclusion) {
      exclusions.set(exclusion.videoId, { ...exclusion });
    },
    async removeExclusion(videoId) {
      exclusions.delete(videoId);
    },
    async excludedIds(videoIds) {
      return new Set(videoIds.filter((id) => exclusions.has(id)));
    },
    async listExclusions() {
      return [...exclusions.values()]
        .map((exclusion) => ({ ...exclusion }))
        .sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));
    },
  };
}
