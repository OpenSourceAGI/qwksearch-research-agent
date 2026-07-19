/**
 * Instant word completion using phrases model.
 * Handles single partial words for fast autocomplete suggestions.
 */

import { suggestNextWordCompletions } from "./suggest-complete-word";

/**
 * Get instant word completion for a partial word with context.
 * Returns the first matching completion or null if none found.
 *
 * @param contextText - The context text (last 3 words, e.g., "the quick att")
 * @returns The completed word suggestion or null
 */
export async function getInstantWordCompletion(
  contextText: string,
): Promise<string | null> {
  if (!contextText || contextText.length < 2) {
    return null;
  }

  // Extract the partial word being typed (last word in context)
  const words = contextText.trim().split(/\s+/);
  const partialWord = words[words.length - 1];

  if (!partialWord || partialWord.length < 2) {
    return null;
  }

  try {
    const suggestions = await suggestNextWordCompletions(contextText, {
      useLazyLoading: true, // Enable lazy loading from API
      limitMaxResults: 10, // Get more suggestions for logging
      numberOfLastWordsToCheck: 3,
      optionShowFullQuery: false,
    });

    // Log all suggested words and their popularity scores
    if (suggestions && suggestions.length > 0) {
      console.log(`[InstantWordComplete] Suggestions for "${contextText}":`);
      suggestions.forEach((sug, index) => {
        const word =
          "word" in sug
            ? sug.word
            : "phrase" in sug
              ? sug.phrase.split(" ")[0]
              : "";
        const popularity = "popularity" in sug ? sug.popularity : 0;
        console.log(`  ${index + 1}. "${word}" (popularity: ${popularity})`);
      });
    }

    if (suggestions && suggestions.length > 0) {
      // Take the first suggestion (lowest popularity due to sorting)
      const suggestion = suggestions[0];

      // Return only the completion part (not the full query)
      if ("word" in suggestion && suggestion.word) {
        // Return the word if it's longer than what was typed
        const word = suggestion.word;
        if (word.length > partialWord.length) {
          // Return only the remaining part to complete the word
          const completion = word.substring(partialWord.length);
          return completion;
        }
      }

      if ("phrase" in suggestion && suggestion.phrase) {
        // For phrases, get the first word and return its completion
        const firstWord = suggestion.phrase.split(" ")[0];
        if (firstWord.length > partialWord.length) {
          const completion = firstWord.substring(partialWord.length);
          return completion;
        }
      }
    }

    return null;
  } catch (error) {
    console.error("[InstantWordComplete] Error:", error);
    return null;
  }
}

/**
 * Check if the current context is a single partial word (not a phrase).
 *
 * @param text - The text before cursor
 * @returns True if it's a single partial word context
 */
export function isSingleWordContext(text: string): boolean {
  const trimmed = text.trim();

  // Check if there's only one word being typed (no spaces, or only trailing space after complete words)
  const words = trimmed.split(/\s+/);

  // If last character is not a space and we have words, check the last word
  if (!text.endsWith(" ") && words.length > 0) {
    const lastWord = words[words.length - 1];
    // Consider it single word context if:
    // - It's the first word being typed
    // - Or it's a new word after a space
    const result = lastWord.length >= 2;
    return result;
  }

  return false;
}

// // Test code
// if (typeof require !== 'undefined' && require.main === module) {
//   getInstantWordCompletion('att').then((result) => {
//     console.log('[InstantWordComplete] Result:', result);
//   });
// }
