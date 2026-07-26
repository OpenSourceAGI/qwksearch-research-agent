/**
 * @fileoverview Client-side utilities for speech API endpoints
 * Provides high-level functions to call TTS and STT APIs
 */
import type { TTSOptions } from "../../../packages/use-voice-control/speech/types";

/**
 * Generate speech from text using the TTS API
 * @param text - Text to convert to speech
 * @param provider - TTS provider (kokoro, deepgram)
 * @param voice - Voice ID for the provider
 * @returns Audio blob with audio data
 */
export async function generateSpeechFromText(
  text: string,
  provider: "kokoro" | "deepgram" = "kokoro",
  voice?: string
): Promise<Blob> {
  const options: TTSOptions = {
    text,
    provider,
    voice,
  };

  const response = await fetch("/api/speech/tts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(options),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `TTS failed: ${response.statusText}`);
  }

  const contentType = response.headers.get("Content-Type") || "audio/wav";
  return new Blob([await response.arrayBuffer()], { type: contentType });
}

/**
 * Create an audio URL from text (convenience wrapper)
 * @param text - Text to convert to speech
 * @param provider - TTS provider
 * @param voice - Voice ID
 * @returns Object URL for audio playback
 */
export async function createAudioURL(
  text: string,
  provider: "kokoro" | "deepgram" = "kokoro",
  voice?: string
): Promise<string> {
  const blob = await generateSpeechFromText(text, provider, voice);
  return URL.createObjectURL(blob);
}

/**
 * Speak text using TTS API
 * @param text - Text to speak
 * @param provider - TTS provider
 * @param voice - Voice ID
 * @returns Promise that resolves when audio finishes playing
 */
export async function speakText(
  text: string,
  provider: "kokoro" | "deepgram" = "kokoro",
  voice?: string
): Promise<void> {
  const audioURL = await createAudioURL(text, provider, voice);
  const audio = new Audio(audioURL);

  return new Promise((resolve, reject) => {
    audio.addEventListener("ended", () => {
      URL.revokeObjectURL(audioURL);
      resolve();
    });
    audio.addEventListener("error", () => {
      URL.revokeObjectURL(audioURL);
      reject(new Error("Audio playback failed"));
    });
    audio.play().catch(reject);
  });
}

/**
 * Check STT API availability
 */
export async function checkSTTAPI(): Promise<boolean> {
  try {
    const response = await fetch("/api/speech/stt", { method: "GET" });
    return response.ok;
  } catch {
    return false;
  }
}
