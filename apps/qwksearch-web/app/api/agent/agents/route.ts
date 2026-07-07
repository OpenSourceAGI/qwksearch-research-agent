/**
 * @fileoverview AI agent endpoint. POST accepts a prompt and model parameters,
 * resolves the user's API key (or falls back to server-side keys), and
 * generates a language model response.
 */
import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth/session";
import { getDB } from "@/lib/database";
import { user as userSchema } from "@/lib/database/schema";
import { eq } from "drizzle-orm";
import { getEnv } from "@/lib/env";

export async function POST(request: NextRequest) {
  let params;

  try {
    params = await request.json();
  } catch (error) {
    return NextResponse.json({ error: "Invalid JSON input" }, { status: 500 });
  }

  // Get client IP address
  params.ip =
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    "unknown";

  // Get user if authenticated
  const db = getDB();
  const userId = await getUserId();
  let user = null;

  if (userId) {
    const result = await db.query.user.findFirst({
      where: eq(userSchema.id, userId),
    });
    user = result;
  }

  // Get user's own API key
  if (user) {
    params.apiKey = user.settings?.providerApiKeys?.find(
      (key: any) => key.provider == params.provider,
    )?.key;
  }

  // Provide default API keys
  if (!params.apiKey) {
    params.apiKey =
      params.provider == "groq" ? getEnv("GROQ_API_KEY") : false;
  }

  if (!params.apiKey) {
    return NextResponse.json({ error: "API key is required" }, { status: 500 });
  }

  // Language generation functionality has been removed
  // This endpoint needs to be reimplemented or deprecated
  return NextResponse.json({
    error: "Language generation endpoint is deprecated. Please use /api/agent/chat instead."
  }, { status: 501 });
}
