/**
 * @fileoverview TTS (Text-to-Speech) API endpoint
 * Generates audio from text using Kokoro or Deepgram
 */
import { generateSpeech, type TTSOptions } from "@/lib/speech";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as TTSOptions;

    const { text, provider = "kokoro", voice } = body;

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Invalid text parameter" },
        { status: 400 }
      );
    }

    const result = await generateSpeech({
      text,
      provider,
      voice,
    });

    return new NextResponse(result.audio, {
      headers: {
        "Content-Type": result.contentType,
        "Cache-Control": "public, max-age=31536000",
      },
    });
  } catch (error) {
    console.error("[API] TTS error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "TTS generation failed" },
      { status: 500 }
    );
  }
}
