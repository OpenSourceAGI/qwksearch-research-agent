/**
 * @fileoverview Parsing a library listing's query string, and running a query
 * over an in-memory list of rows.
 *
 * {@link parseLibraryQuery} is what the HTTP handler uses, so every backend
 * sees the same clamped, validated query. {@link applyLibraryQuery} is the
 * reference implementation of what a query *means* — the memory store runs it
 * directly and the D1 store's SQL is tested against it.
 */

import {
  DEFAULT_LIBRARY_PAGE_SIZE,
  MAX_LIBRARY_PAGE_SIZE,
  VIDEO_AVAILABILITIES,
  type LibraryPage,
  type LibraryQuery,
  type LibrarySort,
  type LibraryVideo,
  type VideoAvailability,
} from './types';

/** Columns a listing may sort by. Anything else falls back to `published`. */
export const LIBRARY_SORTS: readonly LibrarySort[] = [
  'published',
  'views',
  'title',
  'channel',
  'category',
  'updated',
];

/** Clamps a requested page size into `1…MAX_LIBRARY_PAGE_SIZE`. */
export function clampLimit(limit: number | undefined | null): number {
  const value = Number(limit);
  if (!Number.isFinite(value) || value <= 0) return DEFAULT_LIBRARY_PAGE_SIZE;
  return Math.min(Math.max(Math.trunc(value), 1), MAX_LIBRARY_PAGE_SIZE);
}

/**
 * Reads a {@link LibraryQuery} out of URL search params.
 *
 * `ids` is a comma-separated list; the parameter being *present but empty*
 * (`?ids=`) is an empty allow-list, which matches nothing — the same rule the
 * watch history on debate-ai.com relies on, where an empty history must list
 * nothing rather than everything.
 */
export function parseLibraryQuery(params: URLSearchParams): LibraryQuery {
  const sort = params.get('sort');
  const availability = params.get('availability');
  const featured = params.get('featured');
  const ids = params.has('ids')
    ? (params.get('ids') ?? '').split(',').map((id) => id.trim()).filter(Boolean)
    : null;

  return {
    q: params.get('q'),
    category: params.get('category') || null,
    availability: VIDEO_AVAILABILITIES.includes(availability as VideoAvailability)
      ? (availability as VideoAvailability)
      : null,
    featured: featured === 'true' || featured === '1' ? true : null,
    includeHidden: params.get('includeHidden') === 'true' || params.get('includeHidden') === '1',
    ids,
    page: Math.max(Number(params.get('page')) || 1, 1),
    limit: clampLimit(Number(params.get('limit')) || undefined),
    sort: LIBRARY_SORTS.includes(sort as LibrarySort) ? (sort as LibrarySort) : null,
    dir: params.get('dir') === 'asc' ? 'asc' : 'desc',
  };
}

/** Serialises a query back to search params — what the typed client sends. */
export function libraryQueryToParams(query: LibraryQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (query.q) params.set('q', query.q);
  if (query.category) params.set('category', query.category);
  if (query.availability && query.availability !== 'any') params.set('availability', query.availability);
  if (query.featured) params.set('featured', 'true');
  if (query.includeHidden) params.set('includeHidden', 'true');
  if (query.ids) params.set('ids', query.ids.join(','));
  if (query.page && query.page > 1) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));
  if (query.sort) params.set('sort', query.sort);
  if (query.dir) params.set('dir', query.dir);
  return params;
}

/** Whether a row passes a query's filters (ignoring sort and paging). */
export function matchesLibraryQuery(video: LibraryVideo, query: LibraryQuery): boolean {
  if (!query.includeHidden && video.hidden) return false;
  if (query.ids && !query.ids.includes(video.videoId)) return false;
  if (query.category && video.category !== query.category) return false;
  if (query.availability && query.availability !== 'any' && video.availability !== query.availability) {
    return false;
  }
  if (query.featured && !video.featured) return false;

  const search = query.q?.trim().toLowerCase();
  if (search) {
    return video.searchText.includes(search) || video.videoId.toLowerCase().includes(search);
  }
  return true;
}

type Comparable = string | number | null;

function sortValue(video: LibraryVideo, sort: LibrarySort): Comparable {
  switch (sort) {
    case 'views':
      return video.viewCount;
    case 'title':
      return video.title.toLowerCase();
    case 'channel':
      return video.channel.toLowerCase();
    case 'category':
      return video.category?.toLowerCase() ?? null;
    case 'updated':
      return Date.parse(video.updatedAt) || 0;
    case 'published':
    default:
      return video.publishedMs;
  }
}

/**
 * Compares two rows for a sort. `null` always sorts last whichever the
 * direction — an undated video belongs at the bottom of both "newest" and
 * "oldest" — and the video id breaks ties so paging stays stable when the
 * sort column repeats.
 */
export function compareLibraryVideos(
  a: LibraryVideo,
  b: LibraryVideo,
  sort: LibrarySort = 'published',
  dir: 'asc' | 'desc' = 'desc',
): number {
  const left = sortValue(a, sort);
  const right = sortValue(b, sort);
  if (left === null || right === null) {
    if (left !== right) return left === null ? 1 : -1;
  } else if (left !== right) {
    const order = typeof left === 'number' && typeof right === 'number'
      ? left - right
      : String(left).localeCompare(String(right));
    return dir === 'asc' ? order : -order;
  }
  return dir === 'asc' ? a.videoId.localeCompare(b.videoId) : b.videoId.localeCompare(a.videoId);
}

/**
 * Filters, sorts and pages a list of rows.
 *
 * Offset pagination rather than a cursor: the admin table has numbered pages
 * and sorts on columns that are not unique, which a keyset cursor cannot
 * express. A page past the end is clamped to the last page.
 */
export function applyLibraryQuery(videos: readonly LibraryVideo[], query: LibraryQuery): LibraryPage {
  const limit = clampLimit(query.limit);
  const sort = query.sort ?? 'published';
  const dir = query.dir ?? 'desc';

  const matching = videos.filter((video) => matchesLibraryQuery(video, query));
  matching.sort((a, b) => compareLibraryVideos(a, b, sort, dir));

  const total = matching.length;
  const pageCount = Math.max(Math.ceil(total / limit), 1);
  const page = Math.min(Math.max(query.page ?? 1, 1), pageCount);
  const start = (page - 1) * limit;

  return { videos: matching.slice(start, start + limit), page, limit, pageCount, total };
}
