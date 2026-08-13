/**
 * @fileoverview Public entry point for the framework-agnostic browser engines:
 * read-aloud playback and live dictation. React callers should prefer the hooks in
 * `use-voice-control/react`, which wrap these.
 */
export {
  ReadAloudController,
  type ReadAloudChunk,
  type ReadAloudOptions,
  type ReadAloudState,
  type SynthesizeFn,
} from "./read-aloud";

export {
  LiveTranscriber,
  isTranscriptionSupported,
  type LiveTranscriberOptions,
  type TranscriberEngine,
} from "./live-transcriber";

export type { TTSProvider, KokoroVoice, DeepgramSpeaker } from "../types/types";
