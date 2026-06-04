/**
 * @description Geometry utility functions shared across the transformation pipeline.
 * `minXFromBlocks` finds the minimum x across all items inside an array of blocks;
 * `minXFromPageItems` finds the minimum x across a flat page item array; `sortByX`
 * sorts items in place by x coordinate for left-to-right reading order.
 */
import LineItemBlock from '../models/line-item-block'

export function minXFromBlocks(blocks: LineItemBlock[]): number | null {
  var minX = 999
  blocks.forEach(block => {
    block.items.forEach(item => {
      minX = Math.min(minX, item.x)
    })
  })
  if (minX === 999) {
    return null
  }
  return minX
}

export function minXFromPageItems(items: Array<{ x: number }>): number | null {
  var minX = 999
  items.forEach(item => {
    minX = Math.min(minX, item.x)
  })
  if (minX === 999) {
    return null
  }
  return minX
}

export function sortByX(items: Array<{ x: number }>): void {
  items.sort((a, b) => a.x - b.x)
}
