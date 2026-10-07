/**
 * @fileoverview A signed-in learner's saved education playlists:
 * `GET /api/learn/playlists` → `{ playlists, invites }`. One playlist is at
 * `/api/learn/playlists/[id]`. See `@/lib/learn/playlists`.
 *
 * Cookie-authenticated and same-origin only, so unlike the planner routes
 * beside it there is no CORS.
 */
import { servePlaylistStore } from "@/lib/learn/playlists";

export const GET = servePlaylistStore;
