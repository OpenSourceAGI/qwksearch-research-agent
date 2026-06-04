/**
 * @description Block-level transformation that adds hierarchical indentation to
 * nested list items within `BlockType.LIST` blocks. Tracks nesting level by
 * comparing each item's x position to the previous item's — deeper x means a
 * new sub-level — and prepends spaces proportional to the level so the HTML
 * output reflects the original visual hierarchy.
 */
import ToLineItemBlockTransformation from '../base/to-line-item-block-transform'
import ParseResult from '../../models/parse-result'
import Word from '../../models/word'
import { MODIFIED_ANNOTATION, UNCHANGED_ANNOTATION } from '../../models/annotation'
import BlockType from '../../models/block-type'

// Cares for proper sub-item spacing/leveling
export default class DetectListLevels extends ToLineItemBlockTransformation {
  constructor () {
    super('Level Lists')
  }

  transform(parseResult: ParseResult): ParseResult {
    var listBlocks = 0
    var modifiedBlocks = 0
    parseResult.pages.forEach(page => {
      page.items.filter(block => block.type === BlockType.LIST).forEach(listBlock => {
        var lastItemX: number | undefined
        var currentLevel = 0
        const xByLevel: Record<number, number> = {}
        var modifiedBlock = false
        listBlock.items.forEach(item => {
          const isListItem = true
          if (lastItemX && isListItem) {
            if (item.x > lastItemX) {
              currentLevel++
              xByLevel[item.x] = currentLevel
            } else if (item.x < lastItemX) {
              currentLevel = xByLevel[item.x]
            }
          } else {
            xByLevel[item.x] = 0
          }
          if (currentLevel > 0) {
            item.words = [
              new Word({ string: ' '.repeat(currentLevel * 3) }),
            ].concat(item.words)
            modifiedBlock = true
          }
          lastItemX = item.x
        })
        listBlocks++
        if (modifiedBlock) {
          modifiedBlocks++
          listBlock.annotation = MODIFIED_ANNOTATION
        } else {
          listBlock.annotation = UNCHANGED_ANNOTATION
        }
      })
    })

    return new ParseResult({
      ...parseResult,
      messages: ['Modified ' + modifiedBlocks + ' / ' + listBlocks + ' list blocks.'],
    })
  }
}
