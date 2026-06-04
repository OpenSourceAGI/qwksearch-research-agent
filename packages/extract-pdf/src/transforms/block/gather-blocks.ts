/**
 * @description Block-level transformation that merges consecutive `LineItem`s into
 * `LineItemBlock`s. Flushes the current block when the item type changes or the
 * vertical gap exceeds `mostUsedDistance`, while respecting per-type merge flags
 * (`mergeToBlock`, `mergeFollowingNonTypedItems`,
 * `mergeFollowingNonTypedItemsWithSmallDistance`) to handle lists and footnotes correctly.
 */

import ToLineItemBlockTransformation from "../base/to-line-item-block-transform";
import ParseResult from "../../models/parse-result";
import LineItemBlock from "../../models/line-item-block";
import { DETECTED_ANNOTATION } from "../../models/annotation";
import { minXFromPageItems } from "../../utils/page-item-functions";

// Gathers lines to blocks
export default class GatherBlocks extends ToLineItemBlockTransformation {
  constructor() {
    super("Gather Blocks");
  }

  transform(parseResult: ParseResult): ParseResult {
    const { mostUsedDistance } = parseResult.globals;
    var createdBlocks = 0;
    var lineItemCount = 0;
    parseResult.pages.map((page) => {
      lineItemCount += page.items.length;
      const blocks = [];
      var stashedBlock = new LineItemBlock({});
      const flushStashedItems = () => {
        if (stashedBlock.items.length > 1) {
          stashedBlock.annotation = DETECTED_ANNOTATION;
        }

        blocks.push(stashedBlock);
        stashedBlock = new LineItemBlock({});
        createdBlocks++;
      };

      var minX = minXFromPageItems(page.items);
      page.items.forEach((item) => {
        if (
          stashedBlock.items.length > 0 &&
          shouldFlushBlock(stashedBlock, item, minX, mostUsedDistance)
        ) {
          flushStashedItems();
        }
        stashedBlock.addItem(item);
      });
      if (stashedBlock.items.length > 0) {
        flushStashedItems();
      }
      page.items = blocks;
    });

    return new ParseResult({
      ...parseResult,
      messages: [
        "Gathered " +
          createdBlocks +
          " blocks out of " +
          lineItemCount +
          " line items",
      ],
    });
  }
}

function shouldFlushBlock(stashedBlock: any, item: any, minX: number, mostUsedDistance: number): boolean {
  if (
    stashedBlock.type &&
    stashedBlock.type.mergeFollowingNonTypedItems &&
    !item.type
  ) {
    return false;
  }
  const lastItem = stashedBlock.items[stashedBlock.items.length - 1];
  const hasBigDistance = bigDistance(lastItem, item, minX, mostUsedDistance);
  if (
    stashedBlock.type &&
    stashedBlock.type.mergeFollowingNonTypedItemsWithSmallDistance &&
    !item.type &&
    !hasBigDistance
  ) {
    return false;
  }
  if (item.type !== stashedBlock.type) {
    return true;
  }
  if (item.type) {
    return !item.type.mergeToBlock;
  } else {
    return hasBigDistance;
  }
}

function bigDistance(lastItem: any, item: any, minX: number, mostUsedDistance: number): boolean {
  const distance = lastItem.y - item.y;
  if (distance < 0 - mostUsedDistance / 2) {
    // distance is negative - and not only a bit
    return true;
  }
  var allowedDisctance = mostUsedDistance + 1;
  if (lastItem.x > minX && item.x > minX) {
    // intended elements like lists often have greater spacing
    allowedDisctance = mostUsedDistance + mostUsedDistance / 2;
  }
  if (distance > allowedDisctance) {
    return true;
  }
  return false;
}


