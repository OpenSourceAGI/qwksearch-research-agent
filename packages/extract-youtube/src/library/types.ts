/**
 * @fileoverview The shapes shared by every part of the video library: the
 * server-side admin API, its storage backends, the typed client, and the
 * React grid and admin components.
 *
 * Ported from the debate video library on debate-ai.com, where a video row
 * carried a dozen debate-only columns (tournament, round level, aff and neg
 * teams, the judges' decision). Those are not dropped here, they are
 * generalised: a host app declares its own {@link CustomFieldDef}s and their
 * values ride on {@link LibraryVideo.custom}. The admin form renders them, the
 * store persists them, search matches them and the grid can show them as
 * badges — without this package knowing what a "tournament" is.
 *
 * Nothing in this file (or anything under `library/`) imports Node built-ins,
 * so the whole entry runs unchanged on Cloudflare Workers, in a browser, in
 * Bun or in Node.
 */

/**
 * Whether YouTube still serves a video, as last checked by
 * {@link resyncLibrary}.
 *
 * `private` and `not_embeddable` are kept apart from `removed` on purpose: the
 * first two can be undone by the uploader and the row is worth keeping, the
 * last is permanent.
 */
export type VideoAvailability = 'available' | 'private' | 'not_embeddable' | 'removed';

/** Every availability value, in the order an admin filter lists them. */
export const VIDEO_AVAILABILITIES: readonly VideoAvailability[] = [
  'available',
  'private',
  'not_embeddable',
  'removed',
];

/** A value a host-defined custom field can hold. */
export type CustomFieldValue = string | number | boolean | null;

/** The input a custom field renders as in the admin form. */
export type CustomFieldType = 'text' | 'textarea' | 'number' | 'boolean' | 'url' | 'select';

/**
 * One app-specific field on a library video — the "custom admin" half of the
 * library. Declare them once and pass the same list to the server handler
 * (which validates and coerces with it) and to the admin components (which
 * render inputs for it).
 *
 * @example
 * ```ts
 * const fields: CustomFieldDef[] = [
 *   { key: 'speaker', label: 'Speaker', type: 'text', searchable: true, showOnCard: true },
 *   { key: 'level', label: 'Level', type: 'select', options: ['Intro', 'Advanced'] },
 *   { key: 'slidesUrl', label: 'Slides', type: 'url' },
 * ];
 * ```
 */
export interface CustomFieldDef {
  /** Key the value is stored under in `video.custom`. Letters, digits, `_` and `-`. */
  key: string;
  /** Label shown in the admin form and on list columns. */
  label: string;
  /** Input type, which also decides how a submitted value is coerced. */
  type: CustomFieldType;
  /** Allowed values for a `select` field. A value outside the list is rejected (stored as `null`). */
  options?: readonly string[];
  /** Short help text rendered under the input. */
  help?: string;
  /** Include the value in the text the library's search matches against. */
  searchable?: boolean;
  /** Render the value as a badge on grid cards. */
  showOnCard?: boolean;
  /** Add a sortable column for the field in `<VideoList />` and the admin table. */
  showInList?: boolean;
}

/**
 * One video as the library stores it.
 *
 * `publishedMs` and `searchText` are *derived* — recomputed from the editable
 * fields on every write by {@link buildLibraryUpdate} — so the listing can
 * sort and search without re-parsing dates or concatenating strings per row.
 */
