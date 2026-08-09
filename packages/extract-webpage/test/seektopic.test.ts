/**
 * @fileoverview Unit tests for the SEEKTOPIC building blocks: n-gram
 * extraction, sub-phrase folding, specificity weighting and TextRank.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { extractNounEdgeGrams } from '../src/seektopic/ngrams';
import { foldSubphrases } from '../src/seektopic/fold-keyphrases';
import { weightKeyphrasesBySpecificity } from '../src/seektopic/weight-keyphrases';
import { rankSentencesCentralToKeyphrase } from '../src/seektopic/rank-sentences-keyphrases';
import type { KeyphraseEntry, NgramMap, SentenceEntry, TopicToken } from '../src/seektopic/types';

/** Noun token (category 1). */
const noun = (word: string): TopicToken => [word, 1, 5, ''];
/** Wikipedia-entity token (category 5). */
const wiki = (word: string): TopicToken => [word, 5, 9, ''];
/** Stop word / untagged token. */
const stop = (word: string): TopicToken => [word, 0, 0, ''];

describe('extractNounEdgeGrams', () => {
  it('records a two-word noun phrase', () => {
    const nGrams: NgramMap = {};

    extractNounEdgeGrams(2, [noun('machine'), noun('learning')], 0, nGrams, 3, 0);

    expect(nGrams[2]['machine learning']).toEqual([0]);
  });

  it('accepts wiki entities at the edges', () => {
    const nGrams: NgramMap = {};

    extractNounEdgeGrams(2, [wiki('alan'), wiki('turing')], 0, nGrams, 3, 7);

    expect(nGrams[2]['alan turing']).toEqual([7]);
  });

  it('allows stop words between topic edges', () => {
    const nGrams: NgramMap = {};

    extractNounEdgeGrams(4, [noun('state'), stop('of'), stop('the'), noun('art')], 0, nGrams, 2, 0);

    expect(nGrams[4]['state of the art']).toEqual([0]);
  });

  it('rejects a slice that does not start with a topic token', () => {
    const nGrams: NgramMap = {};

    extractNounEdgeGrams(2, [stop('the'), noun('machine')], 0, nGrams, 3, 0);

    expect(nGrams).toEqual({});
  });

  it('rejects a slice that does not end with a topic token', () => {
    const nGrams: NgramMap = {};

    extractNounEdgeGrams(2, [noun('machine'), stop('the')], 0, nGrams, 3, 0);

    expect(nGrams).toEqual({});
  });

  it('rejects a slice containing a short word', () => {
    const nGrams: NgramMap = {};

    extractNounEdgeGrams(2, [noun('ai'), noun('research')], 0, nGrams, 3, 0);

    expect(nGrams).toEqual({});
  });

  it('rejects a non-stop, non-topic filler word', () => {
    const nGrams: NgramMap = {};

    extractNounEdgeGrams(3, [noun('machine'), stop('quickly'), noun('learning')], 0, nGrams, 3, 0);

    expect(nGrams).toEqual({});
  });

  it('bails out when the slice runs past the end of the token list', () => {
    const nGrams: NgramMap = {};

    extractNounEdgeGrams(3, [noun('machine'), noun('learning')], 0, nGrams, 3, 0);

    expect(nGrams).toEqual({});
  });

  it('appends repeat occurrences to the same phrase bucket', () => {
    const nGrams: NgramMap = {};
    const terms = [noun('machine'), noun('learning')];

    extractNounEdgeGrams(2, terms, 0, nGrams, 3, 0);
    extractNounEdgeGrams(2, terms, 0, nGrams, 3, 4);

    expect(nGrams[2]['machine learning']).toEqual([0, 4]);
  });

  it('returns the same accumulator it was handed', () => {
    const nGrams: NgramMap = {};

    expect(extractNounEdgeGrams(2, [noun('a'), noun('b')], 0, nGrams, 3, 0)).toBe(nGrams);
  });
});

