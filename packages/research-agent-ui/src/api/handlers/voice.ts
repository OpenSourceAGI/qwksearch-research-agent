/**
 * @fileoverview Handler that generates text-to-speech audio, rate-limited per user/IP.
 *
 * Accepts text plus a voice/provider (defaulting to Kokoro), enforces a
 * 10/day TTS rate limit keyed by user id or forwarded IP, and streams back
 * the generated audio with an appropriate content type.
 */
import type { VoiceDeps } from "../types";

export function createVoiceHandler(deps: VoiceDeps) {
  const POST = async (req: Request): Promise<Response> => {
    let text: string;
    let voice: string;
    let provider: string;

    try {
      const body = await req.json();
      text = body.text;
      voice = body.voice || body.speaker || "af_heart";
      provider = body.provider || "kokoro";
    } catch {
      return Response.json({ error: "Invalid request body" }, { status: 400 });
    }

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return Response.json({ error: "text is required" }, { status: 400 });
    }

    const userId = await deps.getUserId();
    const rateLimitKey =
      userId ??
      (req as any).headers?.get?.("x-forwarded-for")?.split(",")[0]?.trim() ??
      (req as any).headers?.get?.("x-real-ip") ??
      "unknown";

    const { allowed } = deps.checkTTSRateLimit(rateLimitKey);
    if (!allowed) {
      return Response.json(
        { error: "Daily TTS limit reached (10/day)", rateLimited: true },
        { status: 429 },
      );
    }

    try {
      const result = await deps.generateSpeech({
        text: text.slice(0, 5000),
        provider,
        voice,
      });

      return new Response(result.audio as any, {
        headers: {
          "Content-Type": result.contentType,
          "Cache-Control": "public, max-age=86400",
          "Content-Disposition": `inline; filename="speech.${
            result.contentType.includes("wav") ? "wav" : "mp3"
          }"`,
        },
      });
    } catch (error) {
      console.error("[TTS] Error:", error);
      const message =
        error instanceof Error ? error.message : "TTS generation failed";

      if (message.includes("Cloudflare AI binding")) {
        return Response.json(
          {
            error:
              "Deepgram provider requires Cloudflare AI binding. Use 'kokoro' provider instead.",
          },
          { status: 503 },
        );
      }

      return Response.json({ error: message }, { status: 500 });
    }
  };

  return { POST };
}
