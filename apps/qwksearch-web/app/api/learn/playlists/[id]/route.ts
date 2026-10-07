/**
 * @fileoverview One saved education playlist: `GET` (anyone, for a public
 * one), `PUT` (create, or update by the owner or an editor), `DELETE` (owner),
 * and `POST /api/learn/playlists/accept-invite` `{ token }`. The access rules
 * are `education-playlists/server`'s; see `@/lib/learn/playlists`.
 */
import { servePlaylistStore } from "@/lib/learn/playlists";

export const GET = servePlaylistStore;
export const PUT = servePlaylistStore;
export const DELETE = servePlaylistStore;
export const POST = servePlaylistStore;
