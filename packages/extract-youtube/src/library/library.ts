/**
 * @fileoverview The library's write operations, over any {@link VideoLibraryStore}.
 *
 * Each one is the admin-side behaviour debate-ai.com's video library settled
 * on after running in production, kept backend-agnostic:
 *
 * - **Edits merge, never replace.** Only the fields a form sends are written,
 *   and the derived columns are recomputed from the merged row.
 * - **Adding a video an admin once removed clears its exclusion** — adding it
 *   again is the signal they want it back.
 * - **Deleting a video records an exclusion,** so a later import or channel
 *   sync does not quietly re-publish what an admin just removed.
 * - **Imports never overwrite an admin's edit** (`adminEdited`) unless told to.
 * - **Stacks are recomputed from the whole library** after anything that can
 *   change a description link, because only a whole-library pass can see both
 *   ends of a link.
 */

import { buildLibraryUpdate, buildNewLibraryVideo, isVideoId, normalizeLibraryVideo } from './fields';
import { assignVideoStacks } from './stacks';
import type { LibraryRowUpdate, VideoLibraryStore } from './store';
import type {
  CreateLibraryVideoResult,
  CustomFieldDef,
  LibraryVideo,
  LibraryVideoPatch,
  VideoAvailability,
} from './types';
import {
  classifyAvailability,
  fetchYouTubeMetadata,
  fetchYouTubeOEmbed,
  YOUTUBE_API_BATCH_SIZE,
} from './youtube-data';

/** Options shared by the operations below. */
export interface LibraryOperationOptions {
  customFields?: readonly CustomFieldDef[];
  /** Clock, for `updatedAt`. Injectable for tests. */
  now?: () => Date;
}

const clock = (options: LibraryOperationOptions) => (options.now ? options.now() : new Date());

/**
 * Recomputes every row's stack from the description links, writing only the
 * rows whose placement changed.
 *
 * @returns How many rows moved.
 */
export async function recomputeStacks(store: VideoLibraryStore): Promise<number> {
  const rows = await store.all();
  const placement = assignVideoStacks(rows);
  const updates: LibraryRowUpdate[] = [];
  for (const row of rows) {
    const next = placement.get(row.videoId);
    if (!next) continue;
    if (next.stackKey !== row.stackKey || next.stackPosition !== row.stackPosition) {
      updates.push({ videoId: row.videoId, fields: next });
    }
  }
  await store.updateMany(updates);
  return updates.length;
}

/**
 * Adds one video by hand — the admin "Add video" form.
 *
 * Refuses an id that is already in the library (409 in the HTTP handler), so
 * an add can never silently overwrite a row; that is what an edit is for.
 */
export async function createLibraryVideo(
  store: VideoLibraryStore,
  videoId: string,
  patch: LibraryVideoPatch,
  options: LibraryOperationOptions = {},
): Promise<CreateLibraryVideoResult> {
  if (!isVideoId(videoId)) return { ok: false, reason: 'invalid-id' };
  if (await store.get(videoId)) return { ok: false, reason: 'exists' };

  const video = buildNewLibraryVideo(videoId, patch, options.customFields, clock(options));
  if (!video) return { ok: false, reason: 'missing-title' };

  await store.insert(video);
  await store.removeExclusion(videoId);
  // A new video may be the companion of one already in the library.
  if (video.description) await recomputeStacks(store);

  return { ok: true, video: (await store.get(videoId)) ?? video };
}

/**
 * Applies an admin edit to one video.
 *
 * @returns The updated row, or `null` when no such video exists.
 */
export async function updateLibraryVideo(
  store: VideoLibraryStore,
  videoId: string,
  patch: LibraryVideoPatch,
  options: LibraryOperationOptions = {},
): Promise<LibraryVideo | null> {
  const current = await store.get(videoId);
  if (!current) return null;
  const update = buildLibraryUpdate(current, patch, options.customFields, clock(options));
  await store.update(videoId, update);
  if (update.description !== undefined && update.description !== current.description) {
    await recomputeStacks(store);
  }
  return store.get(videoId);
}

/**
 * Removes a video for good and records the removal.
 *
 * @param deletedBy - Who removed it, for the audit row (an email, a user id).
 * @returns Whether a row was actually removed. A miss writes no exclusion, so
 *   a 404 has no side effect.
 */
export async function deleteLibraryVideo(
  store: VideoLibraryStore,
  videoId: string,
  deletedBy: string | null = null,
  options: LibraryOperationOptions = {},
): Promise<boolean> {
  const removed = await store.remove(videoId);
  if (!removed) return false;
  await store.addExclusion({ videoId, deletedBy, deletedAt: clock(options).toISOString() });
  await recomputeStacks(store);
  return true;
}

