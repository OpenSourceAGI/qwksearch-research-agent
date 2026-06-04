/**
 * @description Incrementally matches a target headline string across consecutive
 * `LineItem`s. Characters are normalised (uppercase, whitespace/dot stripped)
 * before comparison so multi-line or split titles are found correctly. Returns
 * the array of matching items once the full headline has been consumed, or `null`
 * if the sequence breaks. Used by `DetectTOC` to locate heading text on content pages.
 */
import LineItem from "./line-item";
import { normalizedCharCodeArray } from "../utils/string-functions";

export default class HeadlineFinder {
  headlineCharCodes: number[];
  stackedLineItems: LineItem[];
  stackedChars: number;

  constructor(options: { headline: string }) {
    this.headlineCharCodes = normalizedCharCodeArray(options.headline);
    this.stackedLineItems = [];
    this.stackedChars = 0;
  }

  consume(lineItem: LineItem): LineItem[] | null {
    const normalizedCharCodes = normalizedCharCodeArray(lineItem.text());
    const matchAll = this.matchAll(normalizedCharCodes);
    if (matchAll) {
      this.stackedLineItems.push(lineItem);
      this.stackedChars += normalizedCharCodes.length;
      if (this.stackedChars === this.headlineCharCodes.length) {
        return this.stackedLineItems;
      }
    } else {
      if (this.stackedChars > 0) {
        this.stackedChars = 0;
        this.stackedLineItems = [];
        this.consume(lineItem);
      }
    }
    return null;
  }

  matchAll(normalizedCharCodes: number[]): boolean {
    for (var i = 0; i < normalizedCharCodes.length; i++) {
      const headlineChar = this.headlineCharCodes[this.stackedChars + i];
      const textItemChar = normalizedCharCodes[i];
      if (textItemChar !== headlineChar) {
        return false;
      }
    }
    return true;
  }
}


