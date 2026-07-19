/**
 * @fileoverview FetchedTranscript model representing a complete transcript with all snippets
 */

import { FetchedTranscriptSnippet } from '../types';

/**
 * Represents a fetched transcript with all its snippets and metadata.
 * This class is iterable, allowing you to iterate over transcript snippets.
 *
 * @example
 * ```typescript
 * const transcript = await api.fetch('video_id');
 * for (const snippet of transcript) {
 *   console.log(snippet.text);
 * }
 * ```
 */
export class FetchedTranscript implements Iterable<FetchedTranscriptSnippet> {
  /** Array of transcript snippets */
  public readonly snippets: FetchedTranscriptSnippet[];

  /** The video ID this transcript belongs to */
  public readonly videoId: string;

  /** The language name (e.g., "English") */
  public readonly language: string;

  /** The language code (e.g., "en") */
  public readonly languageCode: string;

  /** Whether this transcript was automatically generated */
  public readonly isGenerated: boolean;

  /**
   * Creates a new FetchedTranscript instance.
   *
   * @param {FetchedTranscriptSnippet[]} snippets - Array of transcript snippets
   * @param {string} videoId - The video ID
   * @param {string} language - The language name
   * @param {string} languageCode - The language code
   * @param {boolean} isGenerated - Whether the transcript is auto-generated
   */
  constructor(
    snippets: FetchedTranscriptSnippet[],
    videoId: string,
    language: string,
    languageCode: string,
    isGenerated: boolean
  ) {
    this.snippets = snippets;
    this.videoId = videoId;
    this.language = language;
    this.languageCode = languageCode;
    this.isGenerated = isGenerated;
  }

  /**
   * Makes the transcript iterable, allowing for...of loops.
   *
   * @returns {Iterator<FetchedTranscriptSnippet>} Iterator over the snippets
   */
  [Symbol.iterator](): Iterator<FetchedTranscriptSnippet> {
    return this.snippets[Symbol.iterator]();
  }

  /**
   * Gets a snippet by index.
   *
   * @param {number} index - The index of the snippet
   * @returns {FetchedTranscriptSnippet} The snippet at the given index
   */
  getSnippetAtIndex(index: number): FetchedTranscriptSnippet {
    return this.snippets[index];
  }

  /**
   * Alias for getSnippetAtIndex() for backward compatibility.
   *
   * @deprecated Use getSnippetAtIndex() instead
   * @param {number} index - The index of the snippet
   * @returns {FetchedTranscriptSnippet} The snippet at the given index
   */
  get(index: number): FetchedTranscriptSnippet {
    return this.getSnippetAtIndex(index);
  }

  /**
   * Gets the total number of snippets in the transcript.
   *
   * @returns {number} The number of snippets
   */
  get length(): number {
    return this.snippets.length;
  }

  /**
   * Converts the transcript to raw data format (array of objects).
   * This is useful for serialization or when you need plain data objects.
   *
   * @returns {Array<{text: string, start: number, duration: number}>} Raw transcript data
   */
  toRawData(): Array<{ text: string; start: number; duration: number }> {
    return this.snippets.map(snippet => ({
      text: snippet.text,
      start: snippet.start,
      duration: snippet.duration
    }));
  }
}
