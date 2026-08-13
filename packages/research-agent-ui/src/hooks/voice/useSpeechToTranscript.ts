/**
 * @fileoverview Hook providing `toggleSpeech` for voice input.
 *
 * Dictation runs through `use-voice-control`'s shared `LiveTranscriber`, which
 * streams the recognizer's in-progress guess through `onPartial` and each settled
 * phrase through `onTranscript` — so the composer can type words into the input as
 * they are being said instead of waiting for the speaker to stop. Browsers without
 * a native recognizer (Firefox) keep the previous behaviour: record with
 * MediaRecorder and transcribe server-side once, which yields no partials.
 *
 * Exposes `isListening`, `isSpeechSupported`, and the `lastPhrase`/`phraseId` pair
 * that the on-screen phrase display reads. Global Ctrl+` toggles listening while
 * the hook is mounted.
 */
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
import grab from "grab-url";
import { LiveTranscriber } from "use-voice-control/client";

export interface SpeechInputOptions {
  /** The in-progress phrase, replacing whatever was reported before it. */
  onPartial?: (text: string) => void;
  /** BCP-47 language tag for the browser recognizer. */
  language?: string;
}

export interface SpeechInputReturn {
  isListening: boolean;
  toggleSpeech: () => Promise<void>;
  isSpeechSupported: boolean;
  /** The phrase currently being spoken; empty between phrases. */
  partial: string;
  /** The most recent thing heard, partial or settled. */
  lastPhrase: string;
  /** Increments on every `lastPhrase` update, repeats included. */
  phraseId: number;
}

function hasNativeRecognizer(): boolean {
  if (typeof window === "undefined") return false;
  return !!(
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  );
}

export function useSpeechInput(
  /** Called once per settled phrase — append it, do not replace the input. */
  onTranscript: (transcript: string) => void,
  onEnd: () => void,
  options: SpeechInputOptions = {},
): SpeechInputReturn {
  const [isListening, setIsListening] = useState(false);
  const [partial, setPartial] = useState("");
  const [lastPhrase, setLastPhrase] = useState("");
  const [phraseId, setPhraseId] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  // Callers pass inline closures; hold them in a ref so the transcriber is built
  // once rather than on every render.
  const callbacksRef = useRef({ onTranscript, onEnd, onPartial: options.onPartial });
  callbacksRef.current = { onTranscript, onEnd, onPartial: options.onPartial };

  const transcriber = useMemo(
    () =>
      new LiveTranscriber({
        // Pinned to the browser's own recognizer: the MediaRecorder path below
        // already covers browsers without one, and it does not make the user
        // wait on a model download.
        engine: "webspeech",
        language: options.language ?? "en-US",
        onStateChange: setIsListening,
        onPartial: (text) => {
          setPartial(text);
          if (text) {
            setLastPhrase(text);
            setPhraseId((id) => id + 1);
          }
          callbacksRef.current.onPartial?.(text);
        },
        onCommit: (text) => {
          setPartial("");
          setLastPhrase(text);
          setPhraseId((id) => id + 1);
          callbacksRef.current.onTranscript(text);
        },
        onError: () => {
          toast.error("Speech recognition stopped unexpectedly.");
        },
      }),
    [options.language],
  );

  const stopFallbackRecorder = useCallback(() => {
    const mediaRecorder = mediaRecorderRef.current;
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
      return;
    }
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    mediaRecorderRef.current = null;
  }, []);

  const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
    const formData = new FormData();
    formData.append("file", audioBlob, "speech-input.webm");
    formData.append("languageCode", "en");

    const data = await grab("agent/transcript", {
      method: "POST",
      body: formData,
    });
    return (data?.text ?? "").trim();
  };

  const startFallbackRecording = useCallback(async () => {
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      toast.error("Speech input is not supported in this browser", {
        duration: 5000,
      });
      setIsListening(false);
      callbacksRef.current.onEnd();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstart = () => {
        setIsListening(true);
      };

      recorder.onstop = async () => {
        try {
          const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
          chunksRef.current = [];
          mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
          mediaStreamRef.current = null;
          mediaRecorderRef.current = null;
          setIsListening(false);

          if (audioBlob.size === 0) return;

          const transcript = await transcribeAudio(audioBlob);
          if (transcript) {
            setLastPhrase(transcript);
            setPhraseId((id) => id + 1);
            callbacksRef.current.onTranscript(transcript);
          } else {
            toast.error("No speech detected. Please try again.");
          }
        } catch {
          toast.error("Unable to transcribe audio.");
        } finally {
          callbacksRef.current.onEnd();
        }
      };

      recorder.start();
    } catch {
      toast.error("Microphone access is required for speech input.");
      setIsListening(false);
      callbacksRef.current.onEnd();
    }
  }, []);

  const toggleSpeech = useCallback(async () => {
    if (transcriber.isListening()) {
      await transcriber.stop();
      setPartial("");
      callbacksRef.current.onEnd();
      return;
    }

    if (mediaRecorderRef.current) {
      stopFallbackRecorder();
      return;
    }

    if (hasNativeRecognizer()) {
      await transcriber.start();
      return;
    }

    await startFallbackRecording();
  }, [transcriber, startFallbackRecording, stopFallbackRecorder]);

  // Global Ctrl+` shortcut for the mic.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "`") {
        e.preventDefault();
        void toggleSpeech();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggleSpeech]);

  useEffect(() => {
    return () => {
      void transcriber.stop();
      stopFallbackRecorder();
    };
  }, [transcriber, stopFallbackRecorder]);

  const hasFallbackSupport =
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== "undefined";

  return {
    isListening,
    toggleSpeech,
    isSpeechSupported: hasNativeRecognizer() || hasFallbackSupport,
    partial,
    lastPhrase,
    phraseId,
  };
}
