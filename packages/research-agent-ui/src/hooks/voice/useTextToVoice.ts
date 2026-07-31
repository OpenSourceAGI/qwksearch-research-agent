/**
 * @fileoverview Hook that plays AI-generated speech via Kokoro.js (local client-side TTS) with Cloudflare
 * Workers AI TTS and browser speechSynthesis as fallbacks. Exposes `speechStatus`, `start`, and `stop`.
 * VAD-based live interruption is commented out pending a switch to @huggingface/transformers.
 */
"use client";

import { useState, useCallback, useRef } from "react";
// VAD import commented out — switching to @huggingface/transformers
// import type { MicVAD } from "@ricky0123/vad-web";
import grab from "grab-url";
import { getKokoro, preloadKokoro, getVoiceList } from "../../lib/kokoro";

type SpeechStatus = "started" | "stopped";

interface TextToSpeechOptions {
  /** Enable mic-based interruption detection while TTS is playing. Only activates if mic permission is already granted. */
  enableInterrupt?: boolean;
  /** Called with the captured speech audio (16kHz Float32Array) after the user interrupts and finishes speaking. */
  onInterrupted?: (audio: Float32Array) => void;
}

export function useTextToSpeech(text: string, options?: TextToSpeechOptions) {
  const [status, setStatus] = useState<SpeechStatus>("stopped");
  // const [wasInterrupted, setWasInterrupted] = useState(false); // VAD interruption
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  // const vadRef = useRef<MicVAD | null>(null); // VAD ref commented out
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // VAD destroy commented out — switching to @huggingface/transformers
  // const destroyVAD = useCallback(() => {
  //   if (vadRef.current) {
  //     void vadRef.current.destroy();
  //     vadRef.current = null;
  //   }
  // }, []);

  const cleanup = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      if (audioRef.current.src.startsWith("blob:")) {
        URL.revokeObjectURL(audioRef.current.src);
      }
      audioRef.current = null;
    }
    abortRef.current?.abort();
    abortRef.current = null;
    // destroyVAD(); // VAD cleanup commented out
  }, []);

  // VAD-based interruption playback commented out
  // const interruptPlayback = useCallback(() => {
  //   if (audioRef.current) {
  //     audioRef.current.pause();
  //     if (audioRef.current.src.startsWith("blob:")) {
  //       URL.revokeObjectURL(audioRef.current.src);
  //     }
  //     audioRef.current = null;
  //   }
  //   if (utteranceRef.current) {
  //     window.speechSynthesis?.cancel();
  //     utteranceRef.current = null;
  //   }
  //   abortRef.current?.abort();
  //   abortRef.current = null;
  //   setStatus("stopped");
  //   setWasInterrupted(true);
  // }, []);

  // VAD interrupt listener commented out — switching to @huggingface/transformers
  // const startInterruptListener = useCallback(async () => {
  //   if (!optionsRef.current?.enableInterrupt || vadRef.current) return;
  //   try {
  //     const perm = await navigator.permissions.query({
  //       name: "microphone" as PermissionName,
  //     });
  //     if (perm.state !== "granted") return;
  //   } catch {
  //     return;
  //   }
  //   try {
  //     const { MicVAD: MicVADClass } = await import("@ricky0123/vad-web");
  //     const vad = await MicVADClass.new({
  //       getStream: () =>
  //         navigator.mediaDevices.getUserMedia({
  //           audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  //         }),
  //       onSpeechStart: () => { interruptPlayback(); },
  //       onSpeechEnd: (audio: Float32Array) => {
  //         optionsRef.current?.onInterrupted?.(audio);
  //         destroyVAD();
  //       },
  //     });
  //     await vad.start();
  //     vadRef.current = vad;
  //   } catch (e) {
  //     console.warn("Failed to start interruption listener:", e);
  //   }
  // }, [interruptPlayback, destroyVAD]);

  const fallbackStart = useCallback(() => {
    if (!("speechSynthesis" in window)) return false;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utteranceRef.current = utterance;
      utterance.onend = () => {
        utteranceRef.current = null;
        setStatus("stopped");
        // destroyVAD(); // VAD cleanup commented out
      };
      utterance.onerror = () => {
        utteranceRef.current = null;
        setStatus("stopped");
        // destroyVAD(); // VAD cleanup commented out
      };
      window.speechSynthesis.speak(utterance);
      setStatus("started");
      // void startInterruptListener(); // VAD interrupt commented out
      return true;
    } catch {
      return false;
    }
  }, [text]);

  const start = useCallback(async () => {
    if (!text?.trim()) return;

    cleanup();
    window.speechSynthesis?.cancel();
    utteranceRef.current = null;
    setStatus("started");
    // setWasInterrupted(false); // VAD state commented out

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      // Try Kokoro.js first (client-side, no latency)
      const useKokoro = localStorage.getItem("useTTSKokoro") !== "false";
      if (useKokoro) {
        try {
          const tts = await getKokoro();
          const voice = localStorage.getItem("kokoroVoice") || "af_heart";
          const audio = await tts.generate(text.slice(0, 5000), { voice });
          const wavBytes = audio.toWav();
          const blob = new Blob([wavBytes], { type: "audio/wav" });
          const url = URL.createObjectURL(blob);
          const audioEl = new Audio(url);
          audioRef.current = audioEl;

          audioEl.onended = () => {
            setStatus("stopped");
            URL.revokeObjectURL(url);
            audioRef.current = null;
          };
          audioEl.onerror = () => {
            URL.revokeObjectURL(url);
            audioRef.current = null;
            if (!fallbackStart()) setStatus("stopped");
          };

          await audioEl.play();
          return;
        } catch (err) {
          console.debug("Kokoro TTS unavailable, using server-side TTS:", err instanceof Error ? err.message : String(err));
        }
      }

      // Fallback to server-side TTS
      const res = await grab("agent/voice", {
        method: "POST",
        body: {
          text: text.slice(0, 5000),
          voice: localStorage.getItem("kokoroVoice") || "af_heart",
        },
        signal: controller.signal,
      });

      const blob =
        typeof (res as any).blob === "function"
          ? await (res as any).blob()
          : (res as any);

      if (!blob || blob.size === 0) {
        if (!fallbackStart()) setStatus("stopped");
        return;
      }

      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        setStatus("stopped");
        URL.revokeObjectURL(url);
        audioRef.current = null;
        // destroyVAD(); // VAD cleanup commented out
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        audioRef.current = null;
        // destroyVAD(); // VAD cleanup commented out
        if (!fallbackStart()) setStatus("stopped");
      };

      await audio.play();
      // void startInterruptListener(); // VAD interrupt commented out
    } catch {
      if (!fallbackStart()) setStatus("stopped");
    }
  }, [text, cleanup, fallbackStart]);

  const stop = useCallback(() => {
    cleanup();
    utteranceRef.current = null;
    window.speechSynthesis?.cancel();
    setStatus("stopped");
    // setWasInterrupted(false); // VAD state commented out
  }, [cleanup]);

  return { speechStatus: status, start, stop };
}
