/**
 * @fileoverview Session lookup for the research-agent API (`/api/agent/*`)
 * that also accepts a user's API key.
 *
 * A site embedding the research agent (debate-ai.com, via "Sign in with
 * QwkSearch" — see ./connect.ts) has no QwkSearch cookie to send; it sends the
 * linked user's key as `X-API-Key` or `Authorization: Bearer` instead. Here a
 * valid key resolves to that user, so chats, history and plan-gated models
 * work in the embed exactly as they do on qwksearch.com.
 *
 * Deliberately limited to the agent routes: account management (`/api/user`,
 * password, sessions, deletion) still requires a real sign-in, so a leaked
 * key can't be used to take over the account. The key is read from headers
 * only — never the query string, which ends up in logs.
 */
import { headers } from "next/headers";
import { getSession as getCookieSession, type AuthSession } from "./session";
import { validateApiKey } from "./api-key";

/** The API key in a request's headers, if any. */
export function apiKeyFromHeaders(h: Pick<Headers, "get">): string | null {
  const direct = h.get("x-api-key")?.trim();
  if (direct) return direct;
  const bearer = h.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  return bearer || null;
}

export async function getSession(): Promise<AuthSession | null> {
  const session = await getCookieSession();
  if (session) return session;

  let key: string | null = null;
  try {
    key = apiKeyFromHeaders(await headers());
  } catch {
    return null;
  }
  if (!key) return null;

  const result = await validateApiKey(key);
  // The master key belongs to no user; it authorizes API access (lib/cors)
  // but must not impersonate anyone here.
  if (!result.valid || !result.user?.id || result.user.id === "master") return null;
  return {
    session: { id: `api-key:${result.user.id}`, userId: result.user.id, expiresAt: new Date(Date.now() + 60_000) },
    user: { id: result.user.id, name: result.user.name, email: result.user.email },
  };
}

export async function requireSession(): Promise<AuthSession> {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  return session;
}

export async function getUserId(): Promise<string | null> {
  return (await getSession())?.user?.id ?? null;
}

export async function requireUserId(): Promise<string> {
  return (await requireSession()).user.id;
}
