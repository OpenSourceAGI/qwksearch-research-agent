/**
 * @fileoverview Browser-side "read aloud" playback engine.
 *
 * `ReadAloudController` takes a block of text, chunks it along sentence/paragraph
 * boundaries with `splitTextSmart`, synthesizes each chunk (Kokoro by default, via
 * the package's `/api/speech/tts` route) and plays the chunks back-to-back while
 * pre-fetching the next one, so playback starts after the first short chunk rather
 * than after the whole document. Pause/resume/stop are supported throughout, and
 * each chunk is reported to `onChunk` so callers can highlight what is being spoken.
 *
 * When no TTS endpoint is reachable — a host app that has not mounted the route, or
 * an offline build — the controller falls back to the browser's built-in
 * `speechSynthesis` rather than failing, so the feature still works everywhere.
 */
import type { TTSProvider } from "../types/types";
import { splitTextSmart } from "../utils/semantic-split.js";

export type ReadAloudState = "idle" | "loading" | "speaking" | "paused";

export interface ReadAloudChunk {
  /** The text of the chunk currently being spoken. */
  text: string;
  /** Zero-based position of this chunk in the queue. */
  index: number;
  /** Total number of chunks queued for this utterance. */
  total: number;
}

/** Turns a chunk of text into playable audio. Return `null` to defer to `speechSynthesis`. */
export type SynthesizeFn = (
  text: string,
  signal: AbortSignal
) => Promise<Blob | null>;

export interface ReadAloudOptions {
  /** TTS provider passed to the endpoint. Default `kokoro`. */
  provider?: TTSProvider;
  /** Provider-specific voice id. Default `af_heart`. */
  voice?: string;
  /** HTTP route that synthesizes text. Default `/api/speech/tts`. */
  endpoint?: string;
  /**
   * Target chunk size in characters. Smaller starts talking sooner but makes the
   * seams between chunks more audible. Default 240.
   */
  maxChunkLength?: number;
  /** Override synthesis entirely (tests, a bring-your-own-TTS host app). */
  synthesize?: SynthesizeFn;
  /** Called as each chunk starts playing. */
  onChunk?: (chunk: ReadAloudChunk) => void;
  /** Called on every state transition. */
  onStateChange?: (state: ReadAloudState) => void;
  /** Called when playback ends, either by running out of chunks or by `stop()`. */
  onEnd?: (reason: "finished" | "stopped") => void;
  /** Called when synthesis or playback fails irrecoverably. */
  onError?: (error: Error) => void;
}

const DEFAULT_ENDPOINT = "/api/speech/tts";
const DEFAULT_VOICE = "af_heart";
const DEFAULT_MAX_CHUNK = 240;

/** Resolves once `signal` aborts. Used to race playback against `stop()`. */
function abortPromise(signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.resolve();
  return new Promise((resolve) => {
    signal.addEventListener("abort", () => resolve(), { once: true });
  });
}

export class ReadAloudController {
  private options: ReadAloudOptions;
  private state: ReadAloudState = "idle";
  private abortController: AbortController | null = null;
  private audio: HTMLAudioElement | null = null;
  private objectUrl: string | null = null;
  /** Set once the endpoint has proved unreachable, so later chunks skip the retry. */
  private endpointUnavailable = false;

  constructor(options: ReadAloudOptions = {}) {
    this.options = options;
  }

  /** Replace the options (voice, callbacks, …) without discarding playback state. */
  setOptions(options: ReadAloudOptions): void {
    this.options = options;
  }

  getState(): ReadAloudState {
    return this.state;
  }

  isActive(): boolean {
    return this.state === "speaking" || this.state === "paused" || this.state === "loading";
  }

  /**
   * Speak `text`, cancelling anything already playing. Resolves when playback
   * finishes or is stopped — it never rejects; failures go to `onError`.
   */
  async speak(text: string): Promise<void> {
    this.stop();

    const maxChunkLength = this.options.maxChunkLength ?? DEFAULT_MAX_CHUNK;
    const chunks = splitTextSmart(text ?? "", maxChunkLength)
      .map((chunk) => chunk.trim())
      .filter((chunk) => chunk.length > 0);

    if (chunks.length === 0) return;

    const abortController = new AbortController();
    this.abortController = abortController;
    const { signal } = abortController;
    this.setState("loading");

    try {
      // Kick off the first chunk, then always keep exactly one chunk in flight
      // ahead of the one playing.
      let upcoming = this.synthesize(chunks[0], signal);

      for (let index = 0; index < chunks.length; index += 1) {
        const current = upcoming;
        upcoming =
          index + 1 < chunks.length
            ? this.synthesize(chunks[index + 1], signal)
            : Promise.resolve(null);

        const blob = await current;
        if (signal.aborted) return;

        // Announce the state before the chunk so a listener reacting to
        // `onChunk` sees the controller already speaking.
        this.setState("speaking");
        this.options.onChunk?.({ text: chunks[index], index, total: chunks.length });
        if (signal.aborted) return;
        await this.playChunk(blob, chunks[index], signal);
        if (signal.aborted) return;
      }

      this.cleanup();
      this.setState("idle");
      this.options.onEnd?.("finished");
    } catch (error) {
      if (signal.aborted) return;
      this.cleanup();
      this.setState("idle");
      this.options.onError?.(
        error instanceof Error ? error : new Error(String(error))
      );
      this.options.onEnd?.("stopped");
    } finally {
      if (this.abortController === abortController) {
        this.abortController = null;
      }
    }
  }

