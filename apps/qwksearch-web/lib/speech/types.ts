/**
 * @fileoverview Type definitions for text-to-speech providers
 */

export type TTSProvider = "kokoro" | "deepgram";

export interface TTSOptions {
  text: string;
  provider?: TTSProvider;
  voice?: string;
}

export interface TTSResult {
  audio: ArrayBuffer;
  contentType: string;
}

// Kokoro voices from the model
export const KOKORO_VOICES = [
  "af_heart", "af_alloy", "af_aoede", "af_bella",
  "af_jessica", "af_nicole", "af_river", "af_sarah", "af_sky",
  "am_adam", "am_echo", "am_fable", "am_fenrir",
  "am_liam", "am_michael", "am_onyx"
] as const;

export type KokoroVoice = (typeof KOKORO_VOICES)[number];

// Deepgram Aura speakers
export const DEEPGRAM_SPEAKERS = [
  "angus", "asteria", "arcas", "orion", "orpheus", "athena",
  "luna", "zeus", "perseus", "helios", "hera", "stella",
] as const;

export type DeepgramSpeaker = (typeof DEEPGRAM_SPEAKERS)[number];
