/**
 * @fileoverview Type definitions for the SEEKTOPIC engine and ranking utilities.
 */
import type {
  TopicToken,
  PhrasesModel,
} from "../tokenize/text-to-topic-tokens";

export type { TopicToken, PhrasesModel };

/** Map from n-gram size \u2192 { phrase text \u2192 sentence indices } */
export type NgramMap = Record<number, Record<string, number[]>>;

/**
 * A ranked keyphrase with its scoring metadata and the sentence indices it appears in.
 */
export interface KeyphraseEntry {
  /** The keyphrase text */
  keyphrase: string;
  /** Indices of sentences containing this keyphrase (or comma-separated string form) */
  sentences: number[] | string;
  /** Sentences representing this keyphrase directly with their relevance similarity */
  topSentences?: Array<{ text: string; similarity: number }>;
  /** Number of words in the keyphrase */
  words: number;
  /** Composite ranking weight */
  weight: number;
  /** True if the phrase is a Wikipedia-linked entity */
  wiki?: boolean;
}

/**
 * A sentence node used during graph construction and TextRank scoring.
 */
export interface SentenceEntry {
  text: string;
  index: number;
  keyphrases: Array<{ keyphrase: string; weight: number }>;
  weight: number;
}

/**
 * A sentence in the final SEEKTOPIC output \u2014 keyphrases are resolved to strings.
 */
export interface SentenceResult {
  text: string;
  index: number;
  keyphrases: string[];
  weight: number;
}

/** Options for {@link extractSEEKTOPIC} */
export interface SEEKTOPICOptions {
  /** Trie phrases model for wiki-phrase tokenization */
  phrasesModel?: PhrasesModel;
  /** Maximum words per keyphrase (default 2) */
  maxWords?: number;
  /** Minimum words per keyphrase (default 1) */
  minWords?: number;
  /** Minimum character length of any word in a keyphrase (default 3) */
  minWordLength?: number;
  /** Fraction of all keyphrases to use as the TextRank graph limit (default 0.5) */
  topKeyphrasesPercent?: number;
  /** Max sentences to return in full-ranking mode (default 5) */
  limitTopSentences?: number;
  /** Max keyphrases to return (default 10) */
  limitTopKeyphrases?: number;
  /** Minimum character length of the full keyphrase string (default 5) */
  minKeyPhraseLength?: number;
  /** Query string to bias keyphrase weights toward (default "") */
  heavyWeightQuery?: string;
  /** Strip HTML tags before processing (default true) */
  removeHTML?: boolean;
  /** Return only keyphrases without running TextRank (default true) */
  optionSkipRanking?: boolean;
  getEnv?: (key: string) => string | undefined;
}

/** Full SEEKTOPIC output when `optionSkipRanking` is false */
export interface SEEKTOPICResult {
  topSentences: SentenceResult[];
  keyphrases: Array<Omit<KeyphraseEntry, "sentences"> & { sentences: string }>;
  sentences: string[];
}

/** Options for {@link rankSentencesCentralToKeyphrase} */
export interface RankOptions {
  /** Number of random-walk steps (default 1000) */
  iterations?: number;
  /** Steps between forced random resets to avoid cluster traps (default 100) */
  resetInterval?: number;
}
