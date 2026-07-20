/**
 * @fileoverview Deepgram TTS provider implementation using Cloudflare Workers AI
 * Requires Cloudflare AI binding
 */
import type { TTSResult } from "./types";
import { DEEPGRAM_SPEAKERS, type DeepgramSpeaker } from "./types";
import { getCloudflareContext } from "@/lib/cloudflare-context";

/**
 * Generate speech from text using Deepgram Aura via Cloudflare Workers AI
 */
export async function generateDeepgramSpeech(
  text: string,
  speaker: string = "angus"
): Promise<TTSResult> {
  // Validate speaker
  const auraVoice = DEEPGRAM_SPEAKERS.includes(speaker as DeepgramSpeaker)
    ? (speaker as DeepgramSpeaker)
    : "angus";

  let ai: any;
  try {
    const ctx = getCloudflareContext();
    ai = (ctx.env as any)?.AI;
  } catch {
    // CF bindings not available
  }

  if (!ai) {
    throw new Error("Cloudflare AI binding not available");
  }

  const result = await ai.run("@cf/deepgram/aura-1", {
    text: text.slice(0, 5000),
    speaker: auraVoice,
    encoding: "mp3",
  });

  return {
    audio: result,
    contentType: "audio/mpeg",
  };
}
