/**
 * @description A single typographic line on a PDF page. Extends `PageItem` with
 * spatial coordinates (x, y, width, height) and a `words` array of `Word` tokens.
 * Can be constructed from a pre-built `words` array or from a raw `text` string,
 * which is split on spaces and wrapped into `Word` instances automatically.
 */
import PageItem, { BlockTypeEntry } from "./page-item";
import Annotation from "./annotation";
import ParsedElements from "./parsed-elements";
import Word from "./word";

// A line within a page
export default class LineItem extends PageItem {
  x: number;
  y: number;
  width: number;
  height: number;
  words: Word[];

  constructor(options: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    words?: Word[];
    text?: string;
    type?: BlockTypeEntry | null;
    annotation?: Annotation | null;
    parsedElements?: ParsedElements | null;
    font?: string;
  }) {
    super(options);
    this.x = options.x ?? 0;
    this.y = options.y ?? 0;
    this.width = options.width ?? 0;
    this.height = options.height ?? 0;
    this.words = options.words || [];
    if (options.text && !options.words) {
      this.words = options.text
        .split(" ")
        .filter((string) => string.trim().length > 0)
        .map(
          (wordAsString) =>
            new Word({
              string: wordAsString,
            }),
        );
    }
  }

  text(): string {
    return this.wordStrings().join(" ");
  }

  wordStrings(): string[] {
    return this.words.map((word) => word.string);
  }
}