describe('foldSubphrases', () => {
  it('absorbs a sub-phrase into its superset', () => {
    const folded = foldSubphrases([
      { keyphrase: 'machine learning', words: 2, weight: 10, sentences: [0, 1] },
      { keyphrase: 'machine', words: 1, weight: 4, sentences: [0, 2] },
    ]);

    expect(folded).toHaveLength(1);
    expect(folded[0].keyphrase).toBe('machine learning');
    expect(folded[0].weight).toBe(12);
    expect(folded[0].sentences).toEqual([0, 1, 2]);
  });

  it('keeps unrelated phrases apart', () => {
    const folded = foldSubphrases([
      { keyphrase: 'machine learning', words: 2, weight: 10, sentences: [0] },
      { keyphrase: 'quantum computing', words: 2, weight: 8, sentences: [1] },
    ]);

    expect(folded.map((entry) => entry.keyphrase).sort()).toEqual([
      'machine learning',
      'quantum computing',
    ]);
  });

  it('promotes the smaller phrase when it outweighs the superset', () => {
    const folded = foldSubphrases([
      { keyphrase: 'machine learning', words: 2, weight: 1, sentences: [0] },
      { keyphrase: 'machine', words: 1, weight: 100, sentences: [1] },
    ]);

    expect(folded).toHaveLength(1);
    expect(folded[0].keyphrase).toBe('machine');
    expect(folded[0].words).toBe(1);
  });

  it('drops entries with no sentences', () => {
    const folded = foldSubphrases([
      { keyphrase: 'orphan phrase', words: 2, weight: 5, sentences: [] },
    ]);

    expect(folded).toEqual([]);
  });

  it('parses comma-separated sentence strings when merging', () => {
    const folded = foldSubphrases([
      { keyphrase: 'machine learning', words: 2, weight: 10, sentences: '0,1' },
      { keyphrase: 'machine', words: 1, weight: 4, sentences: '2' },
    ]);

    expect(folded[0].sentences).toEqual([0, 1, 2]);
  });

  it('does not mutate the input entries', () => {
    const input: KeyphraseEntry[] = [
      { keyphrase: 'quantum computing', words: 2, weight: 8, sentences: [1] },
    ];

    const folded = foldSubphrases(input);

    expect(folded[0]).not.toBe(input[0]);
    expect(input[0].weight).toBe(8);
  });

  it('returns an empty array for no input', () => {
    expect(foldSubphrases([])).toEqual([]);
  });
});

describe('weightKeyphrasesBySpecificity', () => {
  const phrasesModel = {
    ma: { machine: [[null, 1, 5]] },
    al: { alan: [[null, 5, 9]] },
  } as any;

  it('scales the weight by the average token category', () => {
    const keyphrases: KeyphraseEntry[] = [
      { keyphrase: 'machine', words: 1, weight: 10, sentences: [0] },
    ];

    weightKeyphrasesBySpecificity(keyphrases, phrasesModel, '');

    expect(keyphrases[0].weight).toBe(10);
    expect(keyphrases[0].wiki).toBeUndefined();
  });

  it('doubles the weight and flags wiki entities', () => {
    const keyphrases: KeyphraseEntry[] = [
      { keyphrase: 'alan', words: 1, weight: 10, sentences: [0] },
    ];

    weightKeyphrasesBySpecificity(keyphrases, phrasesModel, '');

    expect(keyphrases[0].wiki).toBe(true);
    // 10 doubled, then scaled by the average category (5).
    expect(keyphrases[0].weight).toBe(100);
  });

  it('boosts phrases matching a heavy-weight query', () => {
    const keyphrases: KeyphraseEntry[] = [
      { keyphrase: 'machine learning', words: 2, weight: 10, sentences: [0] },
    ];

    // Two of the three query words appear in the phrase, so the bias applies.
    weightKeyphrasesBySpecificity(keyphrases, phrasesModel, 'machine learning basics');

    expect(keyphrases[0].weight).toBeGreaterThan(3000);
  });

  it('leaves phrases that miss the query unboosted', () => {
    const keyphrases: KeyphraseEntry[] = [
      { keyphrase: 'machine', words: 1, weight: 10, sentences: [0] },
    ];

    weightKeyphrasesBySpecificity(keyphrases, phrasesModel, 'quantum optics gravity waves');

    expect(keyphrases[0].weight).toBe(10);
  });

  it('returns the same array it was given', () => {
    const keyphrases: KeyphraseEntry[] = [
      { keyphrase: 'machine', words: 1, weight: 1, sentences: [0] },
    ];

    expect(weightKeyphrasesBySpecificity(keyphrases, phrasesModel, '')).toBe(keyphrases);
  });
});

