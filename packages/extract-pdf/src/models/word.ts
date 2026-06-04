/**
 * @description Minimal token model for a single word within a `LineItem`.
 * Carries the text `string`, an optional `type` (`WordType`: LINK,
 * FOOTNOTE_LINK, FOOTNOTE) for semantic rendering, and an optional `format`
 * (`WordFormat`: BOLD, OBLIQUE, BOLD_OBLIQUE) for inline HTML styling.
 */

export interface WordFormatEntry {
  name: string;
  startSymbol: string;
  endSymbol: string;
}

export interface WordTypeEntry {
  name: string;
  attachWithoutWhitespace?: boolean;
  plainTextFormat?: boolean;
  toText(string: string): string;
}

export default class Word {
  string: string;
  type: WordTypeEntry | null;
  format: WordFormatEntry | null;

  constructor(options: { string: string; type?: WordTypeEntry | null; format?: WordFormatEntry | null }) {
    this.string = options.string;
    this.type = options.type ?? null;
    this.format = options.format ?? null;
  }
}
