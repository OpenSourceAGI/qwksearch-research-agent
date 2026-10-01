/**
 * @fileoverview Turning an admin form's patch into a validated library row.
 *
 * Every write in the library — an edit, a hand-added video, an import — goes
 * through {@link buildLibraryUpdate}, so the derived columns the listing sorts
 * and searches on (`publishedMs`, `searchText`) can never drift from the
 * fields an admin actually edited. Ported from debate-ai.com's
 * `admin-library.ts`, where editing a title and forgetting to rebuild the
 * search text left a video unfindable by its new name.
 *
 * Pure functions only: no storage, no I/O, no Node built-ins.
 */

import {
  EDITABLE_FIELDS,
  VIDEO_AVAILABILITIES,
  type CustomFieldDef,
  type CustomFieldValue,
  type EditableField,
  type LibraryVideo,
  type LibraryVideoPatch,
  type VideoAvailability,
} from './types';

const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const CUSTOM_KEY_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

/** `Object.hasOwn`, which the package's ES2020 target does not type. */
export function hasOwn(object: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(object, key);
}

/** Longest a single custom text value may be; a runaway paste is truncated, not rejected. */
const MAX_CUSTOM_TEXT = 4_000;
/** Most tags one video keeps. */
const MAX_TAGS = 32;

/** Whether `value` is a bare 11-character YouTube id. */
export function isVideoId(value: unknown): value is string {
  return typeof value === 'string' && VIDEO_ID_PATTERN.test(value);
}

/** Trims a value to a string, or `null` when it is absent or blank. */
export function optionalText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Coerces a tri-state boolean: `true`, `false`, or `null` for "not recorded".
 * Form posts arrive as strings, so `"true"`, `"1"` and `"on"` count as true.
 */
export function optionalBoolean(value: unknown): boolean | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'boolean') return value;
  return value === 'true' || value === '1' || value === 1 || value === 'on';
}

/** Coerces a finite number, or `null` when absent or unparseable. */
export function optionalNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Epoch milliseconds for a publish date, or `null` when it does not parse.
 * A `null` sorts last in the listing rather than to 1970, which would put a
 * legacy row with a broken date ahead of everything else.
 */
export function publishedMsForDate(publishedAt: string | null | undefined): number | null {
  if (!publishedAt) return null;
  const ms = Date.parse(publishedAt);
  return Number.isFinite(ms) ? ms : null;
}

/** Tags from an array or a comma-separated string: trimmed, de-duplicated, capped. */
export function normalizeTags(value: unknown): string[] {
  const raw = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : [];
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const item of raw) {
    const tag = optionalText(item);
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    tags.push(tag);
    if (tags.length >= MAX_TAGS) break;
  }
  return tags;
}

function coerceAvailability(value: unknown, fallback: VideoAvailability): VideoAvailability {
  return VIDEO_AVAILABILITIES.includes(value as VideoAvailability)
    ? (value as VideoAvailability)
    : fallback;
}

/**
 * Coerces one custom field's submitted value by its declared type.
 *
 * Returns `null` — "not set" — for anything that does not fit, rather than
 * throwing: an admin form with one bad input should still save the rest.
 */
export function coerceCustomValue(def: CustomFieldDef, value: unknown): CustomFieldValue {
  switch (def.type) {
    case 'number':
      return optionalNumber(value);
    case 'boolean':
      return optionalBoolean(value);
    case 'select': {
      const text = optionalText(value);
      if (text === null) return null;
      return def.options && !def.options.includes(text) ? null : text;
    }
    case 'url': {
      const text = optionalText(value);
      if (text === null) return null;
      // Only http(s): a `javascript:` URL rendered as a link on a card is an XSS.
      return /^https?:\/\//i.test(text) ? text.slice(0, MAX_CUSTOM_TEXT) : null;
    }
    case 'text':
    case 'textarea':
    default: {
      const text = optionalText(value);
      return text === null ? null : text.slice(0, MAX_CUSTOM_TEXT);
    }
  }
}

