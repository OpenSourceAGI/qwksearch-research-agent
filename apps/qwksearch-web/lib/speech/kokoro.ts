/**
 * @fileoverview Kokoro TTS provider implementation using kokoro-js
 * Runs on Node.js CPU, faster and more natural than Deepgram Aura
 */
import type { TTSResult } from "./types";
import { KOKORO_VOICES, type KokoroVoice } from "./types";

let ttsInstance: any = null;
let modelLoading: Promise<any> | null = null;

/**
 * Lazy-load Kokoro model (happens once per server instance)
 */
async function getKokoroTTS() {
  if (ttsInstance) return ttsInstance;

  if (modelLoading) {
    await modelLoading;
    return ttsInstance;
  }

  modelLoading = (async () => {
    try {
      const { KokoroTTS } = await import("kokoro-js");

      ttsInstance = await KokoroTTS.from_pretrained(
        "onnx-community/Kokoro-82M-v1.0-ONNX",
        {
          dtype: "q8",
          device: "cpu"
        }
      );

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

  // Generate audio
  const audio = await tts.generate(text, { voice: kokoroVoice });

  // Convert to WAV bytes
  const wavBuffer = audio.toWav();

  return {
    audio: wavBuffer,
    contentType: "audio/wav",
  };
}
