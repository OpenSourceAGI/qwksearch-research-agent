/**
 * @fileoverview Type declarations for the JavaScript chunker in `semantic-split.js`,
 * so TypeScript callers under `speech/client` can import it directly.
 */

/** Split text into TTS-sized chunks along paragraph, sentence, comma, and word boundaries. */
export function splitTextSmart(text: string, maxChunkLength?: number): string[];

/** Break a single oversized sentence down along commas, then words. */
export function splitLongSentence(sentence: string, maxLen: number): string[];
