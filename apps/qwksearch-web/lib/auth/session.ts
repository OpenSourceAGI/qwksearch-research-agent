import { eq } from "drizzle-orm";
import { initAuth } from "./index";
import { headers } from "next/headers";
import { getDB } from "../database";
import { user as userSchema } from "../database/schema";

export interface AuthSession {
  session: {
    id: string;
    userId: string;
    expiresAt: Date;
  };
  user: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
}

/**
 * Resolves a session from a personal API key (`Authorization: Bearer qwk_...`).
 * Lets non-browser clients that can't hold a cookie session (e.g. the VS Code
 * extension) authenticate with the API key already shown in Settings > Account.
 * Returns null if the header is absent or doesn't match a user.
 */
async function getSessionFromApiKey(): Promise<AuthSession | null> {
  const requestHeaders = await headers();
  const authHeader = requestHeaders.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const apiKey = authHeader.slice("Bearer ".length).trim();
  if (!apiKey.startsWith("qwk_")) return null;

  const db = getDB();
  const userRow = await db.query.user.findFirst({
    where: eq(userSchema.apiKey, apiKey),
  });
  if (!userRow) return null;

  return {
    session: {
      id: `apikey:${userRow.id}`,
      userId: userRow.id,
      // API keys don't expire on their own schedule; treat as long-lived.
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
    user: {
      id: userRow.id,
      name: userRow.name,
      email: userRow.email,
      image: userRow.image ?? undefined,
    },
  };
}

/**
 * Get current session from request headers
 * Returns null if not authenticated
 */
export async function getSession(): Promise<AuthSession | null> {
  const apiKeySession = await getSessionFromApiKey();
  if (apiKeySession) return apiKeySession;

  let session;
  try {
    const auth = await initAuth();
    const requestHeaders = await headers();
    session = await auth.api.getSession({
      headers: requestHeaders,
    });
    if (!session) return null;
  } catch (error) {
    console.error("Session retrieval error:", error);
    return null;
  }

  // Sessions are stored in KV (better-auth-cloudflare secondaryStorage) and
  // can outlive their user row when the D1 database is recreated. Every
  // userId column with FOREIGN KEY REFERENCES user(id) rejects writes for
  // such stale sessions, so verify the user row exists before trusting the
  // session anywhere. This check is best-effort: if the lookup itself fails
  // (e.g. a transient D1 error), trust the session rather than revoking it —
  // a query failure is not proof the user row is missing, and a fresh
  // Google/One-Tap sign-in's D1 write may not yet be visible to this read.
  try {
    const db = getDB();
    const userRow = await db.query.user.findFirst({
      where: eq(userSchema.id, session.user.id),
      columns: { id: true },
    });
    if (!userRow) {
      console.warn(
        `[auth] session user ${session.user.id} has no user row; revoking stale session`,
      );
      try {
        // Delete the orphaned session from KV so the client's own
        // better-auth get-session calls stop reporting it as signed in.
        const auth = await initAuth();
        const requestHeaders = await headers();
        await auth.api.signOut({ headers: requestHeaders });
      } catch (signOutError) {
        console.error("[auth] failed to revoke stale session:", signOutError);
      }
      return null;
    }
  } catch (error) {
    console.error("[auth] user row lookup failed; trusting session:", error);
  }

  return session;
}

/**
 * Get session or throw 401 error
 * Use this in protected API routes
 */
export async function requireSession(): Promise<AuthSession> {
  const session = await getSession();

  if (!session) {
    throw new Error("Unauthorized");
  }

  return session;
}

/**
 * Get user ID from session
 * Returns null if not authenticated
 */
export async function getUserId(): Promise<string | null> {
  const session = await getSession();
  return session?.user?.id ?? null;
}

/**
 * Require user ID or throw
 */
export async function requireUserId(): Promise<string> {
  const session = await requireSession();
  return session.user.id;
}
