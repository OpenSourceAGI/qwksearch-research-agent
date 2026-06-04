/**
 * @description Line-item transformation that recovers rotated sidebar text.
 * PDF extracts vertically-oriented labels as a sequence of single-character
 * lines. `VerticalsStream` (a `StashingStream` subclass) detects runs of 6+
 * such lines and merges them into one horizontal `LineItem`, combining their
 * words and computing the correct bounding box.
 */
import ToLineItemTransformation from "../base/to-line-item-transform";
import ParseResult from "../../models/parse-result";
import LineItem from "../../models/line-item";
import StashingStream from "../../models/stashing-stream";
import { REMOVED_ANNOTATION, ADDED_ANNOTATION } from "../../models/annotation";

// Converts vertical text to horizontal
export default class VerticalToHorizontal extends ToLineItemTransformation {
  constructor() {
    super("Vertical to Horizontal Text");
  }

  transform(parseResult: ParseResult): ParseResult {
    var foundVerticals = 0;
    parseResult.pages.forEach((page) => {
      const stream = new VerticalsStream();
      stream.consumeAll(page.items);
      page.items = stream.complete();
      foundVerticals += stream.foundVerticals;
    });

    return new ParseResult({
      ...parseResult,
      messages: ["Converted " + foundVerticals + " verticals"],
    });
  }
}

class VerticalsStream extends StashingStream {
  foundVerticals: number;

  constructor() {
    super();
    this.foundVerticals = 0;
  }

  shouldStash(item: any): boolean {
    return item.words.length === 1 && item.words[0].string.length === 1;
  }

  doMatchesStash(lastItem: any, item: any): boolean {
    return (
      lastItem.y - item.y > 5 && lastItem.words[0].type === item.words[0].type
    );
  }

  doFlushStash(stash: any[], results: any[]): void {
    if (stash.length > 5) {
      // unite
      var combinedWords = [];
      var minX = 999;
      var maxY = 0;
      var sumWidth = 0;
      var maxHeight = 0;
      stash.forEach((oneCharacterLine) => {
        oneCharacterLine.annotation = REMOVED_ANNOTATION;
        results.push(oneCharacterLine);
        combinedWords.push(oneCharacterLine.words[0]);
        minX = Math.min(minX, oneCharacterLine.x);
        maxY = Math.max(maxY, oneCharacterLine.y);
        sumWidth += oneCharacterLine.width;
        maxHeight = Math.max(maxHeight, oneCharacterLine.height);
      });
      results.push(
        new LineItem({
          ...stash[0],
          x: minX,
          y: maxY,
          width: sumWidth,
          height: maxHeight,
          words: combinedWords,
          annotation: ADDED_ANNOTATION,
        }),
      );
      this.foundVerticals++;
    } else {
      // add as singles
      results.push(...stash);
    }
  }
}


