/**
 * @description Groups a flat array of `TextItem`s into per-line buckets by
 * clustering items whose y-coordinates differ by less than half of
 * `mostUsedDistance`. Each bucket is then sorted by x so items read left-to-right,
 * which is critical for footnote detection and word ordering in `CompactLines`.
 */

import TextItem from "./text-item";
import { sortByX } from "../utils/page-item-functions";

// Groups all text items which are on the same y line
export default class TextItemLineGrouper {
  mostUsedDistance: number;

  constructor(options: { mostUsedDistance?: number }) {
    this.mostUsedDistance = options.mostUsedDistance || 12;
  }

  group(textItems: TextItem[]): TextItem[][] {
    const lines: TextItem[][] = [];
    var currentLine: TextItem[] = [];
    textItems.forEach((item) => {
      if (
        currentLine.length > 0 &&
        Math.abs(currentLine[0].y - item.y) >= this.mostUsedDistance / 2
      ) {
        lines.push(currentLine);
        currentLine = [];
      }
      currentLine.push(item);
    });
    lines.push(currentLine);

    lines.forEach((lineItems) => {
      sortByX(lineItems);
    });
    return lines;
  }
}


