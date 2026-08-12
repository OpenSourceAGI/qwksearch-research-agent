/**
 * @fileoverview React binding for `ReadAloudController`.
 *
 * Keeps one controller alive for the lifetime of the component, mirrors its state
 * into React state, and stops playback on unmount so navigating away never leaves
 * audio running.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  ReadAloudController,
  type ReadAloudChunk,
  type ReadAloudOptions,
  type ReadAloudState,
} from "../client/read-aloud";

export interface UseReadAloudOptions
  extends Omit<ReadAloudOptions, "onStateChange" | "onChunk"> {
  /** Called as each chunk starts playing (e.g. to highlight it in the document). */
  onChunk?: (chunk: ReadAloudChunk) => void;
}

export interface UseReadAloudReturn {
  state: ReadAloudState;
  /** True while loading, speaking, or paused. */
  isActive: boolean;
  isSpeaking: boolean;
  isPaused: boolean;
  /** The chunk currently being spoken, or `null` between utterances. */
  currentChunk: ReadAloudChunk | null;
  error: Error | null;
  speak: (text: string) => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  /** Speak `text`, or stop if something is already playing. */
  toggle: (text: string) => void;
}

export function useReadAloud(options: UseReadAloudOptions = {}): UseReadAloudReturn {
  const [state, setState] = useState<ReadAloudState>("idle");
  const [currentChunk, setCurrentChunk] = useState<ReadAloudChunk | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // Callers routinely pass inline callbacks; hold them in a ref so the controller
  // is never rebuilt mid-playback.
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const controller = useMemo(
    () =>
      new ReadAloudController({
        onStateChange: setState,
        onChunk: (chunk) => {
          setCurrentChunk(chunk);
          optionsRef.current.onChunk?.(chunk);
        },
        onEnd: (reason) => {
          setCurrentChunk(null);
          optionsRef.current.onEnd?.(reason);
        },
        onError: (err) => {
          setError(err);
          optionsRef.current.onError?.(err);
        },
      }),
    []
  );

  // Re-apply the caller's settings (voice, endpoint, …) whenever they change,
  // preserving the callback wiring above.
  useEffect(() => {
    const { onChunk, onEnd, onError, ...rest } = options;
    controller.setOptions({
      ...rest,
      onStateChange: setState,
      onChunk: (chunk) => {
        setCurrentChunk(chunk);
        optionsRef.current.onChunk?.(chunk);
      },
      onEnd: (reason) => {
        setCurrentChunk(null);
        optionsRef.current.onEnd?.(reason);
      },
      onError: (err) => {
        setError(err);
        optionsRef.current.onError?.(err);
      },
    });
  }, [
    controller,
    options.provider,
    options.voice,
    options.endpoint,
    options.maxChunkLength,
    options.synthesize,
  ]);

  useEffect(() => () => controller.stop(), [controller]);

  const speak = useCallback(
    async (text: string) => {
      setError(null);
      await controller.speak(text);
    },
    [controller]
  );

  const stop = useCallback(() => controller.stop(), [controller]);
  const pause = useCallback(() => controller.pause(), [controller]);
  const resume = useCallback(() => controller.resume(), [controller]);

  const toggle = useCallback(
    (text: string) => {
      if (controller.isActive()) {
        controller.stop();
      } else {
        void speak(text);
      }
    },
    [controller, speak]
  );

  return {
    state,
    isActive: state !== "idle",
    isSpeaking: state === "speaking",
    isPaused: state === "paused",
    currentChunk,
    error,
    speak,
    pause,
    resume,
    stop,
    toggle,
  };
}
