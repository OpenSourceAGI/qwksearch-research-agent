/**
 * @fileoverview Transcript model representing a single transcript that can be fetched or translated
 */

import { HttpClient, TranslationLanguage } from '../types';
import { NotTranslatable, TranslationLanguageNotAvailable, PoTokenRequired } from '../errors';
import { FetchedTranscript } from './fetched-transcript';
import { TranscriptParser } from '../parsers/transcript-parser';
import { handleHttpErrors } from '../utils/http-error-handler';

/**
 * Represents a transcript that can be fetched or translated.
 * You typically obtain Transcript objects from a TranscriptList.
 *
 * @example
 * ```typescript
 * const transcriptList = await api.list('video_id');
 * const transcript = transcriptList.findTranscript(['en']);
 * const fetched = await transcript.fetch();
 * ```
 */
export class Transcript {
  private httpClient: HttpClient;

  /** The video ID this transcript belongs to */
  public readonly videoId: string;

  private transcriptUrl: string;

  /** The language name (e.g., "English") */
  public readonly language: string;

  /** The language code (e.g., "en") */
  public readonly languageCode: string;

  /** Whether this transcript was automatically generated */
  public readonly isGenerated: boolean;

  /** Available translation languages */
  public readonly translationLanguages: TranslationLanguage[];

  private translationLanguagesMap: Record<string, string>;

  /**
   * Creates a new Transcript instance.
   * You probably don't want to initialize this directly.
   * Usually you'll access Transcript objects using a TranscriptList.
   *
   * @param {HttpClient} httpClient - HTTP client for making requests
   * @param {string} videoId - The video ID
   * @param {string} transcriptUrl - The transcript URL
   * @param {string} language - The language name
   * @param {string} languageCode - The language code
   * @param {boolean} isGenerated - Whether the transcript is auto-generated
   * @param {TranslationLanguage[]} translationLanguages - Available translation languages
   */
  constructor(
    httpClient: HttpClient,
    videoId: string,
    transcriptUrl: string,
    language: string,
    languageCode: string,
    isGenerated: boolean,
    translationLanguages: TranslationLanguage[]
  ) {
    this.httpClient = httpClient;
    this.videoId = videoId;
    this.transcriptUrl = transcriptUrl;
    this.language = language;
    this.languageCode = languageCode;
    this.isGenerated = isGenerated;
    this.translationLanguages = translationLanguages;
    this.translationLanguagesMap = this.buildTranslationLanguagesMap(translationLanguages);
  }

  /**
   * Builds a map of language codes to language names for quick lookup.
   *
   * @private
   * @param {TranslationLanguage[]} languages - Array of translation languages
   * @returns {Record<string, string>} Map of language code to language name
   */
  private buildTranslationLanguagesMap(languages: TranslationLanguage[]): Record<string, string> {
    const map: Record<string, string> = {};
    for (const lang of languages) {
      map[lang.language_code] = lang.language;
    }
    return map;
  }

  /**
   * Loads the actual transcript data from YouTube.
   *
   * @param {boolean} [preserveFormatting=false] - Whether to keep select HTML text formatting
   * @returns {Promise<FetchedTranscript>} The fetched transcript with all snippets
   * @throws {PoTokenRequired} If a PO Token is required for this video
   * @throws {YouTubeRequestFailed} If the HTTP request fails
   *
   * @example
   * ```typescript
   * const transcript = transcriptList.findTranscript(['en']);
   * const fetched = await transcript.fetch();
   *
   * // With formatting preserved
   * const fetchedWithFormatting = await transcript.fetch(true);
   * ```
   */
  async fetch(preserveFormatting: boolean = false): Promise<FetchedTranscript> {
    if (this.transcriptUrl.includes('&exp=xpe')) {
      throw new PoTokenRequired(this.videoId);
    }

    const response = await this.httpClient.get(this.transcriptUrl);
    handleHttpErrors(response, this.videoId);

    const xmlData = await response.text();
    const parser = new TranscriptParser(preserveFormatting);
    const snippets = parser.parseTranscriptXml(xmlData);

    return new FetchedTranscript(
      snippets,
      this.videoId,
      this.language,
      this.languageCode,
      this.isGenerated
    );
  }

  /**
   * Checks whether this transcript can be translated to other languages.
   *
   * @returns {boolean} True if the transcript supports translation
   */
  get isTranslatable(): boolean {
    return this.translationLanguages.length > 0;
  }

  /**
   * Creates a translated version of this transcript.
   *
   * @param {string} targetLanguageCode - The target language code (e.g., 'de', 'fr')
   * @returns {Transcript} A new Transcript object for the translated transcript
   * @throws {NotTranslatable} If the transcript cannot be translated
   * @throws {TranslationLanguageNotAvailable} If the requested language is not available
   *
   * @example
   * ```typescript
   * const englishTranscript = transcriptList.findTranscript(['en']);
   * if (englishTranscript.isTranslatable) {
   *   const germanTranscript = englishTranscript.translate('de');
   *   const fetched = await germanTranscript.fetch();
   * }
   * ```
   */
  translate(targetLanguageCode: string): Transcript {
    if (!this.isTranslatable) {
      throw new NotTranslatable(this.videoId);
    }

    if (!(targetLanguageCode in this.translationLanguagesMap)) {
      throw new TranslationLanguageNotAvailable(this.videoId);
    }

    const translatedUrl = `${this.transcriptUrl}&tlang=${targetLanguageCode}`;
    const translatedLanguage = this.translationLanguagesMap[targetLanguageCode];

    return new Transcript(
      this.httpClient,
      this.videoId,
      translatedUrl,
      translatedLanguage,
      targetLanguageCode,
      true,
      [] // Translated transcripts cannot be translated again
    );
  }

  /**
   * Returns a string representation of the transcript.
   *
   * @returns {string} A formatted string representation
   */
  toString(): string {
    const translatableFlag = this.isTranslatable ? '[TRANSLATABLE]' : '';
    return `${this.languageCode} ("${this.language}")${translatableFlag}`;
  }
}
