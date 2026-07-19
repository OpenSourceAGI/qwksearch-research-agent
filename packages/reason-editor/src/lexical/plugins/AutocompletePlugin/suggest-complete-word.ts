import { fetchModelChunks } from "./phrasesModelCache";

/**
 * Type representing a word completion suggestion.
 */
export type WordSuggestion = { word: string; popularity?: number };

/**
 * Type representing a phrase completion suggestion.
 */
export type PhraseSuggestion = { phrase: string; obj?: any; popularity?: number };

/**
 * Type representing any completion suggestion.
 */
export type CompletionSuggestion = WordSuggestion | PhraseSuggestion;

/**
 * Options for the suggestNextWordCompletions function.
 */
export interface SuggestionOptions {
  /** A custom phrases model to use for autocomplete suggestions */
  phrasesModel: Record<string, Record<string, any>>;
  /** Maximum number of autocomplete suggestions to return (default: 10) */
  limitMaxResults?: number;
  /** Number of last words in the query to check for phrase completions (default: 5) */
  numberOfLastWordsToCheck?: number;
  /** Whether to show the full query in the result (default: true) */
  optionShowFullQuery?: boolean;
}

/**
 * Normalizes a query string by removing non-alphanumeric characters (except spaces, hyphens, and apostrophes).
 *
 * @param query - The raw input query string
 * @returns The normalized query string
 */
