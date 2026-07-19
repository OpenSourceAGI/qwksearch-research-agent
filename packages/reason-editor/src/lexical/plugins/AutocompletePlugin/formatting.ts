/**
 * @fileoverview Formatting utilities for autocomplete suggestions.
 */

import type { AutocompleteType } from './types';

/**
 * Formats the suggestion text with appropriate spacing and hint text.
 * @param {string} suggestion - The raw suggestion text.
 * @param {AutocompleteType | null} type - The type of autocomplete (word or phrase).
 * @returns {string} The formatted suggestion with hint.
 */
export function formatSuggestionText(
  suggestion: string,
  type: AutocompleteType | null
): string {
  const userAgentData = window.navigator.userAgentData;
  const isMobile =
    userAgentData !== undefined
      ? userAgentData.mobile
      : window.innerWidth <= 800 && window.innerHeight <= 600;

  // Trim leading/trailing spaces from suggestion
  const trimmedSuggestion = suggestion.trim();

  // For word completions, don't add a leading space (we're completing the current word)
  // For phrase completions, add a space if it doesn't start with punctuation
  const needsSpace = type === 'phrase' && trimmedSuggestion && !/^[.,!?;:]/.test(trimmedSuggestion);
  const prefix = needsSpace ? ' ' : '';

  // Use Tab symbol (⇥) for word completions, text for phrase completions
  const hint = isMobile
    ? 'SWIPE \u2B95'
    : type === 'word'
      ? '\u21E5'  // Unicode Tab symbol without parenthesis
      : 'TAB';

  return `${prefix}${trimmedSuggestion} ${hint}`;
}

/**
 * Prepares the final text to insert when accepting a suggestion.
 * Handles spacing logic based on suggestion type.
 * @param {string} suggestion - The raw suggestion text.
 * @param {AutocompleteType | null} type - The type of autocomplete (word or phrase).
 * @returns {string} The final text to insert.
 */
export function prepareFinalText(
  suggestion: string,
  type: AutocompleteType | null
): string {
  const trimmedSuggestion = suggestion.trim();
  const needsSpace = type === 'phrase' && trimmedSuggestion && !/^[.,!?;:]/.test(trimmedSuggestion);
  return needsSpace ? ' ' + trimmedSuggestion : trimmedSuggestion;
}
