/**
 * @fileoverview Handler that transcribes an uploaded audio file via Cloudflare Workers AI Whisper.
 *
 * Maps a requested quality tier ("small"/"medium"/"large"/etc.) to a
 * specific Whisper model binding and requires the Cloudflare AI binding to
 * be present (unavailable in local dev without CF bindings).
 *
 * The transcription itself is `transcribeAudio`, shared by this handler
 * (`/api/agent/transcript`) and the OpenAI-compatible adapter in
 * `./openai-transcription.ts` (`/api/v1/audio/transcriptions`), so the two
 * routes cannot drift apart on which Whisper model a tier means.
 */
import type { TranscriptDeps } from "../types";

/** The quality tiers a caller may ask for, in the order they are listed. */
export const TRANSCRIPTION_MODELS = ["small", "fast", "medium", "turbo", "large"] as const;

export type TranscriptionModel = (typeof TRANSCRIPTION_MODELS)[number];

/** The tier used when a request names none. */
export const DEFAULT_TRANSCRIPTION_MODEL: TranscriptionModel = "turbo";

export function isTranscriptionModel(value: unknown): value is TranscriptionModel {
  return typeof value === "string" && (TRANSCRIPTION_MODELS as readonly string[]).includes(value);
}

/**
 * The Workers AI model behind a tier. An unknown or missing tier falls back
 * to turbo — `/api/agent/transcript` has always been lenient here; the
 * OpenAI-compatible route validates the tier before it gets this far.
 */
export function getWhisperModel(modelParam: string | null): string {
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

export type TranscribeResult =
  | { ok: true; text: string; model: string }
  | { ok: false; reason: "ai_unavailable" };

/**
 * Transcribes `file` with the Whisper model for `modelParam`.
 *
 * Resolves `{ ok: false }` when the Cloudflare AI binding is missing (local
 * dev); a failure inside Workers AI is thrown for the caller to map to a 500.
 * Logs nothing: neither the audio nor the transcript belongs in a log line.
 */
export async function transcribeAudio(
  deps: TranscriptDeps,
  file: Blob,
  modelParam: string | null,
): Promise<TranscribeResult> {
  const model = getWhisperModel(modelParam);

  let ai: any;
  try {
    const ctx = deps.getCloudflareContext();
    ai = (ctx.env as any)?.AI;
  } catch {
    // CF bindings not available (local dev)
  }

  if (!ai) return { ok: false, reason: "ai_unavailable" };

  const audioData = await file.arrayBuffer();
  const { text } = await ai.run(model, {
    audio: [...new Uint8Array(audioData)],
  });

  return { ok: true, text, model };
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
      const result = await transcribeAudio(deps, file, modelParam);

      if (!result.ok) {
        return Response.json(
          { error: "Cloudflare AI binding not available" },
          { status: 503 },
        );
      }

      return Response.json({ text: result.text, model: result.model });
    } catch (error) {
      console.error("Transcript error:", error);
      return Response.json({ error: "Failed to transcribe audio" }, { status: 500 });
    }
  };

  return { POST };
}
