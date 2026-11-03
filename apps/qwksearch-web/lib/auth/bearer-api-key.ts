/**
 * @fileoverview API-key-only authorization for the OpenAI-compatible routes
 * under `/api/v1/*` (speech-to-text for Kilo and similar clients).
 *
 * Unlike `checkApiAuth` (lib/auth/api-key.ts), this always requires a key —
 * whatever `api.requireApiKey` says — and never falls back to a browser
 * session: these routes are called by tools, not by the web app. The key is
 * the user's QwkSearch API key (`user.apiKey`) or the `API_KEY` master key,
 * checked by the same `validateApiKey` every other route uses. It is read
 * from headers only, never the query string, which ends up in logs.
 */
import { validateApiKey } from "./api-key";

export type BearerAuthResult =
  | { authorized: true; userId: string }
  | { authorized: false; status: number; message: string };

/** The key in `Authorization: Bearer <key>` or `X-API-Key`, if any. */
export function apiKeyFromRequestHeaders(h: Pick<Headers, "get">): string | null {
  const bearer = h.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (bearer) return bearer;
  return h.get("x-api-key")?.trim() || null;
}

export async function authorizeBearerApiKey(request: Request): Promise<BearerAuthResult> {
  const key = apiKeyFromRequestHeaders(request.headers);
  if (!key) {
    return {
      authorized: false,
      status: 401,
      message: "Missing API key. Send `Authorization: Bearer <your QwkSearch API key>`.",
    };
  }

  const result = await validateApiKey(key);
  if (result.valid && result.user?.id) {
    return { authorized: true, userId: String(result.user.id) };
  }
  if (result.reason === "db_error") {
    return { authorized: false, status: 503, message: "Could not verify the API key. Try again shortly." };
  }
  return { authorized: false, status: 401, message: "Invalid API key." };
}
