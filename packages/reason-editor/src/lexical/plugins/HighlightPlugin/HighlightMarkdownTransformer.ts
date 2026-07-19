/**
 * @fileoverview Markdown transformer for highlight syntax (==text==).
 * Allows users to type ==highlighted text== which automatically converts to HighlightNode.
 */

import { TextMatchTransformer } from '@lexical/markdown';
import { $createHighlightNode, $isHighlightNode, HighlightNode } from '../../nodes/HighlightNode';
import { $createTextNode } from 'lexical';

/**
 * Markdown transformer for highlight marks.
 * Matches ==text== syntax and converts to HighlightNode.
 *
 * Example:
 *   Input:  ==important text==
 *   Output: HighlightNode with "important text"
 */
export const HIGHLIGHT: TextMatchTransformer = {
  dependencies: [HighlightNode],
  export: (node) => {
    if (!$isHighlightNode(node)) {
      return null;
    }
    return `==${node.getTextContent()}==`;
  },
  importRegExp: /==([^=]+?)==/g,
  regExp: /==([^=]+?)==$/,
  replace: (textNode, match) => {
    const [, text] = match;
    const highlightNode = $createHighlightNode(text);
    textNode.replace(highlightNode);
  },
  trigger: '=',
  type: 'text-match',
};
