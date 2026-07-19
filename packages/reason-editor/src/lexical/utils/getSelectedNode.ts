/**
 * @fileoverview Utility for identifying the currently selected Lexical node.
 */
import { $isAtNodeEnd } from "@lexical/selection";
import { ElementNode, RangeSelection, TextNode } from "lexical";

/**
 * Calculates which node is considered "selected" based on the current range selection.
 * Handles both forward and backward selections.
 * @param {RangeSelection} selection - The current range selection.
 * @returns {TextNode | ElementNode} The selected node.
 */
export function getSelectedNode(
  selection: RangeSelection,
): TextNode | ElementNode {
  const anchor = selection.anchor;
  const focus = selection.focus;
  const anchorNode = selection.anchor.getNode();
  const focusNode = selection.focus.getNode();
  if (anchorNode === focusNode) {
    return anchorNode;
  }
  const isBackward = selection.isBackward();
  if (isBackward) {
    return $isAtNodeEnd(focus) ? anchorNode : focusNode;
  } else {
    return $isAtNodeEnd(anchor) ? anchorNode : focusNode;
  }
}
