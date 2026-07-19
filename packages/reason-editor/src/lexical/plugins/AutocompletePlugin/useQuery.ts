/**
 * @fileoverview Hook for querying autocomplete suggestions.
 */

import { useCallback } from 'react';
import { getInstantWordCompletion } from './instantWordComplete';
import { predictNextWordsWithSmallLocalModel } from './predictNextWords';
import type { AutocompleteType, SearchPromise } from './types';

/**
 * Hook that provides a function to query for autocomplete suggestions.
 * Handles both instant word completion and AI-powered phrase completion.
 * @returns {(searchText: string, type: AutocompleteType) => SearchPromise} A function that takes search text and type.
 */
export function useQuery(): (searchText: string, type: AutocompleteType) => SearchPromise {
  return useCallback((searchText: string, type: AutocompleteType) => {
    let isDismissed = false;

    const dismiss = () => {
      isDismissed = true;
    };

    const promise: Promise<null | string> = (async () => {
      try {
        if (isDismissed) {
          throw 'Dismissed';
        }

        let completion: string | null = null;

        if (type === 'word') {
          // Use instant word completion for single words
          completion = await getInstantWordCompletion(searchText);
        } else {
          // Use the AI model to predict next words for phrases
          completion = await predictNextWordsWithSmallLocalModel(searchText, {
            maxTokens: 16,
          });
        }

        if (isDismissed) {
          throw 'Dismissed';
        }

        // Return the completion if it's not empty
        return completion && completion.length > 0 ? completion : null;
      } catch (error) {
        if (error === 'Dismissed') {
          throw error;
        }
        console.error('[AutocompletePlugin] Completion error:', error);
        return null;
      }
    })();

    return {
      dismiss,
      promise,
    };
  }, []);
}
