/**
 * @fileoverview Token step of "Sign in with QwkSearch" (lib/auth/connect.ts).
 *
 * Called server-to-server by the partner site with the code it was redirected
 * with, the same `redirect_uri`, and its PKCE `code_verifier`. Answers with
 * the user's API key, profile, plan and upgrade link. Accepts JSON or a form
 * body, with OAuth's snake_case field names.
 */
import { NextResponse } from "next/server";
import { connectSecret, redeemConnectCode } from "@/lib/auth/connect";
import { loadConnectAccount } from "@/lib/auth/connect-account";

const noStore = { "Cache-Control": "no-store" };

async function readBody(request: Request): Promise<Record<string, unknown>> {
  const type = request.headers.get("content-type") ?? "";
  try {
    if (type.includes("application/json")) return (await request.json()) ?? {};
    return Object.fromEntries((await request.formData()).entries());
  } catch {
    return {};
  }
}

export async function POST(request: Request) {
  const secret = connectSecret();
  if (!secret) {
    return NextResponse.json({ error: "server_error" }, { status: 500, headers: noStore });
  }

  const body = await readBody(request);
  const result = await redeemConnectCode(
    { code: body.code, redirectUri: body.redirect_uri, codeVerifier: body.code_verifier },
    secret,
  );
  // `"error" in` rather than `!result.ok`: the app compiles without
  // strictNullChecks, which disables narrowing on the boolean discriminant.
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400, headers: noStore });
  }

  const account = await loadConnectAccount(result.uid);
  if (!account) {
    return NextResponse.json({ error: "invalid_grant" }, { status: 400, headers: noStore });
  }

  return NextResponse.json(
    {
      token_type: "api_key",
      api_key: account.apiKey,
      user: account.user,
      plan: account.plan,
      upgrade_url: account.upgradeUrl,
    },
    { headers: noStore },
  );
}
