/**
 * `extract-youtube@1.0.256` ships no `.d.ts` — its published tarball carries
 * `dist/index.mjs` and `dist/index.cjs` but neither the declarations its
 * `exports.types` points at nor `dist/react/`. Until a release fixes that, this
 * declares the surface `worker/qwksearch/extract.ts` actually uses, so the PDF
 * and transcript tiers type-check instead of resolving to `any`.
 *
 * Source of truth is the repo-root `packages/extract-youtube/src`; keep this in sync
 * with it, and delete the file once a published version ships declarations.
 */
declare module 'extract-youtube' {
  /** One caption cue. */
  export interface FetchedTranscriptSnippet {
    /** Seconds the cue stays on screen. */
    duration: number;
    /** Seconds from the start of the video. */
    start: number;
    text: string;
  }

  export interface FetchTranscriptOptions {
    /** Preferred language codes, most preferred first. Defaults to `['en']`. */
    languages?: string[];
    preserveFormatting?: boolean;
  }

  export interface FetchedTranscript {
    isGenerated: boolean;
    language: string;
    languageCode: string;
    snippets: FetchedTranscriptSnippet[];
    videoId: string;
  }

  export class YouTubeTranscriptApi {
    constructor(options?: { httpClient?: unknown; proxyConfig?: unknown });

    fetchTranscript(videoId: string, options?: FetchTranscriptOptions): Promise<FetchedTranscript>;

    /** @deprecated Alias for {@link fetchTranscript}. */
    fetch(videoId: string, options?: FetchTranscriptOptions): Promise<FetchedTranscript>;
  }
}