/**
 * Merges a patch's `custom` object over the stored values.
 *
 * With `defs`, only declared keys are kept and each is coerced by its type —
 * an admin API should not become a free-form key/value store for whoever can
 * post to it. Without `defs` (a host that never declared any), keys that look
 * like identifiers are kept and values are reduced to primitives.
 */
export function mergeCustomFields(
  current: Record<string, CustomFieldValue>,
  patch: Record<string, unknown> | undefined,
  defs?: readonly CustomFieldDef[],
): Record<string, CustomFieldValue> {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return { ...current };
  const next: Record<string, CustomFieldValue> = { ...current };

  if (defs && defs.length > 0) {
    for (const def of defs) {
      if (!hasOwn(patch, def.key)) continue;
      next[def.key] = coerceCustomValue(def, patch[def.key]);
    }
    return next;
  }

  for (const [key, value] of Object.entries(patch)) {
    if (!CUSTOM_KEY_PATTERN.test(key)) continue;
    if (value === null || typeof value === 'boolean' || typeof value === 'number') {
      next[key] = typeof value === 'number' && !Number.isFinite(value) ? null : value;
    } else if (value !== undefined) {
      next[key] = String(value).slice(0, MAX_CUSTOM_TEXT);
    }
  }
  return next;
}

/**
 * The text a listing search matches: title, channel, description, category,
 * tags and every custom value whose field is `searchable` (or every custom
 * value, when the host declared no fields).
 */
