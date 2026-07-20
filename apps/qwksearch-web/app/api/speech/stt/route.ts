/**
 * @fileoverview STT (Speech-to-Text) API endpoint
 * Handles audio transcription using Moonshine.js (client-side)
 * This endpoint is primarily for API documentation and potential server-side fallback
 */
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * GET - Returns API documentation
 */
export async function GET() {
  return NextResponse.json({
    message: "STT (Speech-to-Text) API",
    description: "Transcription happens client-side using Moonshine.js. This endpoint is for documentation purposes.",
    models: ["moonshine-small"],
    note: "For client-side transcription, import SpeechInput component from @/components/SpeechInput",
  });
}

/**
 * POST - Server-side fallback for transcription (future expansion)
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audio = formData.get("audio") as File;

    if (!audio) {
      return NextResponse.json(
        { error: "Audio file is required" },
        { status: 400 }
      );
    }

    // TODO: Implement server-side transcription using Whisper or similar
    // For now, return a placeholder response
    return NextResponse.json(
      {
        error: "Server-side transcription not yet implemented",
        note: "Use client-side SpeechInput component for transcription",
      },
      { status: 501 }
    );
  } catch (error) {
    console.error("[API] STT error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Transcription failed" },
      { status: 500 }
    );
  }
}
