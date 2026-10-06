/**
 * @fileoverview Turning untrusted data into a playlist: a share link someone
 * pasted, a record from an ingestion run, or an LLM's answer.
 *
 * Every link the widget renders comes through here first. Only `http(s)` URLs
 * survive, so a shared playlist cannot smuggle a `javascript:` href onto the
 * page, and every field is length-capped and type-checked rather than trusted.
 */
import type {
  Playlist,
  PlaylistItem,
  PlaylistItemKind,
  PlaylistVisibility,
  ProvenanceMethod,
  EducationProvider,
  CourseLevel,
} from '../types';

export const MAX_PLAYLIST_ITEMS = 60;
const MAX_TITLE = 200;
const MAX_TEXT = 600;
/** A single item may not claim more than 500 hours. */
const MAX_ITEM_MINUTES = 500 * 60;

const KINDS: PlaylistItemKind[] = ['video_playlist', 'video', 'courseware', 'lecture_notes', 'assignment', 'reading', 'textbook'];
const PROVIDERS: EducationProvider[] = ['mit_ocw', 'edx', 'coursera', 'khan', 'openstax', 'youtube', 'web'];
const METHODS: ProvenanceMethod[] = ['curated_seed', 'official_api', 'snapshot_dataset', 'community_list', 'llm_search', 'user'];
const LEVELS: CourseLevel[] = ['introductory', 'intermediate', 'advanced'];
const VISIBILITIES: PlaylistVisibility[] = ['preset', 'public', 'private'];

const text = (value: unknown, max: number): string | undefined =>
  typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : undefined;

const oneOf = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
  allowed.includes(value as T) ? (value as T) : fallback;

/** The URL if it is an absolute http(s) URL, else `null`. */
export function safeUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}

export function sanitizeItem(raw: unknown, index = 0): PlaylistItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const url = safeUrl(r.url);
  const title = text(r.title, MAX_TITLE);
  if (!url || !title) return null;
  const minutes = Number(r.minutes);
  const p = (r.provenance && typeof r.provenance === 'object' ? r.provenance : {}) as Record<string, unknown>;
  return {
    id: text(r.id, MAX_TITLE) ?? `item-${index}-${url}`,
    title,
    url,
    kind: oneOf(r.kind, KINDS, 'reading'),
    minutes: Number.isFinite(minutes) ? Math.min(Math.max(0, Math.round(minutes)), MAX_ITEM_MINUTES) : 0,
    estimate: r.estimate === 'exact' ? 'exact' : 'rough',
    estimateBasis: text(r.estimateBasis, MAX_TITLE),
    courseNumber: text(r.courseNumber, 40),
    institution: text(r.institution, 120),
    level: LEVELS.includes(r.level as CourseLevel) ? (r.level as CourseLevel) : undefined,
    description: text(r.description, MAX_TEXT),
    provenance: {
      provider: oneOf(p.provider, PROVIDERS, 'web'),
      method: oneOf(p.method, METHODS, 'user'),
      sourceUrl: safeUrl(p.sourceUrl) ?? undefined,
      fetchedAt: text(p.fetchedAt, 40),
      // Nothing that arrives from outside gets to call itself verified.
      verified: false,
      note: text(p.note, MAX_TEXT),
    },
  };
}

/**
 * A playlist rebuilt from untrusted input, or `null` if nothing usable is
 * left. Members are dropped: who a playlist is shared with is the server's
 * record, never something a link can assert.
 */
export function sanitizePlaylist(raw: unknown): Playlist | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const title = text(r.title, MAX_TITLE);
  if (!title || !Array.isArray(r.items)) return null;
  const items = r.items
    .slice(0, MAX_PLAYLIST_ITEMS)
    .map((item, index) => sanitizeItem(item, index))
    .filter((item): item is PlaylistItem => item !== null);
  if (items.length === 0) return null;
  const visibility = oneOf(r.visibility, VISIBILITIES, 'public');
  return {
    id: text(r.id, 120) ?? `shared-${Date.now().toString(36)}`,
    title,
    description: text(r.description, MAX_TEXT),
    categoryId: text(r.categoryId, 80) ?? 'custom',
    majorId: text(r.majorId, 80) ?? 'custom',
    programId: text(r.programId, 80),
    level: LEVELS.includes(r.level as CourseLevel) ? (r.level as CourseLevel) : undefined,
    // A link can only ever carry a public copy.
    visibility: visibility === 'preset' ? 'public' : visibility,
    items,
  };
}
