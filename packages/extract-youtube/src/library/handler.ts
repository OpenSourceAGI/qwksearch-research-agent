/**
 * @fileoverview The video library's HTTP API, as one framework-agnostic
 * `Request → Response` function.
 *
 * On debate-ai.com this was a dozen Next.js route files under
 * `app/api/admin/videos/**`, each re-checking the session and re-parsing its
 * body. Here it is one handler over the web-standard `Request`/`Response`, so
 * the same routes mount unchanged in a Cloudflare Worker, a Next.js or vinext
 * route handler, Hono, Bun.serve or Deno:
 *
 * ```ts
 * // Cloudflare Worker
 * const library = createVideoLibraryHandler({ store, authorize: bearerTokenAuth(env.ADMIN_TOKEN) });
 * export default { fetch: (request) => library.fetch(request) };
 *
 * // Next.js — app/api/library/[...path]/route.ts
 * export const GET = library.fetch, POST = library.fetch, PATCH = library.fetch, DELETE = library.fetch;
 * ```
 *
 * Routes, relative to `basePath` (default `/api/library`):
 *
 * | Method | Path | Access | Does |
 * | --- | --- | --- | --- |
 * | GET | `/videos` | public | Listing: `q`, `category`, `availability`, `featured`, `ids`, `sort`, `dir`, `page`, `limit` |
 * | GET | `/videos/:id` | public | One video (hidden ones only to admins) |
 * | GET | `/stacks?keys=a,b` | public | Members of each stacked playlist |
 * | GET | `/categories` | public | Distinct categories, for filters |
 * | GET | `/fields` | public | The host's custom field declarations |
 * | GET | `/session` | public | `{ admin }` — whether this request may use the admin routes |
 * | POST | `/videos` | admin | Add a video (`409` if it exists) |
 * | PATCH | `/videos/:id` | admin | Edit a video (partial) |
 * | DELETE | `/videos/:id` | admin | Remove a video and exclude it from re-import |
 * | POST | `/autofill` | admin | Suggest form values from YouTube (+ your `suggest` hook) |
 * | POST | `/resync` | admin | Refresh view counts and takedown status (needs `youtubeApiKey`) |
 * | GET | `/availability` | admin | Videos YouTube no longer serves |
 * | POST | `/availability` | admin | Clear one video's takedown flag |
 * | POST | `/import` | admin | Bulk-load `{ videos: [...] }` |
 * | POST | `/stacks/recompute` | admin | Rebuild stacked playlists from description links |
 * | GET | `/exclusions` | admin | Videos an admin removed |
 * | DELETE | `/exclusions/:id` | admin | Allow a removed video to be re-imported |
 *
 * Errors are always JSON: `{ error: string }` with a 4xx/5xx status.
 */

import { isVideoId } from './fields';
import {
  autofillVideo,
  createLibraryVideo,
  deleteLibraryVideo,
  importLibraryVideos,
  recomputeStacks,
  resyncLibrary,
  updateLibraryVideo,
  type AutofillSuggest,
} from './library';
import { parseLibraryQuery } from './query';
import type { VideoLibraryStore } from './store';
import type { CustomFieldDef, LibraryVideoPatch } from './types';

/**
 * Decides whether a request may use the admin routes. Return a truthy value to
 * allow it; a string is recorded as the acting admin (e.g. in the exclusion a
 * delete writes). Return `false`/`null` to refuse with 403.
 */
export type LibraryAuthorize = (request: Request) => boolean | string | null | undefined | Promise<boolean | string | null | undefined>;

export interface VideoLibraryHandlerOptions {
  store: VideoLibraryStore;
  /** Mount point. Default `/api/library`. No trailing slash. */
  basePath?: string;
  /**
   * Admin gate. **Omit it and every admin route answers 403** — the library is
   * then a read-only public API. `() => true` opens it to everyone (only
   * sensible for a throwaway in-memory demo).
   */
  authorize?: LibraryAuthorize;
  /** The host's custom fields; used to coerce writes and served at `/fields`. */
  customFields?: readonly CustomFieldDef[];
  /** YouTube Data API key, for `/resync` and richer `/autofill`. */
  youtubeApiKey?: string | null;
  /** Extra auto-fill step, e.g. an LLM filling custom fields. See {@link AutofillSuggest}. */
  suggest?: AutofillSuggest;
  /** Fetch used for YouTube calls. Defaults to the global. */
  fetch?: typeof fetch;
  /** Called with unexpected errors before the 500 is returned. Defaults to `console.error`. */
  onError?: (error: unknown, request: Request) => void;
}

