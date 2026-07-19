/**
 * @fileoverview Type definitions and constants for the autocomplete plugin.
 */

export type AutocompleteType = 'word' | 'phrase';

export type SearchPromise = {
  dismiss: () => void;
  promise: Promise<null | string>;
};

export type SearchResult = [
  hasMatch: boolean,
  context: string,
  type: AutocompleteType | null
];

export const HISTORY_MERGE_TAG_VALUE = 'history-merge';
export const HISTORY_MERGE = { tag: HISTORY_MERGE_TAG_VALUE };

export const uuid = Math.random()
  .toString(36)
  .replace(/[^a-z]+/g, '')
  .substring(0, 5);

declare global {
  interface Navigator {
    userAgentData?: {
      mobile: boolean;
    };
  }
}
