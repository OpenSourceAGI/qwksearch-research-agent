/**
 * @fileoverview Serves the education-playlists planner (`/api/learn`) from
 * this app: `education-playlists/server` does the planning, this file only
 * hands it a language model and a web search.
 *
 * Each plan can cost a model call and a few searches, so a visitor is metered
 * by the same guest limiter as the chat. Running out never fails the request:
 * past the limit, or with no model configured, the planner answers "offline"
 * from its bundled catalog, which is a worse playlist but still a playlist.
 */
import { generateText } from "ai";
import ModelRegistry from "chat-agent-toolkit/models/registry";
import { searchSearxng } from "search-web-api/search/public-searxng";
import { handleEducationPlaylistsRequest } from "education-playlists/server";
import type { PlannerDeps, WebSearchHit } from "education-playlists/server";
import { checkGuestRateLimit } from "@/lib/rate-limit/guestRateLimiter";

/** A slow public search instance must not hold the whole plan hostage. */
const SEARCH_TIMEOUT_MS = 6000;

const clientIP = (req: Request): string =>
  req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
  req.headers.get("x-real-ip") ||
  "unknown";

async function generate({ system, prompt }: { system: string; prompt: string }): Promise<string> {
  const model = await new ModelRegistry().loadChatModel();
  const { text } = await generateText({
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: prompt },
    ],
  });
  return text;
}

async function search(query: string): Promise<WebSearchHit[]> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("search timed out")), SEARCH_TIMEOUT_MS);
  });
  try {
    const { results } = await Promise.race([searchSearxng(query, { categories: ["videos"] }), timeout]);
    return results.map((result) => ({ title: result.title, url: result.url, snippet: result.snippet ?? result.content }));
  } finally {
    clearTimeout(timer);
  }
}

/** The model and search for a request, or none once the visitor is over the limit. */
export function plannerDepsFor(req: Request): PlannerDeps {
  if (req.method !== "POST") return {};
  return checkGuestRateLimit(clientIP(req)).allowed ? { generate, search } : {};
}

export function serveEducationPlaylists(req: Request): Promise<Response> {
  return handleEducationPlaylistsRequest(req, plannerDepsFor(req));
}
