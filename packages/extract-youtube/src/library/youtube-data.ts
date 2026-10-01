/**
 * @fileoverview The two ways the library reads a video's metadata from
 * YouTube, both over plain `fetch` so they run on a Worker:
 *
 * - **YouTube Data API v3** (`videos.list`) — title, channel, publish date,
 *   description, view count and whether the video is still playable. Needs an
 *   API key and spends quota: one unit per call of up to 50 ids.
 * - **oEmbed** — title and channel only, no key, no quota. The fallback when
 *   no key is configured, so "Add video" still auto-fills a title.
 *
 * The transcript side of this package deliberately avoids the Data API (it
 * doesn't serve captions to third parties); the library side uses it because
 * view counts and takedown status exist nowhere else.
 */

import type { VideoAvailability } from './types';

/** Largest id batch `videos.list` accepts. */
export const YOUTUBE_API_BATCH_SIZE = 50;

const DATA_API_URL = 'https://www.googleapis.com/youtube/v3/videos';
const OEMBED_URL = 'https://www.youtube.com/oembed';

/** What the Data API reported about one video. */
export interface YouTubeVideoMetadata {
  videoId: string;
  title: string;
  channel: string;
  /** `YYYY-MM-DD`. */
  publishedAt: string;
  description: string;
  viewCount: number | null;
  tags: string[];
  privacyStatus: string | null;
  uploadStatus: string | null;
  embeddable: boolean | null;
}

export interface YouTubeFetchOptions {
  /** YouTube Data API v3 key. */
  apiKey: string;
  /** Custom fetch (tests, a proxying fetch). Defaults to the global. */
  fetch?: typeof fetch;
}

/** The result of looking up many ids: what came back, and what didn't. */
export interface YouTubeMetadataReport {
  videos: Record<string, YouTubeVideoMetadata>;
  /** Ids the API did not return — the only signal it gives for a deleted video. */
  missing: string[];
}

/** Error thrown when the Data API answers with a non-2xx status. */
export class YouTubeDataApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly reason: string | null,
  ) {
    super(message);
    this.name = 'YouTubeDataApiError';
  }
}

interface DataApiItem {
  id: string;
  snippet?: {
    title?: string;
    channelTitle?: string;
    publishedAt?: string;
    description?: string;
    tags?: string[];
  };
  statistics?: { viewCount?: string };
  status?: { privacyStatus?: string; uploadStatus?: string; embeddable?: boolean };
}

/**
 * Looks up metadata for any number of ids, batched by 50.
 *
 * @throws {YouTubeDataApiError} On a quota, key or permission error. A
 *   partial run is not returned: the caller should not write half a resync.
 */
export async function fetchYouTubeMetadata(
  videoIds: readonly string[],
  options: YouTubeFetchOptions,
): Promise<YouTubeMetadataReport> {
  const doFetch = options.fetch ?? fetch;
  const videos: Record<string, YouTubeVideoMetadata> = {};
  const missing: string[] = [];
  const unique = [...new Set(videoIds)];

  for (let i = 0; i < unique.length; i += YOUTUBE_API_BATCH_SIZE) {
    const batch = unique.slice(i, i + YOUTUBE_API_BATCH_SIZE);
    const url = new URL(DATA_API_URL);
    url.searchParams.set('part', 'snippet,statistics,status');
    url.searchParams.set('id', batch.join(','));
    url.searchParams.set('key', options.apiKey);
    url.searchParams.set('maxResults', String(YOUTUBE_API_BATCH_SIZE));

    const response = await doFetch(url.toString());
    if (!response.ok) {
      let reason: string | null = null;
      try {
        const body = (await response.json()) as { error?: { errors?: { reason?: string }[]; message?: string } };
        reason = body.error?.errors?.[0]?.reason ?? body.error?.message ?? null;
      } catch {
        // Non-JSON error body — the status is all there is.
      }
      throw new YouTubeDataApiError(
        `YouTube Data API returned ${response.status}${reason ? ` (${reason})` : ''}`,
        response.status,
        reason,
      );
    }

    const body = (await response.json()) as { items?: DataApiItem[] };
    for (const item of body.items ?? []) {
      const views = Number.parseInt(item.statistics?.viewCount ?? '', 10);
      videos[item.id] = {
        videoId: item.id,
        title: item.snippet?.title ?? '',
        channel: item.snippet?.channelTitle ?? '',
        publishedAt: (item.snippet?.publishedAt ?? '').split('T')[0],
        description: item.snippet?.description ?? '',
        viewCount: Number.isFinite(views) ? views : null,
        tags: item.snippet?.tags ?? [],
        privacyStatus: item.status?.privacyStatus ?? null,
        uploadStatus: item.status?.uploadStatus ?? null,
        embeddable: typeof item.status?.embeddable === 'boolean' ? item.status.embeddable : null,
      };
    }
    for (const id of batch) if (!videos[id]) missing.push(id);
  }

  return { videos, missing };
}

/**
 * Classifies what the Data API said about one video. `undefined` — the id was
 * not in the response at all — is the takedown case.
 */
export function classifyAvailability(
  metadata: Pick<YouTubeVideoMetadata, 'privacyStatus' | 'uploadStatus' | 'embeddable'> | undefined,
): VideoAvailability {
  if (!metadata) return 'removed';
  if (metadata.privacyStatus === 'private') return 'private';
  if (
    metadata.uploadStatus === 'rejected' ||
    metadata.uploadStatus === 'failed' ||
    metadata.uploadStatus === 'deleted'
  ) {
    return 'removed';
  }
  if (metadata.embeddable === false) return 'not_embeddable';
  return 'available';
}

/** What oEmbed knows about a video. */
export interface YouTubeOEmbed {
  title: string;
  channel: string;
  channelUrl: string | null;
  thumbnailUrl: string | null;
}

/**
 * Title and channel for one video, without an API key.
 *
 * @returns `null` when YouTube has no public embed for the id (private,
 *   removed, embedding disabled) — not an error.
 */
export async function fetchYouTubeOEmbed(
  videoId: string,
  options: { fetch?: typeof fetch } = {},
): Promise<YouTubeOEmbed | null> {
  const doFetch = options.fetch ?? fetch;
  const url = new URL(OEMBED_URL);
  url.searchParams.set('url', `https://www.youtube.com/watch?v=${videoId}`);
  url.searchParams.set('format', 'json');
  const response = await doFetch(url.toString());
  if (!response.ok) return null;
  const body = (await response.json()) as {
    title?: string;
    author_name?: string;
    author_url?: string;
    thumbnail_url?: string;
  };
  return {
    title: body.title ?? '',
    channel: body.author_name ?? '',
    channelUrl: body.author_url ?? null,
    thumbnailUrl: body.thumbnail_url ?? null,
  };
}
