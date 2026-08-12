/**
 * @fileoverview React binding for `LiveTranscriber`.
 *
 * Exposes the two streams a dictation UI needs: `partial`, which changes on every
 * word while a phrase is in progress, and the committed phrases delivered through
 * `onCommit`. `lastPhrase` carries whatever was most recently heard — partial or
 * committed — along with a monotonically increasing `phraseId` so a display can
 * re-trigger its own timeout even when the same words are said twice in a row.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  LiveTranscriber,
  isTranscriptionSupported,
  type LiveTranscriberOptions,
} from "../client/live-transcriber";

export interface UseLiveTranscriptionOptions
  extends Omit<LiveTranscriberOptions, "onStateChange"> {}

export interface UseLiveTranscriptionReturn {
  isListening: boolean;
  /** True when this browser can dictate at all. */
  isSupported: boolean;
  /** The in-progress phrase, updating as it is spoken. Empty between phrases. */
  partial: string;
  /** The most recent thing heard, partial or committed. */
  lastPhrase: string;
  /** Increments on every `lastPhrase` update, including repeats of the same words. */
  phraseId: number;
  error: Error | null;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  toggle: () => Promise<void>;
}

export function useLiveTranscription(
  options: UseLiveTranscriptionOptions = {}
): UseLiveTranscriptionReturn {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [partial, setPartial] = useState("");
  const [lastPhrase, setLastPhrase] = useState("");
  const [phraseId, setPhraseId] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Support depends on `window`, so it can only be settled after hydration.
  useEffect(() => setIsSupported(isTranscriptionSupported()), []);

  const transcriber = useMemo(
    () =>
      new LiveTranscriber({
        onStateChange: setIsListening,
        onPartial: (text) => {
          setPartial(text);
          if (text) {
            setLastPhrase(text);
            setPhraseId((id) => id + 1);
          }
          optionsRef.current.onPartial?.(text);
        },
        onCommit: (text) => {
          setPartial("");
          setLastPhrase(text);
          setPhraseId((id) => id + 1);
          optionsRef.current.onCommit?.(text);
        },
        onError: (err) => {
          setError(err);
          optionsRef.current.onError?.(err);
        },
      }),
    []
  );

  // Engine/language changes take effect on the next `start()`.
  useEffect(() => {
    transcriber.setOptions({
      engine: options.engine,
      language: options.language,
      model: options.model,
      onStateChange: setIsListening,
      onPartial: (text) => {
        setPartial(text);
        if (text) {
          setLastPhrase(text);
          setPhraseId((id) => id + 1);
        }
        optionsRef.current.onPartial?.(text);
      },
      onCommit: (text) => {
        setPartial("");
        setLastPhrase(text);
        setPhraseId((id) => id + 1);
        optionsRef.current.onCommit?.(text);
      },
      onError: (err) => {
        setError(err);
        optionsRef.current.onError?.(err);
      },
    });
  }, [transcriber, options.engine, options.language, options.model]);

  useEffect(() => {
    return () => {
      void transcriber.stop();
    };
  }, [transcriber]);

  const start = useCallback(async () => {
    setError(null);
    await transcriber.start();
  }, [transcriber]);

  const stop = useCallback(async () => {
    await transcriber.stop();
    setPartial("");
  }, [transcriber]);

  const toggle = useCallback(async () => {
    if (transcriber.isListening()) {
      await stop();
    } else {
      await start();
    }
  }, [transcriber, start, stop]);

  return {
    isListening,
    isSupported,
    partial,
    lastPhrase,
    phraseId,
    error,
    start,
    stop,
    toggle,
  };
}
