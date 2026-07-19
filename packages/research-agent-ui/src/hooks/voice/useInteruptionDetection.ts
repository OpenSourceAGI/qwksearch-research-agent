/**
 * Hook that uses Silero VAD (via @huggingface/transformers, currently disabled) to detect speech and silence
 * boundaries for live turn-end interruption during TTS playback.
 * The pipeline and all VAD processing are commented out pending the library switch.
 */
import { useState, useEffect, useRef, useCallback } from "react";
// HuggingFace transformers commented out for now
// import { pipeline, env } from "@huggingface/transformers";

// Single-threaded WASM for browser / Cloudflare Workers compatibility
// env.backends.onnx.wasm.numThreads = 1;
// env.allowRemoteModels = true;

/** Sample rate expected by Silero VAD. */
const TARGET_RATE = 16000;

/** PCM chunk size fed to the VAD (~32 ms at 16 kHz). */
const CHUNK_SIZE = 512;

/** Probability threshold above which a chunk is classified as speech. */
const SPEECH_THRESHOLD = 0.5;

/** Cap speech segments at 8 s to avoid memory growth. */
const MAX_SAMPLES = 8 * TARGET_RATE;

/**
 * Number of consecutive silent chunks required before declaring the turn done
 * (~0.5 s of silence at 32 ms / chunk).
 */
const SILENCE_CHUNKS_THRESHOLD = 15;

// HuggingFace pipeline type commented out
// type VADPipeline = Awaited<ReturnType<typeof pipeline>>;
type VADPipeline = any;

/** Module-level singleton — loaded once, reused across hook instances. */
let _vadPipeline: VADPipeline | null = null;

/** Lazily initialise the Silero VAD audio-classification pipeline. */
async function loadVAD(): Promise<VADPipeline> {
  if (_vadPipeline) return _vadPipeline;
  // HuggingFace pipeline commented out
  // _vadPipeline = await pipeline(
  //   "audio-classification",
  //   "snakers4/silero-vad",
  //   { device: "wasm" },
  // );
  throw new Error("VAD pipeline not available — @huggingface/transformers is commented out");
}

/**
 * React hook combining Silero VAD (via @huggingface/transformers) with
 * turn-done detection based on sustained silence after speech ends.
 *
 * Usage:
 *   const { isListening, isSpeaking, isTurnDone, lastSpeechSegment, start, stop }
 *     = useSileroSmartTurn();
 */
export function useSileroSmartTurn() {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isTurnDone, setIsTurnDone] = useState(false);
  const [lastSpeechSegment, setLastSpeechSegment] =
    useState<Float32Array | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const vadRef = useRef<VADPipeline | null>(null);
  const speechBufRef = useRef<Float32Array[]>([]);
  const isSpeakingRef = useRef(false);
  const silenceCountRef = useRef(0);
  const activeRef = useRef(false);

  useEffect(() => {
    return () => {
      activeRef.current = false;
      _cleanup();
    };
  }, []);

  const _cleanup = useCallback(() => {
    processorRef.current?.disconnect();
    sourceRef.current?.disconnect();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    audioCtxRef.current?.close();
    processorRef.current = null;
    sourceRef.current = null;
    streamRef.current = null;
    audioCtxRef.current = null;
  }, []);

  const start = useCallback(async () => {
    if (audioCtxRef.current) return; // already running
    activeRef.current = true;
    setIsSpeaking(false);
    setIsTurnDone(false);

    try {
      const vad = await loadVAD();
      vadRef.current = vad;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      const ctx = new AudioContext({ sampleRate: TARGET_RATE });
      audioCtxRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      sourceRef.current = source;

      // ScriptProcessorNode provides raw PCM Float32 chunks from the mic.
      const processor = ctx.createScriptProcessor(CHUNK_SIZE, 1, 1);
      processorRef.current = processor;

      speechBufRef.current = [];
      isSpeakingRef.current = false;
      silenceCountRef.current = 0;

      processor.onaudioprocess = async (event) => {
        if (!activeRef.current) return;

        const chunk = new Float32Array(event.inputBuffer.getChannelData(0));

        let result: any;
        try {
          result = await (vadRef.current as any)(chunk, {
            sampling_rate: TARGET_RATE,
          });
        } catch {
          return;
        }

        const speechDetected =
          Array.isArray(result) &&
          result[0]?.label === "speech" &&
          result[0]?.score > SPEECH_THRESHOLD;

        if (speechDetected) {
          silenceCountRef.current = 0;
          if (!isSpeakingRef.current) {
            isSpeakingRef.current = true;
            speechBufRef.current = [];
            setIsSpeaking(true);
            setIsTurnDone(false);
          }
          speechBufRef.current.push(chunk);
        } else if (isSpeakingRef.current) {
          // Accumulate a small silence tail before declaring end of turn.
          silenceCountRef.current++;
          speechBufRef.current.push(chunk);

          if (silenceCountRef.current >= SILENCE_CHUNKS_THRESHOLD) {
            isSpeakingRef.current = false;
            setIsSpeaking(false);

            // Merge all chunks into one contiguous segment (capped at MAX_SAMPLES).
            const totalLen = speechBufRef.current.reduce(
              (s, c) => s + c.length,
              0,
            );
            const segLen = Math.min(totalLen, MAX_SAMPLES);
            const segment = new Float32Array(segLen);
            let offset = 0;
            for (const c of speechBufRef.current) {
              if (offset >= segLen) break;
              const take = Math.min(c.length, segLen - offset);
              segment.set(c.subarray(0, take), offset);
              offset += take;
            }

            speechBufRef.current = [];
            silenceCountRef.current = 0;
            setLastSpeechSegment(segment);
            setIsTurnDone(true);
          }
        }
      };

      source.connect(processor);
      processor.connect(ctx.destination);
      setIsListening(true);
    } catch (err) {
      console.error("Failed to start Silero VAD:", err);
      _cleanup();
    }
  }, [_cleanup]);

  const stop = useCallback(() => {
    activeRef.current = false;
    _cleanup();
    setIsListening(false);
    setIsSpeaking(false);
    setIsTurnDone(false);
    setLastSpeechSegment(null);
  }, [_cleanup]);

  return { isListening, isSpeaking, isTurnDone, lastSpeechSegment, start, stop };
}