function normalizeQuery(query: string): string {
  return query.trim().replace(/[^a-zA-Z0-9\s\-\']/g, "");
}

/**
 * Splits a query string into an array of lowercase words.
 *
 * @param query - The normalized query string
 * @returns Array of lowercase words
 */
function splitIntoWords(query: string): string[] {
  return query.toLowerCase().split(/\W+/);
}

/**
 * Options for the suggestNextWordCompletions function.
 */
export interface SuggestionOptionsV2 {
  /** A custom phrases model to use for autocomplete suggestions */
  phrasesModel?: Record<string, Record<string, any>> | undefined;
  /** Maximum number of autocomplete suggestions to return (default: 10) */
  limitMaxResults?: number;
  /** Number of last words in the query to check for phrase completions (default: 5) */
  numberOfLastWordsToCheck?: number;
  /** Whether to show the full query in the result (default: true) */
  optionShowFullQuery?: boolean;
  /** Whether to fetch model data from API (lazy loading). Default: false */
  useLazyLoading?: boolean;
  /** API endpoint for fetching model chunks. Default: '/api/autocomplete/phrases-model' */
  apiEndpoint?: string;
}

/**
 * Suggests word and phrase completions based on a partial query.
 *
 * This function provides autocomplete suggestions by matching the input query against
 * a phrases model. It can return both single word completions (for partial words) and
 * phrase completions (for multi-word queries).
 *
 * @param query - The input query which can be partial words or phrases
 * @param options - Configuration options for the suggestion algorithm
 * @returns Array of autocomplete suggestions, each containing either a 'phrase' or 'word' property
 *
 * @example
 * // Basic word completion
 * const suggestions = await suggestNextWordCompletions("att", {
 *   phrasesModel: model,
 *   limitMaxResults: 5
 * });
 * // Possible output: [{ word: "attention" }, { word: "attack" }, { word: "attract" }]
 *
 * @example
 * // Phrase completion
 * const suggestions = await suggestNextWordCompletions("artificial int", {
 *   phrasesModel: model,
 *   limitMaxResults: 5
 * });
 * // Possible output: [{ phrase: "artificial intelligence" }]
 */
/**
 * Processes and finds phrase completions from the last N words.
 *
 * @param words - Array of words from the normalized query
 * @param phrasesModel - The phrases model dictionary
 * @param numberOfLastWordsToCheck - Number of last words to check for phrases
 * @returns Array of raw phrase suggestions
 */
function processPhraseCompletions(
  words: string[],
  phrasesModel: Record<string, Record<string, any>>,
  numberOfLastWordsToCheck: number
): PhraseSuggestion[] {
  const autocompletes: PhraseSuggestion[] = [];
  const lastWords = words.slice(-numberOfLastWordsToCheck);
  const startIndex = words.length - lastWords.length;

  for (let i = 0; i < lastWords.length; i++) {
    const word = lastWords[i];
    const wordIndex = startIndex + i;

    // Find next word query completion list
    const firstTwoLetters = word.slice(0, 2);
    const possiblePhrases = phrasesModel[firstTwoLetters]?.[word];

    if (possiblePhrases) {
      const nextWords = words.slice(wordIndex + 1).join(" ").trim();

      const matchedPhrases = possiblePhrases
        .filter((phrase: any) => phrase[0]?.startsWith(nextWords))
        .map((phrase: any) => ({
          phrase: word + " " + phrase[0],
          obj: phrase,
          popularity: phrase[2] || 0,
        }));

      autocompletes.push(...matchedPhrases);
    }
  }

  return autocompletes;
}

/**
 * Processes and finds word completions for the last word.
 *
 * @param words - Array of words from the normalized query
 * @param phrasesModel - The phrases model dictionary
 * @returns Array of word suggestions
 */
function processWordCompletions(
  words: string[],
  phrasesModel: Record<string, Record<string, any>>
): WordSuggestion[] {
  const lastWord = words[words.length - 1];
  const firstTwoLetters = lastWord.slice(0, 2);

  if (!phrasesModel[firstTwoLetters]) {
    return [];
  }

  // The model structure has keys that are word suffixes after the first two letters
  const matchingWords = Object.keys(phrasesModel[firstTwoLetters])
    .filter((key) => {
      // Skip empty keys and special markers
      if (!key || key === "" || typeof key !== "string") return false;
      // The full word is: firstTwoLetters + key
      const fullWord = firstTwoLetters + key;
      return fullWord.startsWith(lastWord);
    })
    .map((key) => {
      const fullWord = firstTwoLetters + key;
      const phrases = phrasesModel[firstTwoLetters][key];
      // Get the highest popularity from all phrases for this word
      let maxPopularity = 0;
      if (Array.isArray(phrases)) {
        maxPopularity = Math.max(
          ...phrases.map((p: any) => (Array.isArray(p) ? p[2] || 0 : 0))
        );
      }
      return { word: fullWord, popularity: maxPopularity };
    });

  return matchingWords;
}

/**
 * Combines and sorts suggestions by popularity.
 *
 * @param phraseSuggestions - Array of phrase suggestions
 * @param wordSuggestions - Array of word suggestions
 * @param limitMaxResults - Maximum number of results to return
 * @returns Sorted and limited array of suggestions
 */
function combineAndSortSuggestions(
  phraseSuggestions: PhraseSuggestion[],
  wordSuggestions: WordSuggestion[],
  limitMaxResults: number
): CompletionSuggestion[] {
  // Flatten and sort by popularity (ascending - lower is better)
  const combined = [...phraseSuggestions, ...wordSuggestions]
    .sort((a, b) => (a.popularity || 0) - (b.popularity || 0))
    .slice(0, limitMaxResults);

  return combined;
}

/**
 * Formats suggestions to include full query context.
 *
 * @param suggestions - Array of completion suggestions
 * @param words - Original array of words from the query
 * @returns Array of suggestions with full query context
 */
function formatWithFullQuery(
  suggestions: CompletionSuggestion[],
  words: string[]
): Array<{ name: string }> {
  return suggestions
    .map((s) => {
      let name: string | undefined;
      if ("word" in s) {
        name = words.slice(0, -1).join(" ") + " " + s.word;
      }
      if ("phrase" in s) {
        const phraseStart = s.phrase.split(" ")[0];
        const prefixEnd = words.join(" ").lastIndexOf(phraseStart);
        name = words.join(" ").slice(0, prefixEnd) + " " + s.phrase;
      }
      return name ? { name } : null;
    })
    .filter((item): item is { name: string } => item !== null);
}

export async function suggestNextWordCompletions(
  query: string,
  options: SuggestionOptionsV2 = {},
): Promise<Array<{ phrase: string } | { word: string } | { name: string }>> {
  const {
    phrasesModel,
    limitMaxResults = 10,
    numberOfLastWordsToCheck = 5,
    optionShowFullQuery = true,
    useLazyLoading = false,
    apiEndpoint,
  } = options;

  // Normalize and split query into words
  const normalizedQuery = normalizeQuery(query);
  if (normalizedQuery.length < 1) {
    return [];
  }

  const words = splitIntoWords(normalizedQuery);
  if (words.length === 0 || words[words.length - 1].length < 2) {
    return [];
  }

  let model: Record<string, Record<string, any>>;

  // Lazy load model chunks from API if enabled
  if (useLazyLoading) {
    // Determine which prefix keys we need based on the words
    const prefixKeys = new Set<string>();

    // Add prefix for the last word (for word completions)
    const lastWord = words[words.length - 1];
    if (lastWord.length >= 2) {
      prefixKeys.add(lastWord.slice(0, 2));
    }

    // Add prefixes for last N words (for phrase completions)
    const lastWords = words.slice(-numberOfLastWordsToCheck);
    for (const word of lastWords) {
      if (word.length >= 2) {
        prefixKeys.add(word.slice(0, 2));
      }
    }

    // Fetch required chunks from API
    try {
      model = await fetchModelChunks(Array.from(prefixKeys), { apiEndpoint });
    } catch (error) {
      console.error('[AutocompletePlugin] Failed to fetch model chunks:', error);
      return [];
    }
  } else {
    // Use provided model or return empty if not available
    if (!phrasesModel) {
      return [];
    }
    model = phrasesModel;
  }

  // Find phrase and word completions
  const phraseSuggestions = processPhraseCompletions(
    words,
    model,
    numberOfLastWordsToCheck
  );
  const wordSuggestions = processWordCompletions(words, model);

  // Combine, sort, and limit results
  const suggestions = combineAndSortSuggestions(
    phraseSuggestions,
    wordSuggestions,
    limitMaxResults
  );

  // Format with full query if requested
  if (optionShowFullQuery) {
    return formatWithFullQuery(suggestions, words);
  }

  return suggestions;
}
