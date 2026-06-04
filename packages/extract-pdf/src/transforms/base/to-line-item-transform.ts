/**
 * @description Abstract base for pipeline stages that produce `LineItem`-typed
 * page items (CompactLines, RemoveRepetitiveElements, VerticalToHorizontal,
 * DetectTOC, DetectHeaders, DetectListItems). Provides `completeTransform` which
 * strips `REMOVED_ANNOTATION` items and clears annotations before the next stage.
 */
import Transformation from './transformation'
import LineItem from '../../models/line-item'
import ParseResult from '../../models/parse-result'
import { REMOVED_ANNOTATION } from '../../models/annotation'

// Abstract class for transformations producing LineItem(s) to be shown in the LineItemPageView
export default class ToLineItemTransformation extends Transformation {
  constructor(name: string) {
    super(name, LineItem.name)
    if (this.constructor === ToLineItemTransformation) {
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
