/**
 * @fileoverview Lets a connected partner refresh what it knows about a linked
 * QwkSearch account — notably the plan, after the user upgrades — using the
 * API key it received from `/api/connect/token`. The key travels in a header
 * (`X-API-Key` or `Authorization: Bearer`), never the query string.
 */
import { NextResponse } from "next/server";
import { validateApiKey } from "@/lib/auth/api-key";
import { loadConnectAccount } from "@/lib/auth/connect-account";

const noStore = { "Cache-Control": "no-store" };

function headerKey(request: Request): string | null {
  const direct = request.headers.get("x-api-key")?.trim();
  if (direct) return direct;
  const bearer = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  return bearer || null;
}

export async function GET(request: Request) {
  const key = headerKey(request);
  const result = key ? await validateApiKey(key) : { valid: false as const };
  // The master key belongs to no user, so it has no account to describe.
  if (!result.valid || !result.user?.id || result.user.id === "master") {
    return NextResponse.json({ error: "invalid_api_key" }, { status: 401, headers: noStore });
  }

  const account = await loadConnectAccount(result.user.id);
  if (!account) {
    return NextResponse.json({ error: "invalid_api_key" }, { status: 401, headers: noStore });
  }
  const { apiKey: _omit, ...summary } = account;
  return NextResponse.json(
    { user: summary.user, plan: summary.plan, upgrade_url: summary.upgradeUrl },
    { headers: noStore },
  );
}
