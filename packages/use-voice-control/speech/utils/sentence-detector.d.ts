/**
 * @fileoverview Type declarations for the JavaScript helpers in `sentence-detector.js`,
 * so TypeScript callers under `speech/client` can import it directly.
 */

/** True when the text reads as a finished sentence (or is long enough to speak anyway). */
export function isCompleteSentence(text: string): boolean;

/** Split an accumulator + new chunk into speakable sentences plus the leftover remainder. */
export function processStreamingText(
  accumulator: string,
  newContent: string
): { sentences: string[]; remainder: string };
