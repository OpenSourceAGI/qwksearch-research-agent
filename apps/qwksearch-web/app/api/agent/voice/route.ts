/**
 * @fileoverview Text-to-speech endpoint. POST converts text to audio using
 * Kokoro (default, faster & more natural) or Deepgram Aura.
 * Enforces per-user daily rate limits (10/day for guests).
 */
import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth/session";
import { checkTTSRateLimit } from "@/lib/rate-limit/guestRateLimiter";
import { generateSpeech, type TTSProvider } from "@/lib/speech";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let text: string;
  let voice: string;
  let provider: TTSProvider;

  try {
    const body = await request.json();
    text = body.text;
    voice = body.voice || body.speaker || "af_heart";
    provider = body.provider || "kokoro";
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

  try {
    const result = await generateSpeech({
      text: text.slice(0, 5000),
      provider,
      voice,
    });

    return new Response(result.audio, {
      headers: {
        "Content-Type": result.contentType,
        "Cache-Control": "public, max-age=86400",
        "Content-Disposition": `inline; filename="speech.${result.contentType.includes('wav') ? 'wav' : 'mp3'}"`,
      },
    });
  } catch (error) {
    console.error("[TTS] Error:", error);

    // Handle specific errors
    const message = error instanceof Error ? error.message : "TTS generation failed";

    if (message.includes("Cloudflare AI binding")) {
      return NextResponse.json(
        { error: "Deepgram provider requires Cloudflare AI binding. Use 'kokoro' provider instead." },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
