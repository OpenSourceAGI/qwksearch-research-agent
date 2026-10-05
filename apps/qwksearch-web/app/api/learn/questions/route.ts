/**
 * @fileoverview Follow-up questions for a learning goal:
 * `POST /api/learn/questions` `{ goal }`. See `@/lib/learn/planner`.
 */
import { serveEducationPlaylists } from "@/lib/learn/planner";
import { withCors, corsPreflight } from "@/lib/cors";

export const POST = withCors(serveEducationPlaylists);
export const OPTIONS = corsPreflight;