export interface VideoLibraryHandler {
  /** Handles a request under `basePath`, or resolves `null` when the path is not the library's. */
  handle(request: Request): Promise<Response | null>;
  /** Like `handle`, but answers 404 instead of `null` — for mounting as a whole route. */
  fetch(request: Request): Promise<Response>;
}

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };

/** A JSON response. */
export function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...JSON_HEADERS, ...headers } });
}

function error(message: string, status: number): Response {
  return json({ error: message }, status);
}

/** Constant-time string comparison, so a token check doesn't leak its prefix through timing. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * An {@link LibraryAuthorize} that accepts `Authorization: Bearer <token>`.
 * With an empty or missing token it refuses everything — an unset secret must
 * never mean "open".
 */
export function bearerTokenAuth(token: string | null | undefined, identity = 'admin'): LibraryAuthorize {
  return (request) => {
    if (!token) return false;
    const header = request.headers.get('authorization') ?? '';
    const match = /^Bearer\s+(.+)$/i.exec(header.trim());
    return match && safeEqual(match[1], token) ? identity : false;
  };
}

async function readJsonObject(request: Request): Promise<Record<string, unknown> | Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error('Invalid JSON body', 400);
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return error('Body must be a JSON object', 400);
  }
  return body as Record<string, unknown>;
}

