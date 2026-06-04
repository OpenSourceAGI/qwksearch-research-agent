/**
 * @description Abstract base for pipeline stages that operate on raw `TextItem`
 * page items (the earliest stages, currently only `CalculateGlobalStats`). Provides
 * the standard `completeTransform` cleanup that removes `REMOVED_ANNOTATION` items
 * and clears annotations before passing control to the next transformation.
 */
import Transformation from './transformation'
import TextItem from '../../models/text-item'
import ParseResult from '../../models/parse-result'
import { REMOVED_ANNOTATION } from '../../models/annotation'

export default class ToTextItemTransformation extends Transformation {
  constructor(name: string) {
    super(name, TextItem.name)
    if (this.constructor === ToTextItemTransformation) {
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
