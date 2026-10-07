/**
 * @fileoverview Server half of the planner: one request handler a host mounts
 * on its own route, with the language model and web search passed in.
 *
 * - `POST <base>/questions` `{ goal }` → `{ questions, mode }`
 * - `POST <base>` `{ goal, answers }` → `{ playlist, searches, mode, minutesPerWeek? }`
 * - `GET  <base>/catalog` → the bundled catalog
 *
 * Playlist storage (`<base>/playlists…`) is a separate handler,
 * `handlePlaylistStoreRequest`, in `./playlists`.
 *
 * Plain `Request`/`Response`, no DOM and no React, so it runs on Workers,
 * Node 18+, Bun and Deno. Bodies are capped and re-validated here; the
 * widget's own limits are a courtesy, not a check.
 */
import { getDefaultCatalog } from '../catalog';
import { normalizePlanRequest, planPlaylist, suggestFollowUps, type PlannerDeps } from '../planner';

export type { PlannerDeps, WebSearchHit, PlanResult, FollowUpsResult, FollowUpQuestion, PlanRequest } from '../planner';

/** Request bodies larger than this are refused before parsing. */
export const MAX_PLAN_BODY_BYTES = 8 * 1024;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });

async function readBody(request: Request): Promise<unknown> {
  const text = await request.text();
  if (text.length > MAX_PLAN_BODY_BYTES) throw new RangeError('Request body too large');
  return text ? JSON.parse(text) : {};
}

/**
 * Answers one planner request. The host owns everything around it: auth, rate
 * limiting (each POST can cost a model call and a few searches), and CORS.
 */
export async function handleEducationPlaylistsRequest(request: Request, deps: PlannerDeps = {}): Promise<Response> {
  const path = new URL(request.url).pathname.replace(/\/+$/, '');

  if (request.method === 'GET') {
    if (path.endsWith('/catalog')) return json(deps.catalog ?? getDefaultCatalog());
    return json({ error: 'Not found' }, 404);
  }
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let body: unknown;
  try {
    body = await readBody(request);
  } catch (error) {
    return json({ error: error instanceof RangeError ? error.message : 'Body must be JSON' }, error instanceof RangeError ? 413 : 400);
  }

  let planRequest;
  try {
    planRequest = normalizePlanRequest(body);
  } catch (error) {
    return json({ error: (error as Error).message }, 400);
  }

  if (path.endsWith('/questions')) return json(await suggestFollowUps(planRequest.goal, deps));
  return json(await planPlaylist(planRequest, deps));
}

export {
  handlePlaylistStoreRequest,
  createMemoryPlaylistRepository,
  playlistForViewer,
  MAX_PLAYLIST_BODY_BYTES,
  MAX_PLAYLIST_MEMBERS,
  MAX_OWNED_PLAYLISTS,
} from './playlists';
export type { PlaylistRepository, PlaylistStoreDeps, PlaylistUser, PendingInvite, InviteNotice } from './playlists';