export function searchTextFor(
  video: Pick<LibraryVideo, 'title' | 'channel' | 'description' | 'category' | 'tags' | 'custom'>,
  defs?: readonly CustomFieldDef[],
): string {
  const customKeys = defs && defs.length > 0
    ? defs.filter((def) => def.searchable).map((def) => def.key)
    : Object.keys(video.custom ?? {});
  const customText = customKeys
    .map((key) => video.custom?.[key])
    .filter((value) => value !== null && value !== undefined && typeof value !== 'boolean')
    .join(' ');
  return [video.title, video.channel, video.description, video.category ?? '', (video.tags ?? []).join(' '), customText]
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Turns an admin form patch into the fields to write.
 *
 * Only keys present on `patch` are written, so a form that edits one field
 * does not blank out the rest of the row. Derived columns are recomputed from
 * the *merged* row rather than the patch, so editing the title alone still
 * leaves `searchText` matching the stored channel and description.
 *
 * @param current - The row as stored.
 * @param patch - Fields the admin changed.
 * @param defs - The host's custom field declarations, used to coerce `patch.custom`.
 * @param now - Clock, for `updatedAt`; injectable for tests.
 * @returns The fields to write — never including `videoId`.
 */
export function buildLibraryUpdate(
  current: LibraryVideo,
  patch: LibraryVideoPatch,
  defs?: readonly CustomFieldDef[],
  now: Date = new Date(),
): Partial<LibraryVideo> {
  const update: Partial<LibraryVideo> = {};
  const has = (field: EditableField | 'custom') => hasOwn(patch, field);

  if (has('title')) update.title = String(patch.title ?? '').trim();
  if (has('channel')) update.channel = String(patch.channel ?? '').trim();
  if (has('description')) update.description = String(patch.description ?? '');
  if (has('publishedAt')) update.publishedAt = String(patch.publishedAt ?? '').trim();
  if (has('viewCount')) update.viewCount = Math.max(0, Math.trunc(optionalNumber(patch.viewCount) ?? 0));
  if (has('category')) update.category = optionalText(patch.category);
  if (has('tags')) update.tags = normalizeTags(patch.tags);
  if (has('featured')) update.featured = optionalBoolean(patch.featured) ?? false;
  if (has('hidden')) update.hidden = optionalBoolean(patch.hidden) ?? false;
  if (has('availability')) update.availability = coerceAvailability(patch.availability, current.availability);
  if (has('custom')) update.custom = mergeCustomFields(current.custom, patch.custom, defs);

  // A blank title would make the row unfindable and render as an empty card,
  // and a blank publish date would sort it to the end of every listing — in
  // both cases keep what is stored instead.
  if (update.title === '') delete update.title;
  if (update.publishedAt === '') delete update.publishedAt;

  const merged = { ...current, ...update };
  if (merged.publishedAt !== current.publishedAt) {
    update.publishedMs = publishedMsForDate(merged.publishedAt);
  }
  const searchText = searchTextFor(merged, defs);
  if (searchText !== current.searchText) update.searchText = searchText;

  // Marks the row so a later bulk import leaves it alone instead of
  // overwriting this edit. Never cleared — there is no signal that a row
  // should go back to being import-driven.
  update.adminEdited = true;
  update.updatedAt = now.toISOString();
  return update;
}

/** A fresh row with every field at its empty value. */
export function emptyLibraryVideo(videoId: string, now: Date = new Date()): LibraryVideo {
  return {
    videoId,
    title: '',
    channel: '',
    publishedAt: '',
    description: '',
    viewCount: 0,
    category: null,
    tags: [],
    featured: false,
    hidden: false,
    availability: 'available',
    stackKey: null,
    stackPosition: 0,
    custom: {},
    adminEdited: false,
    updatedAt: now.toISOString(),
    publishedMs: null,
    searchText: '',
  };
}

/**
 * Builds a complete new row from a form patch, with exactly the coercion and
 * derived columns an edit would give it.
 *
 * @returns The row, or `null` when the patch has no title.
 */
export function buildNewLibraryVideo(
  videoId: string,
  patch: LibraryVideoPatch,
  defs?: readonly CustomFieldDef[],
  now: Date = new Date(),
): LibraryVideo | null {
  const empty = emptyLibraryVideo(videoId, now);
  const fields = buildLibraryUpdate(empty, patch, defs, now);
  if (!fields.title) return null;
  const video: LibraryVideo = { ...empty, ...fields, videoId };
  video.publishedMs = publishedMsForDate(video.publishedAt);
  video.searchText = searchTextFor(video, defs);
  return video;
}

/**
 * Normalises a row that came from outside the library — an import file, an
 * older schema, a hand-written seed list — into a complete {@link LibraryVideo}.
 * Unlike an edit this does not set `adminEdited`.
 */
export function normalizeLibraryVideo(
  input: Partial<LibraryVideo> & { videoId: string },
  defs?: readonly CustomFieldDef[],
  now: Date = new Date(),
): LibraryVideo {
  const base = emptyLibraryVideo(input.videoId, now);
  const video: LibraryVideo = {
    ...base,
    title: String(input.title ?? '').trim(),
    channel: String(input.channel ?? '').trim(),
    publishedAt: String(input.publishedAt ?? '').trim(),
    description: String(input.description ?? ''),
    viewCount: Math.max(0, Math.trunc(optionalNumber(input.viewCount) ?? 0)),
    category: optionalText(input.category),
    tags: normalizeTags(input.tags),
    featured: Boolean(input.featured),
    hidden: Boolean(input.hidden),
    availability: coerceAvailability(input.availability, 'available'),
    stackKey: optionalText(input.stackKey),
    stackPosition: Math.max(0, Math.trunc(optionalNumber(input.stackPosition) ?? 0)),
    custom: mergeCustomFields({}, input.custom as Record<string, unknown> | undefined, defs),
    adminEdited: Boolean(input.adminEdited),
    updatedAt: input.updatedAt ?? base.updatedAt,
  };
  video.publishedMs = publishedMsForDate(video.publishedAt);
  video.searchText = searchTextFor(video, defs);
  return video;
}

/** Whether `field` is one an admin may edit. */
export function isEditableField(field: string): field is EditableField {
  return (EDITABLE_FIELDS as readonly string[]).includes(field);
}