/** Creates the library's request handler. */
export function createVideoLibraryHandler(options: VideoLibraryHandlerOptions): VideoLibraryHandler {
  const basePath = (options.basePath ?? '/api/library').replace(/\/+$/, '');
  const { store } = options;
  const operationOptions = { customFields: options.customFields };
  const onError = options.onError ?? ((err: unknown) => console.error('[extract-youtube/library]', err));

  const admin = async (request: Request): Promise<string | null> => {
    if (!options.authorize) return null;
    const result = await options.authorize(request);
    if (!result) return null;
    return typeof result === 'string' ? result : 'admin';
  };

  async function route(request: Request, path: string[], method: string): Promise<Response> {
    const url = new URL(request.url);
    const [resource, id, extra] = path;
    const requireAdmin = async () => {
      const who = await admin(request);
      return who ? who : null;
    };
    const forbidden = () => error('Forbidden', 403);

    // ── public reads ────────────────────────────────────────────────────────
    if (resource === 'session' && !id && method === 'GET') {
      return json({ admin: Boolean(await admin(request)) });
    }
    if (resource === 'fields' && !id && method === 'GET') {
      return json({ fields: options.customFields ?? [] }, 200, { 'cache-control': 'public, max-age=300' });
    }
    if (resource === 'categories' && !id && method === 'GET') {
      return json({ categories: await store.categories() });
    }
    if (resource === 'stacks' && !id && method === 'GET') {
      const keys = (url.searchParams.get('keys') ?? '').split(',').map((key) => key.trim()).filter(Boolean);
      // Bounded: a client asking for thousands of stacks is scraping, not rendering a page.
      return json({ stacks: await store.getStacks(keys.slice(0, 200)) });
    }

    if (resource === 'videos' && !id) {
      if (method === 'GET') {
        const query = parseLibraryQuery(url.searchParams);
        if (query.includeHidden && !(await admin(request))) query.includeHidden = false;
        return json(await store.list(query));
      }
      if (method === 'POST') {
        if (!(await requireAdmin())) return forbidden();
        const body = await readJsonObject(request);
        if (body instanceof Response) return body;
        const { videoId, ...patch } = body;
        if (!isVideoId(videoId)) return error('`videoId` must be an 11-character YouTube video id', 400);
        const result = await createLibraryVideo(store, videoId, patch as LibraryVideoPatch, operationOptions);
        if (!result.ok) {
          return result.reason === 'exists'
            ? error('That video is already in the library — edit it instead.', 409)
            : result.reason === 'missing-title'
              ? error('A title is required.', 400)
              : error('Invalid video id.', 400);
        }
        return json({ ok: true, video: result.video }, 201);
      }
      return error('Method not allowed', 405);
    }

    if (resource === 'videos' && id && !extra) {
      if (!isVideoId(id)) return error('Invalid video id', 400);
      if (method === 'GET') {
        const video = await store.get(id);
        if (!video || (video.hidden && !(await admin(request)))) return error('Video not found', 404);
        return json({ video });
      }
      if (method === 'PATCH') {
        if (!(await requireAdmin())) return forbidden();
        const body = await readJsonObject(request);
        if (body instanceof Response) return body;
        const video = await updateLibraryVideo(store, id, body as LibraryVideoPatch, operationOptions);
        return video ? json({ ok: true, video }) : error('Video not found', 404);
      }
      if (method === 'DELETE') {
        const who = await requireAdmin();
        if (!who) return forbidden();
        const removed = await deleteLibraryVideo(store, id, who, operationOptions);
        return removed ? json({ ok: true, videoId: id }) : error('Video not found', 404);
      }
      return error('Method not allowed', 405);
    }

    // ── admin-only ─────────────────────────────────────────────────────────
    if (!(await requireAdmin())) {
      const known = ['autofill', 'resync', 'availability', 'import', 'stacks', 'exclusions'];
      return known.includes(resource ?? '') ? forbidden() : error('Not found', 404);
    }

    if (resource === 'autofill' && !id && method === 'POST') {
      const body = await readJsonObject(request);
      if (body instanceof Response) return body;
      if (!isVideoId(body.videoId)) return error('`videoId` must be an 11-character YouTube video id', 400);
      const text = (value: unknown) => (typeof value === 'string' ? value : null);
      return json(
        await autofillVideo(
          { videoId: body.videoId, title: text(body.title), channel: text(body.channel), description: text(body.description) },
          { apiKey: options.youtubeApiKey, suggest: options.suggest, customFields: options.customFields, fetch: options.fetch },
        ),
      );
    }

    if (resource === 'resync' && !id) {
      if (method === 'GET') {
        const total = (await store.all()).length;
        return json({ videos: total, quotaCost: Math.ceil(total / 50), configured: Boolean(options.youtubeApiKey) });
      }
      if (method !== 'POST') return error('Method not allowed', 405);
      if (!options.youtubeApiKey) return error('Resync needs a YouTube Data API key (youtubeApiKey).', 501);
      try {
        return json({ ok: true, ...(await resyncLibrary(store, { apiKey: options.youtubeApiKey, fetch: options.fetch })) });
      } catch (err) {
        return error(err instanceof Error ? err.message : String(err), 502);
      }
    }

    if (resource === 'availability' && !id) {
      if (method === 'GET') {
        const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 100, 1), 500);
        const unavailable = (await store.all())
          .filter((video) => video.availability !== 'available')
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
          .slice(0, limit);
        return json({ videos: unavailable });
      }
      if (method === 'POST') {
        const body = await readJsonObject(request);
        if (body instanceof Response) return body;
        if (!isVideoId(body.videoId)) return error('`videoId` must be a YouTube video id', 400);
        const video = await updateLibraryVideo(store, body.videoId, { availability: 'available' }, operationOptions);
        return video ? json({ ok: true, video }) : error('Video not found', 404);
      }
      return error('Method not allowed', 405);
    }

    if (resource === 'import' && !id && method === 'POST') {
      const body = await readJsonObject(request);
      if (body instanceof Response) return body;
      if (!Array.isArray(body.videos)) return error('Body must be `{ videos: [...] }`', 400);
      const videos = body.videos.filter(
        (video): video is { videoId: string } => !!video && typeof video === 'object' && typeof (video as { videoId?: unknown }).videoId === 'string',
      );
      return json({
        ok: true,
        ...(await importLibraryVideos(store, videos, {
          ...operationOptions,
          overwriteEdited: body.overwriteEdited === true,
        })),
      });
    }

    if (resource === 'stacks' && id === 'recompute' && method === 'POST') {
      return json({ ok: true, moved: await recomputeStacks(store) });
    }

    if (resource === 'exclusions') {
      if (!id && method === 'GET') return json({ exclusions: await store.listExclusions() });
      if (id && method === 'DELETE') {
        await store.removeExclusion(id);
        return json({ ok: true, videoId: id });
      }
      return error('Method not allowed', 405);
    }

    return error('Not found', 404);
  }

  const handle = async (request: Request): Promise<Response | null> => {
    const url = new URL(request.url);
    if (url.pathname !== basePath && !url.pathname.startsWith(`${basePath}/`)) return null;
    const path = url.pathname
      .slice(basePath.length)
      .split('/')
      .filter(Boolean)
      .map((segment) => decodeURIComponent(segment));
    try {
      return await route(request, path, request.method.toUpperCase());
    } catch (err) {
      onError(err, request);
      return error('Internal error', 500);
    }
  };

  return {
    handle,
    async fetch(request) {
      return (await handle(request)) ?? error('Not found', 404);
    },
  };
}