/** Outcome of {@link importLibraryVideos}. */
export interface ImportResult {
  inserted: number;
  updated: number;
  /** Rows left alone because an admin edited them. */
  skippedEdited: number;
  /** Rows left alone because an admin removed that video. */
  skippedExcluded: number;
  /** Rows with an invalid id. */
  invalid: number;
}

/**
 * Bulk-loads videos — a seed list, a JSON export, a channel sync.
 *
 * New ids are inserted; existing ids are refreshed unless an admin has edited
 * them; ids an admin deleted are skipped. Stacks are recomputed once at the
 * end.
 */
export async function importLibraryVideos(
  store: VideoLibraryStore,
  videos: ReadonlyArray<Partial<LibraryVideo> & { videoId: string }>,
  options: LibraryOperationOptions & { overwriteEdited?: boolean; includeExcluded?: boolean } = {},
): Promise<ImportResult> {
  const result: ImportResult = { inserted: 0, updated: 0, skippedEdited: 0, skippedExcluded: 0, invalid: 0 };
  const valid = videos.filter((video) => {
    if (isVideoId(video.videoId)) return true;
    result.invalid += 1;
    return false;
  });

  const ids = valid.map((video) => video.videoId);
  const existing = new Map((await store.getMany(ids)).map((row) => [row.videoId, row]));
  const excluded = options.includeExcluded ? new Set<string>() : await store.excludedIds(ids);
  const updates: LibraryRowUpdate[] = [];

  for (const input of valid) {
    if (excluded.has(input.videoId)) {
      result.skippedExcluded += 1;
      continue;
    }
    const current = existing.get(input.videoId);
    const video = normalizeLibraryVideo(input, options.customFields, clock(options));
    if (!current) {
      await store.insert(video);
      existing.set(video.videoId, video);
      result.inserted += 1;
      continue;
    }
    if (current.adminEdited && !options.overwriteEdited) {
      result.skippedEdited += 1;
      continue;
    }
    // Keep what the import can't know: the stack placement and the flags an
    // admin set without editing the row.
    const { videoId: _id, stackKey: _key, stackPosition: _pos, adminEdited: _edited, ...fields } = video;
    updates.push({ videoId: input.videoId, fields });
    result.updated += 1;
  }

  await store.updateMany(updates);
  await recomputeStacks(store);
  return result;
}

/** Outcome of {@link resyncLibrary}. */
export interface ResyncResult {
  /** Distinct ids asked of YouTube. */
  videosChecked: number;
  /** Rows whose view count changed and was rewritten. */
  viewCountsUpdated: number;
  /** Rows whose availability changed. */
  availabilityChanged: number;
  /** Current availability across the library, after the run. */
  availability: Record<VideoAvailability, number>;
  durationMs: number;
}

/**
 * Refreshes stored view counts and takedown status from the Data API.
 *
 * View counts are captured once and only ever fall behind, so a "most viewed"
 * sort drifts; uploads get deleted, made private or have embedding turned off,
 * and the grid keeps offering a card that plays nothing. One `videos.list`
 * pass answers both. Re-running is safe: only changed rows are written.
 *
 * Quota: one unit per 50 videos.
 */
export async function resyncLibrary(
  store: VideoLibraryStore,
  options: LibraryOperationOptions & { apiKey: string; fetch?: typeof fetch },
): Promise<ResyncResult> {
  const started = Date.now();
  const rows = await store.all();
  const report = await fetchYouTubeMetadata(
    rows.map((row) => row.videoId),
    { apiKey: options.apiKey, fetch: options.fetch },
  );

  const counts: Record<VideoAvailability, number> = { available: 0, private: 0, not_embeddable: 0, removed: 0 };
  const updates: LibraryRowUpdate[] = [];
  let viewCountsUpdated = 0;
  let availabilityChanged = 0;
  const updatedAt = clock(options).toISOString();

  for (const row of rows) {
    const metadata = report.videos[row.videoId];
    const availability = classifyAvailability(metadata);
    counts[availability] += 1;

    const fields: Partial<LibraryVideo> = {};
    if (metadata?.viewCount !== null && metadata?.viewCount !== undefined && metadata.viewCount !== row.viewCount) {
      fields.viewCount = metadata.viewCount;
      viewCountsUpdated += 1;
    }
    if (availability !== row.availability) {
      fields.availability = availability;
      availabilityChanged += 1;
    }
    if (Object.keys(fields).length > 0) {
      fields.updatedAt = updatedAt;
      updates.push({ videoId: row.videoId, fields });
    }
  }

  await store.updateMany(updates);
  return {
    videosChecked: rows.length,
    viewCountsUpdated,
    availabilityChanged,
    availability: counts,
    durationMs: Date.now() - started,
  };
}

