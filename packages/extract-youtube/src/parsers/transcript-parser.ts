/**
 * @fileoverview Parser for converting YouTube transcript XML data into structured snippets
 */

import { XMLParser } from 'fast-xml-parser';
import { decode } from 'html-entities';
import { FetchedTranscriptSnippet } from '../types';

/**
 * Parses transcript XML data from YouTube into FetchedTranscriptSnippet objects.
 *
 * @example
 * ```typescript
 * const parser = new TranscriptParser(false);
 * const snippets = parser.parseTranscriptXml(xmlData);
 * ```
 */
export class TranscriptParser {
  /**
   * HTML formatting tags that can be preserved in transcript text.
   * These are common formatting tags that provide semantic meaning.
   */
  private static readonly FORMATTING_TAGS = [
    'strong',  // Bold text
    'em',      // Emphasized text
    'b',       // Bold text (alternative)
    'i',       // Italic text
    'mark',    // Marked/highlighted text
    'small',   // Small text
    'del',     // Deleted text
    'ins',     // Inserted text
    'sub',     // Subscript
    'sup'      // Superscript
  ];

  private htmlRemovalRegex: RegExp;

  /**
   * Creates a new TranscriptParser instance.
   *
   * @param {boolean} [preserveFormatting=false] - Whether to preserve HTML formatting tags
   */
  constructor(preserveFormatting: boolean = false) {
    this.htmlRemovalRegex = this.buildHtmlRemovalRegex(preserveFormatting);
  }

  /**
   * Builds a regex pattern for removing HTML tags based on formatting preferences.
   *
   * @private
   * @param {boolean} preserveFormatting - Whether to preserve formatting tags
   * @returns {RegExp} The HTML removal regex
   */
  private buildHtmlRemovalRegex(preserveFormatting: boolean): RegExp {
    if (preserveFormatting) {
      // Create a regex that removes all tags EXCEPT the formatting tags
      const formattingTagsPattern = TranscriptParser.FORMATTING_TAGS.join('|');
      const pattern = `<\\/?(?!\\/?(?:${formattingTagsPattern})\\b).*?\\b>`;
      return new RegExp(pattern, 'gi');
    } else {
      // Remove all HTML tags
      return /<[^>]*>/gi;
    }
  }

  /**
   * Parses raw XML transcript data into an array of transcript snippets.
   *
   * @param {string} xmlData - The raw XML data from YouTube's transcript API
   * @returns {FetchedTranscriptSnippet[]} Array of parsed transcript snippets
   *
   * @example
   * ```typescript
   * const parser = new TranscriptParser();
   * const snippets = parser.parseTranscriptXml(xmlData);
   * for (const snippet of snippets) {
   *   console.log(`${snippet.start}s: ${snippet.text}`);
   * }
   * ```
   */
  parseTranscriptXml(xmlData: string): FetchedTranscriptSnippet[] {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_'
    });

    const parsedXml = parser.parse(xmlData);
    const textElements = parsedXml.transcript?.text || [];

    // Ensure textElements is always an array (XMLParser returns single object if only one element)
    const elementsArray = Array.isArray(textElements) ? textElements : [textElements];

    return elementsArray
      .filter(element => element['#text'])
      .map(element => this.parseTranscriptSnippet(element));
  }

  /**
   * Parses a single XML element into a FetchedTranscriptSnippet.
   *
   * @private
   * @param {any} element - The XML element to parse
   * @returns {FetchedTranscriptSnippet} The parsed snippet
   */
  private parseTranscriptSnippet(element: any): FetchedTranscriptSnippet {
    return {
      text: this.cleanTranscriptText(element['#text']),
      start: this.parseFloatAttribute(element['@_start']),
      duration: this.parseFloatAttribute(element['@_dur'])
    };
  }

  /**
   * Parses a string attribute as a float, defaulting to 0 if invalid.
   *
   * @private
   * @param {string | undefined} value - The attribute value to parse
   * @returns {number} The parsed float value
   */
  private parseFloatAttribute(value: string | undefined): number {
    return parseFloat(value || '0');
  }

  /**
   * Cleans transcript text by decoding HTML entities and removing HTML tags.
   *
   * @private
   * @param {string} text - The raw transcript text
   * @returns {string} The cleaned text
   */
  private cleanTranscriptText(text: string): string {
    // Ensure text is a string
    if (typeof text !== 'string') {
      text = String(text || '');
    }
    const decodedText = decode(text);
    return decodedText.replace(this.htmlRemovalRegex, '');
  }
}
