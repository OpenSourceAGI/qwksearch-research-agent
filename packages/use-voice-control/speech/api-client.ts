/**
 * @fileoverview Browser-side helper functions for calling the package's TTS/STT HTTP API routes.
 *
 * Provides `generateSpeechFromText`/`createAudioURL`/`speakText` for turning text into
 * playable audio via `POST /api/speech/tts`, and `checkSTTAPI` to probe availability of
 * `/api/speech/stt`.
 */
import type { TTSOptions } from "./types/types";

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

export async function createAudioURL(
  text: string,
  provider: "kokoro" | "deepgram" = "kokoro",
  voice?: string
): Promise<string> {
  const blob = await generateSpeechFromText(text, provider, voice);
  return URL.createObjectURL(blob);
}

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

export async function checkSTTAPI(): Promise<boolean> {
  try {
    const response = await fetch("/api/speech/stt", { method: "GET" });
    return response.ok;
  } catch {
    return false;
  }
}
