/**
 * @description Abstract base for pipeline stages that produce `LineItemBlock`-typed
 * page items (GatherBlocks, DetectCodeQuoteBlocks, DetectListLevels). Provides
 * `completeTransform` which strips `REMOVED_ANNOTATION` items and clears all
 * remaining annotations before passing the result to the next stage.
 */
import Transformation from './transformation'
import LineItemBlock from '../../models/line-item-block'
import ParseResult from '../../models/parse-result'
import { REMOVED_ANNOTATION } from '../../models/annotation'

// Abstract class for transformations producing LineItemBlock(s) to be shown in the LineItemBlockPageView
export default class ToLineItemBlockTransformation extends Transformation {
  constructor(name: string) {
    super(name, LineItemBlock.name)
    if (this.constructor === ToLineItemBlockTransformation) {
      throw new TypeError('Can not construct abstract class.')
    }
  }

  completeTransform(parseResult: ParseResult): ParseResult {
    parseResult.messages = []
    parseResult.pages.forEach(page => {
      page.items = page.items.filter(item => !item.annotation || item.annotation !== REMOVED_ANNOTATION)
      page.items.forEach(item => (item.annotation = null))
    })
    return parseResult
  }
}
