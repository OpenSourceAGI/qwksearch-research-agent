/**
 * @fileoverview Unified text-to-speech API supporting Kokoro (default) and Deepgram
 *
 * Kokoro: Faster, more natural, runs on Node CPU
 * Deepgram: Requires Cloudflare AI binding, MP3 output
 */
import type { TTSOptions, TTSResult } from "./types";
import { generateKokoroSpeech } from "./kokoro";
import { generateDeepgramSpeech } from "./deepgram";

export * from "./types";

/**
 * Generate speech from text using the specified provider
 *
 * @param options - TTS configuration
 * @returns Audio buffer and content type
 *
 * @example
 * ```ts
 * // Use Kokoro (default)
 * const audio = await generateSpeech({
 *   text: "Hello world",
 *   voice: "af_heart"
 * });
 *
 * // Use Deepgram
 * const audio = await generateSpeech({
 *   text: "Hello world",
 *   provider: "deepgram",
 *   voice: "angus"
 * });
 * ```
 */
export async function generateSpeech(
  options: TTSOptions
): Promise<TTSResult> {
  const { text, provider = "kokoro", voice = "af_heart" } = options;

  if (!text || typeof text !== "string" || text.trim().length === 0) {
    throw new Error("Text is required");
  }

  switch (provider) {
    case "kokoro":
      return generateKokoroSpeech(text, voice);

    case "deepgram":
      return generateDeepgramSpeech(text, voice);

    default:
      throw new Error(`Unknown TTS provider: ${provider}`);
  }
}
