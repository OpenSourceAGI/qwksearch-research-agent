/**
 * The demo's Worker. It answers `/api/*` only (see `run_worker_first` in
 * wrangler.jsonc); the SPA and the Storybook are static assets.
 *
 * Three routes, each one a piece of extract-youtube used the way a real app
 * would use it:
 *
 * - `GET /api/transcript?videoId=` — the main entry's `YouTubeTranscriptApi`,
 *   answering the `{ snippets }` / `{ error }` shape the React player and
 *   transcript modal read through their `transcriptUrl` prop.
 * - `/api/library/*` — `createVideoLibraryHandler` from
 *   `extract-youtube/library`, over D1 when a `DB` binding exists and an
 *   in-memory store otherwise. This is the whole admin API: list, search,
 *   stacks, create/edit/delete, auto-fill, resync, availability, import.
 * - `GET /api/demo` — which of the modes below this deploy runs in, so the UI
 *   can say whether edits need a token and whether they persist.
 *
 * | ADMIN_TOKEN | DB      | Mode                                             |
 * | ----------- | ------- | ------------------------------------------------ |
 * | unset       | unbound | sandbox: anyone edits a per-isolate memory copy  |
 * | set         | either  | token: edits need `Authorization: Bearer <token>` |
 * | unset       | bound   | read-only: nobody can edit the persistent library |
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

import { DEMO_FIELDS, DEMO_VIDEOS } from '../src/demo-data';

export interface Env {
  /** Optional D1 database. Without it the library lives in memory. */
  DB?: D1DatabaseLike;
  /** Optional bearer token that admin routes require. */
  ADMIN_TOKEN?: string;
  /** Optional YouTube Data API v3 key, for resync and auto-fill. */
  YOUTUBE_API_KEY?: string;
  /** Static assets; `wrangler` binds it for the SPA. */
  ASSETS?: { fetch(request: Request): Promise<Response> };
}

export type DemoMode = 'sandbox' | 'token' | 'read-only';

export interface DemoInfo {
  mode: DemoMode;
  storage: 'memory' | 'd1';
  youtubeApiKey: boolean;
}

function demoInfo(env: Env): DemoInfo {
  return {
    mode: env.ADMIN_TOKEN ? 'token' : env.DB ? 'read-only' : 'sandbox',
    storage: env.DB ? 'd1' : 'memory',
    youtubeApiKey: Boolean(env.YOUTUBE_API_KEY),
  };
}

function authorizeFor(env: Env): LibraryAuthorize | undefined {
  if (env.ADMIN_TOKEN) return bearerTokenAuth(env.ADMIN_TOKEN);
  // No token and no database: an isolate-local sandbox that resets on its own,
  // so letting anyone edit it is the point. With a database and no token the
  // authorize hook is left out, which makes every admin route answer 403.
  return env.DB ? undefined : () => true;
}

/**
 * The store and handler live for the isolate's lifetime. The memory store is
 * seeded once per isolate; a D1 store gets its tables (and, when empty, the
 * same seed) on the first request.
 */
let library: Promise<{ store: VideoLibraryStore; handler: VideoLibraryHandler }> | null = null;
let libraryEnv: Env | null = null;

/** Loads the demo videos. The import also forms the stacked playlists. */
async function seed(store: VideoLibraryStore): Promise<void> {
  await importLibraryVideos(store, DEMO_VIDEOS, { customFields: DEMO_FIELDS });
}

function getLibrary(env: Env) {
  if (!library || libraryEnv !== env) {
    libraryEnv = env;
    library = (async () => {
      let store: VideoLibraryStore;
      if (env.DB) {
        const d1 = createD1LibraryStore(env.DB);
        await d1.ensureSchema();
        if ((await d1.list({ limit: 1, includeHidden: true })).total === 0) await seed(d1);
        store = d1;
      } else {
        store = createMemoryLibraryStore({ customFields: DEMO_FIELDS });
        await seed(store);
      }
      const handler = createVideoLibraryHandler({
        store,
        basePath: '/api/library',
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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/transcript' && request.method === 'GET') return transcript(url);
    if (url.pathname === '/api/demo' && request.method === 'GET') return json(demoInfo(env));

    if (url.pathname === '/api/library' || url.pathname.startsWith('/api/library/')) {
      const { handler } = await getLibrary(env);
      return handler.fetch(request);
    }

    if (url.pathname.startsWith('/api/')) return json({ error: 'Not found' }, 404);
    return env.ASSETS ? env.ASSETS.fetch(request) : new Response('Not found', { status: 404 });
  },
};
