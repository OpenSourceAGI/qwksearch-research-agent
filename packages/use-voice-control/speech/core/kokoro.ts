/**
 * @fileoverview Kokoro TTS provider implementation using Hugging Face transformers
 * Runs on Node.js CPU via transformers library
 */
import type { TTSResult } from "../types/types";
import { KOKORO_VOICES, type KokoroVoice } from "../types/types";

let ttsInstance: any = null;
let modelLoading: Promise<any> | null = null;

/**
 * Lazy-load Kokoro model using Hugging Face transformers (happens once per server instance)
 */
async function getKokoroTTS() {
  if (ttsInstance) return ttsInstance;

  if (modelLoading) {
    await modelLoading;
    return ttsInstance;
  }

  modelLoading = (async () => {
    try {
      // Dynamic import to load transformers library. The specifier is kept in
      // a variable so the type-checker/bundler treats it as an optional runtime
      // dependency (see optionalDependencies) rather than a build-time one.
      const transformersModule = "@huggingface/transformers";
      const transformers: any = await import(/* @vite-ignore */ transformersModule);
      const { StyleTextToSpeech2Model, AutoTokenizer } = transformers;

      const model_id = "hexgrad/Kokoro-82M";

      // Load model and tokenizer in parallel
      const [model, tokenizer] = await Promise.all([
        StyleTextToSpeech2Model.from_pretrained(model_id, {
          device: "cpu",
          dtype: "q8"
        }),
        AutoTokenizer.from_pretrained(model_id)
      ]);

      ttsInstance = { model, tokenizer };

      console.log("[Kokoro] Model loaded successfully");
    } catch (error) {
      console.error("[Kokoro] Failed to load model:", error);
      throw error;
    } finally {
      modelLoading = null;
    }
  })();

  await modelLoading;
  return ttsInstance;
}

/**
 * Generate speech from text using Kokoro
 */
export async function generateKokoroSpeech(
  text: string,
  voice: string = "af_heart"
): Promise<TTSResult> {
  // Validate voice
  const kokoroVoice = KOKORO_VOICES.includes(voice as KokoroVoice)
    ? (voice as KokoroVoice)
    : "af_heart";

  const tts = await getKokoroTTS();

  try {
    // For Node.js server-side TTS, we'd need the complete transformers implementation
    // This is a placeholder showing the expected interface
    // Consider using the browser-based implementation via Web Workers for production

    throw new Error("Server-side Kokoro TTS requires additional setup. Use the browser-based implementation via Web Workers.");
  } catch (error) {
    console.error("[Kokoro] Error generating speech:", error);
    throw error;
  }
}
