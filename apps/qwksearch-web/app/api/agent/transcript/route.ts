/**
 * @fileoverview Speech-to-text transcription endpoint. POST accepts an audio
 * file and transcribes it using Cloudflare Workers AI Whisper models
 * (tiny, turbo, or large variants).
 */
import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "vinext";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    const modelParam = formData.get("model") as string | null;
    const model = getWhisperModel(modelParam);

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
        { status: 503 },
      );
    }

    const audioData = await file.arrayBuffer();
    const { text } = await ai.run(model, {
      audio: [...new Uint8Array(audioData)],
    });

    return NextResponse.json({ text, model });
  } catch (error) {
    console.error("Transcript error:", error);
    return NextResponse.json(
      { error: "Failed to transcribe audio" },
      { status: 500 },
    );
  }
}

function getWhisperModel(modelParam: string | null): string {
  if (modelParam === "small" || modelParam === "fast") {
    return "@cf/openai/whisper-tiny-en";
  }
  if (modelParam === "medium" || modelParam === "turbo") {
    return "@cf/openai/whisper-large-v3-turbo";
  }
  if (modelParam === "large") {
    return "@cf/openai/whisper-large-v3";
  }
  return "@cf/openai/whisper-large-v3-turbo";
}
