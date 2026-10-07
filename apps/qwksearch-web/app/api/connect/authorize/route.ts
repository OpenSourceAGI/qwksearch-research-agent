/**
 * @fileoverview The consent step of "Sign in with QwkSearch" (lib/auth/connect.ts).
 *
 * GET  describes a pending request for the `/connect` page: which partner is
 *      asking, and who (if anyone) is signed in here.
 * POST is the consent form's submit. Approving issues a two-minute code and
 *      redirects to the partner's `redirect_uri`; denying redirects there with
 *      `error=access_denied`. Both redirects carry the partner's `state` back.
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  connectSecret,
  isValidPkceValue,
  resolveConnectClient,
  signConnectCode,
  withQuery,
} from "@/lib/auth/connect";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const client = resolveConnectClient(params.get("redirect_uri"));
  if (!client) {
    return NextResponse.json({ error: "invalid_redirect_uri" }, { status: 400 });
  }
  const session = await getSession();
  return NextResponse.json({
    client,
    user: session?.user
      ? { name: session.user.name, email: session.user.email, image: session.user.image ?? null }
      : null,
  });
}

export async function POST(request: Request) {
  // A cross-site form post would carry the attacker's Origin; the consent
  // page posts from this one. (Session cookies are SameSite=Lax as well.)
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
  }

  const form = await request.formData();
  const field = (name: string) => {
    const value = form.get(name);
    return typeof value === "string" ? value : "";
  };
  const redirectUri = field("redirect_uri");
  const state = field("state");
  const challenge = field("code_challenge");
  const method = field("code_challenge_method") || "S256";

  // Never redirect to a URI that isn't allowlisted — answer here instead.
  if (!resolveConnectClient(redirectUri)) {
    return NextResponse.json({ error: "invalid_redirect_uri" }, { status: 400 });
  }
  const back = (params: Record<string, string>) =>
    NextResponse.redirect(withQuery(redirectUri, { ...params, state }), 303);

  if (field("decision") !== "approve") return back({ error: "access_denied" });
  if (method !== "S256" || !isValidPkceValue(challenge)) return back({ error: "invalid_request" });

  const session = await getSession();
  if (!session?.user?.id) return back({ error: "login_required" });

  const secret = connectSecret();
  if (!secret) {
    console.error("[connect] BETTER_AUTH_SECRET is not set; cannot issue codes");
    return back({ error: "server_error" });
  }

  const code = await signConnectCode({ uid: session.user.id, redirectUri, challenge }, secret);
  return back({ code });
}