describe('rankSentencesCentralToKeyphrase', () => {
  function sentence(text: string, index: number, keyphrases: string[]): SentenceEntry {
    return {
      text,
      index,
      keyphrases: keyphrases.map((keyphrase) => ({ keyphrase, weight: 100 })),
      weight: 0,
    };
  }

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns undefined when no sentences share a keyphrase', () => {
    const result = rankSentencesCentralToKeyphrase([
      sentence('a', 0, ['alpha']),
      sentence('b', 1, ['beta']),
    ]);

    expect(result).toBeUndefined();
  });

  it('returns undefined for an empty input', () => {
    expect(rankSentencesCentralToKeyphrase([])).toBeUndefined();
  });

  it('assigns weight to sentences connected by a shared keyphrase', () => {
    const result = rankSentencesCentralToKeyphrase(
      [sentence('a', 0, ['shared']), sentence('b', 1, ['shared'])],
      { iterations: 100 }
    );

    expect(result).toHaveLength(2);
    const total = result!.reduce((sum, entry) => sum + entry.weight, 0);
    expect(total).toBe(100);
  });

  it('does not mutate the input sentences', () => {
    const input = [sentence('a', 0, ['shared']), sentence('b', 1, ['shared'])];

    const result = rankSentencesCentralToKeyphrase(input, { iterations: 10 });

    expect(result![0]).not.toBe(input[0]);
    expect(input[0].weight).toBe(0);
  });

  it('ranks the hub of a star graph highest', () => {
    // "hub" shares a keyphrase with every other sentence; the leaves do not
    // share with each other, so the walk must pass through the hub.
    const sentences = [
      sentence('hub', 0, ['a', 'b', 'c']),
      sentence('leaf-a', 1, ['a']),
      sentence('leaf-b', 2, ['b']),
      sentence('leaf-c', 3, ['c']),
    ];

    const result = rankSentencesCentralToKeyphrase(sentences, {
      iterations: 4000,
      resetInterval: 1000,
    })!;

    const hub = result.find((entry) => entry.text === 'hub')!;
    const leaves = result.filter((entry) => entry.text !== 'hub');
    for (const leaf of leaves) {
      expect(hub.weight).toBeGreaterThan(leaf.weight);
    }
  });

  it('takes the floating-point safety path when the random draw lands past the end', () => {
    // Math.random() === 1 makes the cumulative subtraction never reach <= 0.
    vi.spyOn(Math, 'random').mockReturnValue(1);

    const result = rankSentencesCentralToKeyphrase(
      [sentence('a', 0, ['shared']), sentence('b', 1, ['shared'])],
      { iterations: 5, resetInterval: 5 }
    );

    expect(result).toHaveLength(2);
  });

  it('honours a custom iteration count', () => {
    const result = rankSentencesCentralToKeyphrase(
      [sentence('a', 0, ['shared']), sentence('b', 1, ['shared'])],
      { iterations: 7, resetInterval: 100 }
    )!;

    expect(result.reduce((sum, entry) => sum + entry.weight, 0)).toBe(7);
  });
});
