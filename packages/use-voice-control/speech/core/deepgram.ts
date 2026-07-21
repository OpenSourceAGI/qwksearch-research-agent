/**
 * @fileoverview Deepgram TTS provider implementation using Cloudflare Workers AI
 * Requires Cloudflare AI binding
 */
import type { TTSResult } from "../types/types";
import { DEEPGRAM_SPEAKERS, type DeepgramSpeaker } from "../types/types";

/**
 * Resolve the Cloudflare Workers AI binding at runtime without a hard
 * dependency on the host application. Consumers running on Cloudflare can
 * expose the context by setting `globalThis.getCloudflareContext` (as the
 * `@opennextjs/cloudflare` / `@cloudflare/next-on-pages` helpers do) or by
 * placing the bound `env` on `globalThis.__env__`.
 */
function resolveCloudflareAI(): any {
  const g = globalThis as any;
  try {
    if (typeof g.getCloudflareContext === "function") {
      const ctx = g.getCloudflareContext();
      if (ctx?.env?.AI) return ctx.env.AI;
    }
  } catch {
    // CF context helper threw (e.g. called outside a request scope)
  }
  return g.__env__?.AI ?? g.AI;
}

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

  const ai = resolveCloudflareAI();

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
