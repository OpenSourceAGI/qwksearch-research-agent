/**
 * @fileoverview The education-playlists planner for the homepage Learn widget
 * and `/learn`. `POST /api/learn` `{ goal, answers }` plans a custom playlist;
 * follow-up questions are at `/api/learn/questions`.
 */
import { serveEducationPlaylists } from "@/lib/learn/planner";
import { withCors, corsPreflight } from "@/lib/cors";

export const POST = withCors(serveEducationPlaylists);
export const OPTIONS = corsPreflight;