/** How many Data API units a resync of `count` videos costs. */
export function resyncQuotaCost(count: number): number {
  return Math.ceil(count / YOUTUBE_API_BATCH_SIZE);
}

/** What the form already holds, sent so a suggestion hook can read the admin's text. */
export interface AutofillInput {
  videoId: string;
  title?: string | null;
  channel?: string | null;
  description?: string | null;
}

/** The facts {@link autofillVideo} passes to a host's suggestion hook. */
export interface AutofillContext extends AutofillInput {
  title: string;
  channel: string;
  description: string;
  customFields: readonly CustomFieldDef[];
}

/**
 * A host-supplied suggestion step — typically an LLM call that reads the
 * title and description and fills in the host's custom fields (debate-ai.com
 * used one to extract tournament, round and teams). Return only the fields
 * you have an answer for; anything returned is a *suggestion* shown in the
 * form, never a write.
 */
export type AutofillSuggest = (context: AutofillContext) => Promise<LibraryVideoPatch>;

/** Suggested form values. Absent keys mean "no suggestion — leave the field". */
export interface AutofillResult {
  fields: LibraryVideoPatch;
  /** Which sources contributed, in order: `youtube-api`, `oembed`, `suggest`. */
  sources: string[];
  /** Non-fatal problems, shown under the form ("no API key — used oEmbed"). */
  warnings: string[];
}

/**
 * Suggests metadata for the admin video form. Writes nothing.
 *
 * Sources, in order:
 * 1. The Data API, when an `apiKey` is set — title, channel, date, views,
 *    description, tags.
 * 2. oEmbed, when there is no key or the API failed — title and channel.
 * 3. The host's `suggest` hook, if any, for everything else.
 *
 * A title or description the admin already typed wins over YouTube's, so
 * re-running auto-fill on a corrected video does not undo the correction.
 */
export async function autofillVideo(
  input: AutofillInput,
  options: { apiKey?: string | null; suggest?: AutofillSuggest; customFields?: readonly CustomFieldDef[]; fetch?: typeof fetch } = {},
): Promise<AutofillResult> {
  const fields: LibraryVideoPatch = {};
  const sources: string[] = [];
  const warnings: string[] = [];
  const typed = (value: string | null | undefined) => (value && value.trim() ? value : null);

  let usedApi = false;
  if (options.apiKey) {
    try {
      const report = await fetchYouTubeMetadata([input.videoId], { apiKey: options.apiKey, fetch: options.fetch });
      const metadata = report.videos[input.videoId];
      if (metadata) {
        usedApi = true;
        sources.push('youtube-api');
        fields.title = typed(input.title) ?? metadata.title;
        fields.channel = metadata.channel;
        fields.publishedAt = metadata.publishedAt;
        fields.description = typed(input.description) ?? metadata.description;
        if (metadata.viewCount !== null) fields.viewCount = metadata.viewCount;
        if (metadata.tags.length > 0) fields.tags = metadata.tags.slice(0, 16);
        fields.availability = classifyAvailability(metadata);
      } else {
        warnings.push('YouTube has no public video with that id.');
      }
    } catch (error) {
      warnings.push(`YouTube Data API failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  } else {
    warnings.push('No YouTube API key configured — used oEmbed (title and channel only).');
  }

  if (!usedApi) {
    try {
      const oembed = await fetchYouTubeOEmbed(input.videoId, { fetch: options.fetch });
      if (oembed) {
        sources.push('oembed');
        fields.title = typed(input.title) ?? oembed.title;
        fields.channel = typed(input.channel) ?? oembed.channel;
      }
    } catch (error) {
      warnings.push(`oEmbed failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (options.suggest) {
    try {
      const suggested = await options.suggest({
        videoId: input.videoId,
        title: String(fields.title ?? input.title ?? ''),
        channel: String(fields.channel ?? input.channel ?? ''),
        description: String(fields.description ?? input.description ?? ''),
        customFields: options.customFields ?? [],
      });
      sources.push('suggest');
      const { custom, ...rest } = suggested;
      Object.assign(fields, rest);
      if (custom) fields.custom = { ...(fields.custom ?? {}), ...custom };
    } catch (error) {
      warnings.push(`Suggestion step failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return { fields, sources, warnings };
}
