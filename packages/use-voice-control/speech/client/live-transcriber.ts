/**
 * @fileoverview Browser-side live dictation engine.
 *
 * `LiveTranscriber` streams microphone audio to a recognizer and reports two kinds
 * of text: `onPartial`, the in-progress guess that keeps changing while a phrase is
 * being spoken, and `onCommit`, a phrase the recognizer has settled on. Callers use
 * the first to type text into an input as it is being said, and the second to
 * finalize it.
 *
 * Two engines are supported. The browser's own `SpeechRecognition` is preferred when
 * present because it needs no model download; otherwise the package's bundled
 * Moonshine model runs the recognition entirely on-device. Chromium's recognizer
 * stops itself after a pause, so a session that is still meant to be listening is
 * restarted automatically.
 */

export type TranscriberEngine = "auto" | "webspeech" | "moonshine";

export interface LiveTranscriberOptions {
  /** Which recognizer to use. Default `auto` (browser first, Moonshine as fallback). */
  engine?: TranscriberEngine;
  /** BCP-47 language tag for the browser recognizer. Default `en-US`. */
  language?: string;
  /** Moonshine model name. Default `model/small`. */
  model?: string;
  /** Fires continuously with the current in-progress phrase. */
  onPartial?: (text: string) => void;
  /** Fires once per phrase the recognizer has settled on. */
  onCommit?: (text: string) => void;
  /** Fires whenever the microphone starts or stops. */
  onStateChange?: (listening: boolean) => void;
  onError?: (error: Error) => void;
}

type SpeechRecognitionCtor = new () => any;

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  return (
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition ||
    null
  );
}

/** True when this browser can dictate at all (either engine). */
export function isTranscriptionSupported(): boolean {
  if (typeof window === "undefined") return false;
  if (getSpeechRecognition()) return true;
  return !!navigator.mediaDevices?.getUserMedia;
}

export class LiveTranscriber {
  private options: LiveTranscriberOptions;
  private listening = false;
  /** Distinguishes a deliberate `stop()` from Chromium's idle auto-stop. */
  private stopRequested = false;
  private recognition: any = null;
  private moonshine: any = null;

  constructor(options: LiveTranscriberOptions = {}) {
    this.options = options;
  }

  setOptions(options: LiveTranscriberOptions): void {
    this.options = options;
  }

  isListening(): boolean {
    return this.listening;
  }

  async start(): Promise<void> {
    if (this.listening) return;
    this.stopRequested = false;

    const engine = this.options.engine ?? "auto";
    const Recognition = getSpeechRecognition();

    try {
      if (engine !== "moonshine" && Recognition) {
        this.startWebSpeech(Recognition);
        return;
      }
      if (engine === "webspeech") {
        throw new Error("Speech recognition is not available in this browser");
      }
      await this.startMoonshine();
    } catch (error) {
      this.setListening(false);
      this.options.onError?.(
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  async stop(): Promise<void> {
    this.stopRequested = true;

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        /* already stopped */
      }
      this.recognition = null;
    }

    if (this.moonshine) {
      try {
        await this.moonshine.stop?.();
      } catch {
        /* already stopped */
      }
      this.moonshine = null;
    }

    this.setListening(false);
  }

  async toggle(): Promise<void> {
    if (this.listening) {
      await this.stop();
    } else {
      await this.start();
    }
  }

  private setListening(listening: boolean): void {
    if (this.listening === listening) return;
    this.listening = listening;
    this.options.onStateChange?.(listening);
  }

  private startWebSpeech(Recognition: SpeechRecognitionCtor): void {
    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = this.options.language ?? "en-US";

    recognition.onstart = () => this.setListening(true);

    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const text = String(result[0]?.transcript ?? "").trim();
        if (!text) continue;
        if (result.isFinal) {
          // No `onPartial("")` first: a commit supersedes the interim phrase, and
          // clearing it separately would make consumers that write the interim
          // into a document erase and re-insert the same words.
          this.options.onCommit?.(text);
        } else {
          interim += `${interim ? " " : ""}${text}`;
        }
      }
      if (interim) this.options.onPartial?.(interim);
    };

    recognition.onerror = (event: any) => {
      const code = event?.error;
      // `no-speech` and `aborted` are routine during a long dictation session;
      // `onend` restarts the recognizer for us.
      if (code === "no-speech" || code === "aborted") return;
      this.stopRequested = true;
      this.options.onError?.(new Error(`Speech recognition error: ${code}`));
    };

    recognition.onend = () => {
      if (this.stopRequested || this.recognition !== recognition) {
        this.recognition = null;
        this.setListening(false);
        return;
      }
      // Chromium ends the session after a pause — start a fresh one so the user
      // can keep dictating without touching the button again.
      try {
        recognition.start();
      } catch {
        this.recognition = null;
        this.setListening(false);
      }
    };

    this.recognition = recognition;
    recognition.start();
  }

  private async startMoonshine(): Promise<void> {
    const Moonshine = await import("@moonshine-ai/moonshine-js");

    const transcriber = new Moonshine.MicrophoneTranscriber(
      this.options.model ?? "model/small",
      {
        onTranscriptionUpdated: (text: string) => {
          this.options.onPartial?.(String(text ?? "").trim());
        },
        onTranscriptionCommitted: (text: string) => {
          const committed = String(text ?? "").trim();
          if (committed) this.options.onCommit?.(committed);
          else this.options.onPartial?.("");
        },
      },
      false // streaming mode
    );

    this.moonshine = transcriber;
    await transcriber.start();
    if (this.stopRequested) {
      await this.stop();
      return;
    }
    this.setListening(true);
  }
}
