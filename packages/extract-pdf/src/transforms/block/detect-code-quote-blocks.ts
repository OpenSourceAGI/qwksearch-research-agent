/**
 * @description Block-level transformation that marks blocks as `BlockType.CODE`
 * when all constituent lines are indented beyond the page's leftmost x position
 * and the text height matches body-text height. Heuristically distinguishes
 * indented code/blockquote sections from regular paragraphs without relying on
 * font metadata.
 */

import ToLineItemBlockTransformation from '../base/to-line-item-block-transform'
import ParseResult from '../../models/parse-result'
import { DETECTED_ANNOTATION } from '../../models/annotation'
import BlockType from '../../models/block-type'
import { minXFromBlocks } from '../../utils/page-item-functions'

// Detect items which are code/quote blocks
export default class DetectCodeQuoteBlocks extends ToLineItemBlockTransformation {
  constructor () {
    super('$1')
  }

  transform(parseResult: ParseResult): ParseResult {
    const mostUsedHeight = parseResult.globals.mostUsedHeight ?? 0
    var foundCodeItems = 0
    parseResult.pages.forEach(page => {
      var minX = minXFromBlocks(page.items)
      page.items.forEach(block => {
        if (!block.type && looksLikeCodeBlock(minX, block.items, mostUsedHeight)) {
          block.annotation = DETECTED_ANNOTATION
          block.type = BlockType.CODE
          foundCodeItems++
        }
      })
    })

    return new ParseResult({
      ...parseResult,
      messages: [
        'Detected ' + foundCodeItems + ' code/quote items.',
      ],
    })
  }
}

function looksLikeCodeBlock(minX: number, items: any[], mostUsedHeight: number): boolean {
  if (items.length === 0) {
    return false
  }
  if (items.length === 1) {
    return items[0].x > minX && items[0].height <= mostUsedHeight + 1
  }
  for (var item of items) {
    if (item.x === minX) {
      return false
    }
  }
  return true
}
