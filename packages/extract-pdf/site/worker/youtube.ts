/**
 * @file youtube.ts
 * @description The YouTube tab of the live demo: extract-youtube's routes,
 * mounted under `/api/youtube/*` by `worker/api.ts`. The same three routes the
 * package's own demo serves, each a piece of extract-youtube used the way a
 * real app would use it:
 *
 *   GET  /api/youtube/transcript?videoId=   `YouTubeTranscriptApi`: the
 *        `{ snippets }` / `{ error }` shape the floating player and the
 *        transcript modal read through their `transcriptUrl` prop
 *   /api/youtube/library/*                  `createVideoLibraryHandler` from
 *        `extract-youtube/library`: list, search, stacks, create/edit/delete,
 *        auto-fill, resync, availability, import
 *   GET  /api/youtube/demo                  which mode below this deploy runs
 *        in, so the Admin view can say whether edits need a token
 *
 * | YOUTUBE_ADMIN_TOKEN | YOUTUBE_DB | Mode                                              |
 * | ------------------- | ---------- | ------------------------------------------------- |
 * | unset               | unbound    | sandbox: anyone edits a per-instance memory copy  |
 * | set                 | either     | token: edits need `Authorization: Bearer <token>` |
 * | unset               | bound      | read-only: nobody can edit the persistent library |
 *
 * On Vercel there is no D1, so the library always lives in memory there.
 */
import { YouTubeTranscriptApi, extractVideoId } from 'extract-youtube';
import {
  bearerTokenAuth,
  createD1LibraryStore,
  createMemoryLibraryStore,
  createVideoLibraryHandler,
  importLibraryVideos,
  json,
  type D1DatabaseLike,
  type LibraryAuthorize,
  type VideoLibraryHandler,
  type VideoLibraryStore,
} from 'extract-youtube/library';

import { DEMO_FIELDS, DEMO_VIDEOS } from '../components/demo/youtube/demo-data';

export interface YouTubeEnv {
  /** Optional D1 database for the library. Without it the library lives in memory. */
  YOUTUBE_DB?: D1DatabaseLike;
  /** Optional bearer token the library's admin routes require. */
  YOUTUBE_ADMIN_TOKEN?: string;
  /** Optional YouTube Data API v3 key, for resync and auto-fill. */
  YOUTUBE_API_KEY?: string;
}

export type YouTubeDemoMode = 'sandbox' | 'token' | 'read-only';

export interface YouTubeDemoInfo {
  mode: YouTubeDemoMode;
  storage: 'memory' | 'd1';
  youtubeApiKey: boolean;
}

export const YOUTUBE_API_BASE = '/api/youtube';
const LIBRARY_BASE = `${YOUTUBE_API_BASE}/library`;

function demoInfo(env: YouTubeEnv): YouTubeDemoInfo {
  return {
    mode: env.YOUTUBE_ADMIN_TOKEN ? 'token' : env.YOUTUBE_DB ? 'read-only' : 'sandbox',
    storage: env.YOUTUBE_DB ? 'd1' : 'memory',
    youtubeApiKey: Boolean(env.YOUTUBE_API_KEY),
  };
}

function authorizeFor(env: YouTubeEnv): LibraryAuthorize | undefined {
  if (env.YOUTUBE_ADMIN_TOKEN) return bearerTokenAuth(env.YOUTUBE_ADMIN_TOKEN);
  // No token and no database: an instance-local sandbox that resets on its
  // own, so letting anyone edit it is the point. With a database and no token
  // the authorize hook is left out, which makes every admin route answer 403.
  return env.YOUTUBE_DB ? undefined : () => true;
}

/**
 * The store and handler live for the isolate's (or function instance's)
 * lifetime. The memory store is seeded once; a D1 store gets its tables (and,
 * when empty, the same seed) on the first request.
 */
let library: Promise<{ store: VideoLibraryStore; handler: VideoLibraryHandler }> | null = null;
let libraryKey = '';

async function seed(store: VideoLibraryStore): Promise<void> {
  await importLibraryVideos(store, DEMO_VIDEOS, { customFields: DEMO_FIELDS });
}

function getLibrary(env: YouTubeEnv) {
  // `env` is a fresh object per request (admin settings are merged over the
  // Worker's vars), so key the cache on what the library depends on.
  const key = `${env.YOUTUBE_DB ? 'd1' : 'memory'}|${env.YOUTUBE_ADMIN_TOKEN ?? ''}|${env.YOUTUBE_API_KEY ?? ''}`;
  if (!library || libraryKey !== key) {
    libraryKey = key;
    library = (async () => {
      let store: VideoLibraryStore;
      if (env.YOUTUBE_DB) {
        const d1 = createD1LibraryStore(env.YOUTUBE_DB);
        await d1.ensureSchema();
        if ((await d1.list({ limit: 1, includeHidden: true })).total === 0) await seed(d1);
        store = d1;
      } else {
        store = createMemoryLibraryStore({ customFields: DEMO_FIELDS });
        await seed(store);
      }
      const handler = createVideoLibraryHandler({
        store,
        basePath: LIBRARY_BASE,
        authorize: authorizeFor(env),
        customFields: DEMO_FIELDS,
        youtubeApiKey: env.YOUTUBE_API_KEY ?? null,
      });
      return { store, handler };
    })();
    // A failed start (D1 unreachable, say) must not stick for the isolate's life.
    library.catch(() => {
      library = null;
    });
  }
  return library;
}

async function transcript(url: URL): Promise<Response> {
  const raw = url.searchParams.get('videoId');
  const videoId = raw ? extractVideoId(raw) : null;
  if (!videoId) return json({ error: 'Missing or invalid videoId query param' }, 400);
  try {
    const result = await new YouTubeTranscriptApi().fetchTranscript(videoId, { languages: ['en'] });
    // Captions for a published video rarely change: let the edge keep them a day.
    return json({ videoId, snippets: result.toRawData() }, 200, { 'cache-control': 'public, max-age=86400' });
  } catch (error) {
    // 200 with an `error` field, not a 5xx: "this video has no captions" is an
    // answer, and the React components show the message either way.
    return json({ videoId, snippets: [], error: error instanceof Error ? error.message : 'Failed to fetch transcript' });
  }
}

/** Answers `/api/youtube/*`, or returns `null` for any other path. */
export async function handleYouTube(request: Request, url: URL, env: YouTubeEnv): Promise<Response | null> {
  const path = url.pathname;
  if (path !== YOUTUBE_API_BASE && !path.startsWith(`${YOUTUBE_API_BASE}/`)) return null;

  if (path === `${YOUTUBE_API_BASE}/transcript` && request.method === 'GET') return transcript(url);
  if (path === `${YOUTUBE_API_BASE}/demo` && request.method === 'GET') return json(demoInfo(env));

  if (path === LIBRARY_BASE || path.startsWith(`${LIBRARY_BASE}/`)) {
    const { handler } = await getLibrary(env);
    return handler.fetch(request);
  }

  return json({ error: 'Not found' }, 404);
}
