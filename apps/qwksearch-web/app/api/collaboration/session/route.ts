/**
 * @fileoverview Session lookup for the collaboration server. GET verifies the
 * token a Yjs client connected with and answers with the user behind it, or
 * 401. It is the `REASON_AUTH_URL` half of `lib/collaboration/rooms.ts`, served
 * by this app so the collaboration server has no session store of its own.
 *
 * The token is the client's Better Auth session cookie value, sent as
 * `Authorization: Bearer <token>`; a browser calling this endpoint directly
 * with its cookies works too. Nothing but `{ id, name }` is returned — the
 * collaboration server needs an identity and a display name for the cursor,
 * and no more.
 */
import { NextRequest, NextResponse } from "next/server";
import { initAuth } from "@/lib/auth";
import type { AuthSession } from "@/lib/auth/session";

export const runtime = "nodejs";

/** Better Auth's default session cookie, with and without the secure prefix. */
const SESSION_COOKIE = "better-auth.session_token";

function bearerToken(req: NextRequest): string | null {
  const header = req.headers.get("authorization") ?? "";
  const [scheme, ...rest] = header.split(" ");
  if (scheme.toLowerCase() !== "bearer") return null;
  const token = rest.join(" ").trim();
  return token || null;
}

/**
 * Headers to hand Better Auth. A bearer token is presented as the session
 * cookie it is; without one the caller's own cookies are used unchanged.
 */
function sessionHeaders(req: NextRequest): Headers {
  const token = bearerToken(req);
  if (!token) return new Headers(req.headers);

  const headers = new Headers();
  headers.set(
    "cookie",
    `${SESSION_COOKIE}=${token}; __Secure-${SESSION_COOKIE}=${token}`,
  );
  return headers;
}

export async function GET(req: NextRequest) {
  try {
    const auth = await initAuth();
    const session = (await auth.api.getSession({
      headers: sessionHeaders(req),
    })) as AuthSession | null;

    const user = session?.user;
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ id: user.id, name: user.name || user.id });
  } catch (error) {
    console.error("[collaboration] session lookup failed:", error);
    return NextResponse.json(
      { error: "Failed to resolve session" },
      { status: 500 },
    );
  }
}
