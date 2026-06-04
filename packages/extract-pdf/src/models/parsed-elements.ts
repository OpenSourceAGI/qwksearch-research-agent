/**
 * @description Aggregated inline-element metadata for a `LineItem` or
 * `LineItemBlock`. Tracks detected footnote link numbers, footnote definitions,
 * whether any hyperlinks are present, and a count of bold/italic formatted words.
 * The `add()` method merges a child item's `ParsedElements` into the parent
 * block's running totals as lines are gathered into blocks.
 */
export default class ParsedElements {
  footnoteLinks: number[];
  footnotes: string[];
  containLinks: boolean;
  formattedWords: number;

  constructor(options: { footnoteLinks?: number[]; footnotes?: string[]; containLinks?: boolean; formattedWords?: number }) {
    this.footnoteLinks = options.footnoteLinks || [];
    this.footnotes = options.footnotes || [];
    this.containLinks = options.containLinks ?? false;
    this.formattedWords = options.formattedWords ?? 0;
  }

  add(parsedElements: ParsedElements): void {
    this.footnoteLinks = this.footnoteLinks.concat(
      parsedElements.footnoteLinks,
    );
    this.footnotes = this.footnotes.concat(parsedElements.footnotes);
    this.containLinks = this.containLinks || parsedElements.containLinks;
    this.formattedWords += parsedElements.formattedWords;
  }
}
