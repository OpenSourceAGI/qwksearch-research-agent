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
 * Get current session from request headers
 * Returns null if not authenticated
 */
export async function getSession(): Promise<AuthSession | null> {
  try {
    const auth = await initAuth();
    const requestHeaders = await headers();
    const session = await auth.api.getSession({
      headers: requestHeaders,
    });
    if (!session) return null;

    // Sessions are stored in KV (better-auth-cloudflare secondaryStorage) and
    // can outlive their user row when the D1 database is recreated. Every
    // userId column with FOREIGN KEY REFERENCES user(id) rejects writes for
    // such stale sessions, so verify the user row exists before trusting the
    // session anywhere.
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
        await auth.api.signOut({ headers: requestHeaders });
      } catch (signOutError) {
        console.error("[auth] failed to revoke stale session:", signOutError);
      }
      return null;
    }

    return session;
  } catch (error) {
    console.error("Session retrieval error:", error);
    return null;
  }
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
