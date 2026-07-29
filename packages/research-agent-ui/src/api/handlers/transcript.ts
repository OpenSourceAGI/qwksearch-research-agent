/**
 * @fileoverview Handler that transcribes an uploaded audio file via Cloudflare Workers AI Whisper.
 *
 * Maps a requested quality tier ("small"/"medium"/"large"/etc.) to a
 * specific Whisper model binding and requires the Cloudflare AI binding to
 * be present (unavailable in local dev without CF bindings).
 */
import type { TranscriptDeps } from "../types";

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

export function createTranscriptHandler(deps: TranscriptDeps) {
  const POST = async (req: Request): Promise<Response> => {
    try {
      const formData = await req.formData();
      const file = formData.get("file");

      if (!file || !(file instanceof File)) {
        return Response.json({ error: "file is required" }, { status: 400 });
      }

      const modelParam = formData.get("model") as string | null;
      const model = getWhisperModel(modelParam);

      let ai: any;
      try {
        const ctx = deps.getCloudflareContext();
        ai = (ctx.env as any)?.AI;
      } catch {
        // CF bindings not available (local dev)
      }

      if (!ai) {
        return Response.json(
          { error: "Cloudflare AI binding not available" },
          { status: 503 },
        );
      }

      const audioData = await file.arrayBuffer();
      const { text } = await ai.run(model, {
        audio: [...new Uint8Array(audioData)],
      });

      return Response.json({ text, model });
    } catch (error) {
      console.error("Transcript error:", error);
      return Response.json({ error: "Failed to transcribe audio" }, { status: 500 });
    }
  };

  return { POST };
}