export interface LibraryVideo {
  /** The 11-character YouTube id; the row's primary key. */
  videoId: string;
  title: string;
  channel: string;
  /** Publish date as an ISO string (`2024-05-01` or a full timestamp); `''` when unknown. */
  publishedAt: string;
  description: string;
  viewCount: number;
  /** A single shelf the video sits on (e.g. "Tutorials"). */
  category: string | null;
  tags: string[];
  /** A hand-picked "top pick" — the grid shows a badge for it. */
  featured: boolean;
  /** Excluded from public listings without being deleted. */
  hidden: boolean;
  availability: VideoAvailability;
  /** Stacked playlist this video belongs to — see `stacks.ts`. `null` when it stands alone. */
  stackKey: string | null;
  /** Position inside its stack, primary member first. */
  stackPosition: number;
  /** Values of the host app's {@link CustomFieldDef}s, keyed by field key. */
  custom: Record<string, CustomFieldValue>;
  /** Set once an admin has edited the row, so a bulk re-import can leave it alone. */
  adminEdited: boolean;
  /** Last write, as an ISO timestamp. */
  updatedAt: string;
  /** Derived: `publishedAt` in epoch milliseconds, or `null` when unparseable. */
  publishedMs: number | null;
  /** Derived: lower-cased title, channel, description, tags and searchable custom fields. */
  searchText: string;
}

/**
 * The smallest video object the React grid components accept. Every field but
 * the id is optional, so a hand-written playlist, a search result and a full
 * {@link LibraryVideo} all render through the same card.
 */
export interface VideoItem {
  videoId: string;
  title?: string;
  channel?: string;
  publishedAt?: string;
  description?: string;
  viewCount?: number;
  category?: string | null;
  tags?: string[];
  featured?: boolean;
  availability?: VideoAvailability;
  stackKey?: string | null;
  stackPosition?: number;
  custom?: Record<string, CustomFieldValue>;
}

/** Columns the library listing can sort by. */
export type LibrarySort = 'published' | 'views' | 'title' | 'channel' | 'category' | 'updated';

/** Filters, sort and paging for a library listing. */
export interface LibraryQuery {
  /** Free text, matched against the derived `searchText` and the video id. */
  q?: string | null;
  category?: string | null;
  /** `'any'` (or unset) applies no availability filter. */
  availability?: VideoAvailability | 'any' | null;
  /** `true` lists only featured videos. */
  featured?: boolean | null;
  /** Include hidden videos. Public listings leave this off; the admin table turns it on. */
  includeHidden?: boolean;
  /**
   * An explicit allow-list of ids (a favourites list, a watch history). An
   * **empty** array still filters — it matches nothing — so a user with no
   * favourites sees an empty list rather than the whole library.
   */
  ids?: string[] | null;
  /** `1`-based page number. */
  page?: number;
  /** Page size; clamped to `1…MAX_LIBRARY_PAGE_SIZE`. */
  limit?: number;
  sort?: LibrarySort | null;
  dir?: 'asc' | 'desc';
}

/** One page of a library listing. */
export interface LibraryPage<T = LibraryVideo> {
  videos: T[];
  page: number;
  limit: number;
  pageCount: number;
  total: number;
}

/**
 * A partial edit as it arrives from the admin form. Values are `unknown`
 * because they come off the wire; {@link buildLibraryUpdate} coerces each one.
 * `custom` is merged key by key, so a form that edits one custom field does
 * not blank the others.
 */
export type LibraryVideoPatch = Partial<Record<EditableField, unknown>> & {
  custom?: Record<string, unknown>;
};

/** Fields an admin may edit. The id and the derived columns are deliberately absent. */
export const EDITABLE_FIELDS = [
  'title',
  'channel',
  'publishedAt',
  'description',
  'viewCount',
  'category',
  'tags',
  'featured',
  'hidden',
  'availability',
] as const;

export type EditableField = (typeof EDITABLE_FIELDS)[number];

/** A video an admin removed, remembered so a re-import does not bring it back. */
export interface LibraryExclusion {
  videoId: string;
  deletedBy: string | null;
  deletedAt: string;
}

/** Why a create was refused. */
export type CreateLibraryVideoResult =
  | { ok: true; video: LibraryVideo }
  | { ok: false; reason: 'exists' | 'missing-title' | 'invalid-id' };

/** Default and maximum page sizes. */
export const DEFAULT_LIBRARY_PAGE_SIZE = 25;
export const MAX_LIBRARY_PAGE_SIZE = 100;
