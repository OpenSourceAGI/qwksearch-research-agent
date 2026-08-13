/**
 * @fileoverview Public entry point for the React layer: the read-aloud and live
 * dictation hooks, plus the centred overlay that echoes the phrase just spoken.
 */
export { useReadAloud, type UseReadAloudOptions, type UseReadAloudReturn } from "./useReadAloud";

export {
  useLiveTranscription,
  type UseLiveTranscriptionOptions,
  type UseLiveTranscriptionReturn,
} from "./useLiveTranscription";

export {
  SpokenPhraseOverlay,
  type SpokenPhraseOverlayProps,
} from "./SpokenPhraseOverlay";

export {
  ReadAloudController,
  LiveTranscriber,
  isTranscriptionSupported,
  type ReadAloudChunk,
  type ReadAloudOptions,
  type ReadAloudState,
  type LiveTranscriberOptions,
  type TranscriberEngine,
} from "../client";