  pause(): void {
    if (this.state !== "speaking") return;
    if (this.audio) {
      this.audio.pause();
    } else if (typeof speechSynthesis !== "undefined") {
      speechSynthesis.pause();
    }
    this.setState("paused");
  }

  resume(): void {
    if (this.state !== "paused") return;
    if (this.audio) {
      void this.audio.play().catch(() => undefined);
    } else if (typeof speechSynthesis !== "undefined") {
      speechSynthesis.resume();
    }
    this.setState("speaking");
  }

  /** Stop playback and drop any queued chunks. Safe to call when already idle. */
  stop(): void {
    const wasActive = this.isActive();
    this.abortController?.abort();
    this.abortController = null;
    this.cleanup();
    if (wasActive) {
      this.setState("idle");
      this.options.onEnd?.("stopped");
    }
  }

  private setState(state: ReadAloudState): void {
    if (this.state === state) return;
    this.state = state;
    this.options.onStateChange?.(state);
  }

  private cleanup(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.src = "";
      this.audio = null;
    }
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
    if (typeof speechSynthesis !== "undefined") {
      speechSynthesis.cancel();
    }
  }

  private synthesize(text: string, signal: AbortSignal): Promise<Blob | null> {
    const promise = this.options.synthesize
      ? this.options.synthesize(text, signal)
      : this.fetchAudio(text, signal);
    // Pre-fetched chunks are awaited a beat later; mark them handled now so a
    // stop() mid-flight does not surface as an unhandled rejection.
    promise.catch(() => undefined);
    return promise;
  }

  private async fetchAudio(text: string, signal: AbortSignal): Promise<Blob | null> {
    if (this.endpointUnavailable) return null;

    const endpoint = this.options.endpoint ?? DEFAULT_ENDPOINT;
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          provider: this.options.provider ?? "kokoro",
          voice: this.options.voice ?? DEFAULT_VOICE,
        }),
        signal,
      });

      if (!response.ok) throw new Error(`TTS failed: ${response.status}`);

      const contentType = response.headers.get("Content-Type") || "audio/wav";
      return new Blob([await response.arrayBuffer()], { type: contentType });
    } catch (error) {
      if (signal.aborted) throw error;
      // No usable endpoint in this host app — remember it and let every
      // remaining chunk go straight to the browser's own synthesizer.
      this.endpointUnavailable = true;
      return null;
    }
  }

  private playChunk(
    blob: Blob | null,
    text: string,
    signal: AbortSignal
  ): Promise<void> {
    return blob
      ? this.playAudioBlob(blob, signal)
      : this.playWithSpeechSynthesis(text, signal);
  }

  private async playAudioBlob(blob: Blob, signal: AbortSignal): Promise<void> {
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    this.audio = audio;
    this.objectUrl = url;

    const finished = new Promise<void>((resolve, reject) => {
      audio.addEventListener("ended", () => resolve(), { once: true });
      audio.addEventListener(
        "error",
        () => reject(new Error("Audio playback failed")),
        { once: true }
      );
    });

    try {
      await audio.play();
      await Promise.race([finished, abortPromise(signal)]);
    } finally {
      if (this.audio === audio) this.audio = null;
      if (this.objectUrl === url) this.objectUrl = null;
      audio.pause();
      URL.revokeObjectURL(url);
    }
  }

  private async playWithSpeechSynthesis(
    text: string,
    signal: AbortSignal
  ): Promise<void> {
    if (typeof speechSynthesis === "undefined" || typeof SpeechSynthesisUtterance === "undefined") {
      throw new Error("No speech synthesis available in this browser");
    }

    const utterance = new SpeechSynthesisUtterance(text);
    const finished = new Promise<void>((resolve, reject) => {
      utterance.onend = () => resolve();
      // `cancel()` fires an error event; a stop is not a failure.
      utterance.onerror = () =>
        signal.aborted ? resolve() : reject(new Error("Speech synthesis failed"));
    });

    speechSynthesis.speak(utterance);
    await Promise.race([finished, abortPromise(signal)]);
  }
}
