/**
 * @fileoverview Search logic for finding autocomplete matches in the editor selection.
 */

import type { BaseSelection } from 'lexical';
import { $isRangeSelection, $isTextNode } from 'lexical';
import { isSingleWordContext } from './instantWordComplete';
import type { SearchResult } from './types';

/**
 * Searches the current selection for a potential autocomplete match.
 * Returns type of autocomplete ('word' | 'phrase') and the context text.
 * @param {null | BaseSelection} selection - The current selection.
 * @param {boolean} isWordsEnabled - Whether word completion is enabled.
 * @param {boolean} isSentencesEnabled - Whether sentence completion is enabled.
 * @returns {SearchResult} A tuple with match status, context, and type.
 */
export function $search(
  selection: null | BaseSelection,
  isWordsEnabled: boolean,
  isSentencesEnabled: boolean
): SearchResult {
  if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
    return [false, '', null];
  }
  const node = selection.getNodes()[0];
  const anchor = selection.anchor;

  // Check if we're in a text node
  if (!$isTextNode(node) || !node.isSimpleText()) {
    return [false, '', null];
  }

  // Get the full text content up to the cursor position
  const text = node.getTextContent();
  const cursorOffset = anchor.offset;
  const textBeforeCursor = text.substring(0, cursorOffset);

  // Check if it's a single word context (instant word completion)
  if (isWordsEnabled && isSingleWordContext(textBeforeCursor)) {
    const words = textBeforeCursor.trim().split(/\s+/);
    const lastWord = words[words.length - 1];

    if (lastWord.length >= 2) {
      // Use the last 3 words as context for better suggestions
      const contextWords = words.slice(-3).join(' ');
      return [true, contextWords, 'word'];
    }
    // If we're in a single word context but the word is too short,
    // don't fall through to sentence completion to avoid duplicates
    return [false, '', null];
  }

  // Otherwise, get the current line or sentence context for AI phrase completion
  if (isSentencesEnabled) {
    const lastSentenceBreak = Math.max(
      textBeforeCursor.lastIndexOf('.'),
      textBeforeCursor.lastIndexOf('\n'),
      textBeforeCursor.lastIndexOf('?'),
      textBeforeCursor.lastIndexOf('!')
    );

    const context = lastSentenceBreak >= 0
      ? textBeforeCursor.substring(lastSentenceBreak + 1).trim()
      : textBeforeCursor.trim();

    // Only trigger AI phrase autocomplete if there's meaningful context (at least 3 characters)
    if (context.length < 3) {
      return [false, '', null];
    }

    return [true, context, 'phrase'];
  }

  return [false, '', null];
}
