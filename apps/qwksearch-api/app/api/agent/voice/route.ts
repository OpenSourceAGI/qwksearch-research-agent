/**
 * @fileoverview Text-to-speech endpoint. POST converts text to audio using
 * Cloudflare Workers AI Deepgram Aura voices. Supports multiple speakers
 * and enforces per-user daily rate limits (10/day for guests).
 */
import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "vinext";
import { getUserId } from "@/lib/auth/session";
import { checkTTSRateLimit } from "@/lib/rate-limit/guestRateLimiter";

export const runtime = "nodejs";

const AURA_SPEAKERS = [
  "angus", "asteria", "arcas", "orion", "orpheus", "athena",
  "luna", "zeus", "perseus", "helios", "hera", "stella",
] as const;

type AuraSpeaker = (typeof AURA_SPEAKERS)[number];

export async function POST(request: NextRequest) {
  let text: string;
  let speaker: AuraSpeaker;
  try {
    const body = await request.json();
    text = body.text;
    const requested = body.speaker as string | undefined;
    speaker = AURA_SPEAKERS.includes(requested as AuraSpeaker)
      ? (requested as AuraSpeaker)
      : "angus";
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  if (!text || typeof text !== "string" || text.trim().length === 0) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  // Rate-limit guests
  const userId = await getUserId();
  const rateLimitKey =
    userId ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  const { allowed } = checkTTSRateLimit(rateLimitKey);
  if (!allowed) {
    return NextResponse.json(
      { error: "Daily TTS limit reached (10/day)", rateLimited: true },
      { status: 429 }
    );
  }

  let ai: any;
  try {
    const ctx = getCloudflareContext();
    ai = (ctx.env as any)?.AI;
  } catch {
    // CF bindings not available (local dev)
  }

  if (!ai) {
    return NextResponse.json(
      { error: "Cloudflare AI binding not available" },
      { status: 503 }
    );
  }

  const result = await ai.run("@cf/deepgram/aura-1", {
    text: text.slice(0, 5000),
    speaker,
    encoding: "mp3",
  });

  return new Response(result, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-store",
    },
  });
}
