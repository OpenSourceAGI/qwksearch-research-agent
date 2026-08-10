/**
 * @fileoverview Unit tests for the tokenize helpers: stop words, the Porter
 * stemmer, semantic chunking, sentence splitting and topic-phrase tokens.
 */
import { describe, expect, it } from 'vitest';
import { isWordCommonIgnored } from '../src/tokenize/word-is-ignored';
import { stemWordToRoot } from '../src/tokenize/word-to-root-stem';
import { splitTextSemanticChars } from '../src/tokenize/text-to-chunks';
import { splitTextToSentences } from '../src/tokenize/text-to-sentences';
import {
  convertTextToTokens,
  type PhrasesModel,
} from '../src/tokenize/text-to-topic-tokens';
import { suggestNextWordCompletions } from '../src/tokenize/suggest-complete-word';

describe('isWordCommonIgnored', () => {
  it('recognises stop words', () => {
    expect(isWordCommonIgnored('the')).toBe(true);
    expect(isWordCommonIgnored('and')).toBe(true);
    expect(isWordCommonIgnored('whereupon')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(isWordCommonIgnored('The')).toBe(true);
    expect(isWordCommonIgnored('BECAUSE')).toBe(true);
  });

  it('rejects content words', () => {
    expect(isWordCommonIgnored('transformer')).toBe(false);
    expect(isWordCommonIgnored('wikipedia')).toBe(false);
  });

  it('covers the contraction fragments in the list', () => {
    expect(isWordCommonIgnored("n't")).toBe(true);
    expect(isWordCommonIgnored("'ve")).toBe(true);
  });
});

describe('stemWordToRoot', () => {
  it('leaves words shorter than three characters alone', () => {
    expect(stemWordToRoot('go')).toBe('go');
    expect(stemWordToRoot('a')).toBe('a');
  });

  it('strips a simple -s plural', () => {
    expect(stemWordToRoot('cats')).toBe('cat');
    expect(stemWordToRoot('dogs')).toBe('dog');
  });

  it('collapses -sses/-ies plurals to the suffix group', () => {
    // Pins current behaviour, which deviates from the reference Porter
    // stemmer: `/^.+?(ss|i)es$/` is replaced with `$1`, so the stem prefix is
    // dropped ("caress"/"poni" upstream) instead of kept.
    expect(stemWordToRoot('caresses')).toBe('ss');
    expect(stemWordToRoot('ponies')).toBe('i');
  });

  it('strips -ing and -ed', () => {
    expect(stemWordToRoot('running')).toBe('run');
    expect(stemWordToRoot('plastered')).toBe('plaster');
    expect(stemWordToRoot('hopping')).toBe('hop');
  });

  it('keeps -eed when the stem is long enough', () => {
    expect(stemWordToRoot('agreed')).toBe('agre');
    expect(stemWordToRoot('feed')).toBe('feed');
  });

  it('applies the classic Porter step 2 and 3 mappings', () => {
    expect(stemWordToRoot('relational')).toBe('relat');
    expect(stemWordToRoot('conditional')).toBe('condit');
    expect(stemWordToRoot('formalize')).toBe('formal');
    expect(stemWordToRoot('electrical')).toBe('electr');
    expect(stemWordToRoot('hopefulness')).toBe('hope');
  });

  it('applies the step 4 suffix removals', () => {
    expect(stemWordToRoot('revival')).toBe('reviv');
    expect(stemWordToRoot('allowance')).toBe('allow');
    expect(stemWordToRoot('adoption')).toBe('adopt');
  });

  it('removes a trailing e and doubled l', () => {
    expect(stemWordToRoot('probate')).toBe('probat');
    expect(stemWordToRoot('controll')).toBe('control');
  });

  it('preserves an initial y', () => {
    expect(stemWordToRoot('yellow')).toBe('yellow');
    expect(stemWordToRoot('youthful')).toBe('youth');
  });

  it('lowercases its input', () => {
    expect(stemWordToRoot('RUNNING')).toBe('run');
  });
});

describe('splitTextSemanticChars', () => {
  it('splits a markdown document into chunks', () => {
    const chunks = splitTextSemanticChars(
      '# Heading\n\nThis is a paragraph.\n\n- List item 1\n- List item 2\n'
    );

    expect(Array.isArray(chunks)).toBe(true);
    expect(chunks.join(' ')).toContain('Heading');
    expect(chunks.join(' ')).toContain('This is a paragraph.');
    expect(chunks.join(' ')).toContain('List item 1');
  });

  it('keeps a fenced code block together', () => {
    const chunks = splitTextSemanticChars('Before.\n\n```js\nconst a = 1;\n```\n\nAfter.');

    expect(chunks.some((chunk) => chunk.includes('const a = 1;'))).toBe(true);
  });

  it('splits paragraphs into separate chunks', () => {
    const chunks = splitTextSemanticChars(
      'First paragraph here.\n\nSecond paragraph here.\n\nThird paragraph here.'
    );

    expect(chunks.length).toBeGreaterThan(1);
  });

  it('keeps a single line of prose as one chunk', () => {
    const chunks = splitTextSemanticChars('First sentence. Second sentence.');

    expect(chunks).toHaveLength(1);
  });

  it('has no guard for text that matches nothing', () => {
    // The regex returns null and `Array.from(null)` throws; callers are
    // expected to hand it real document text.
    expect(() => splitTextSemanticChars('')).toThrow(TypeError);
    expect(() => splitTextSemanticChars(undefined as any)).toThrow(TypeError);
  });
});

describe('splitTextToSentences', () => {
  it('splits on sentence boundaries', () => {
    const sentences = splitTextToSentences(
      'The first sentence is long enough to keep. The second sentence is also long enough.'
    );

    expect(sentences).toHaveLength(2);
    expect(sentences[0]).toContain('first sentence');
    expect(sentences[1]).toContain('second sentence');
  });

  it('does not split in the middle of a common abbreviation', () => {
    const sentences = splitTextToSentences(
      'Dr. Smith went to see the U.S. Capitol building today. He met Mr. Jones afterwards.'
    );

    expect(sentences.join(' ')).toContain('Dr. Smith');
    expect(sentences.join(' ')).toContain('Mr. Jones');
    expect(sentences.some((sentence) => sentence.trim().endsWith('Dr.'))).toBe(false);
    expect(sentences.some((sentence) => sentence.trim().endsWith('Mr.'))).toBe(false);
  });

  it('returns an empty array for invalid input', () => {
    expect(splitTextToSentences('')).toEqual([]);
    expect(splitTextToSentences(null as any)).toEqual([]);
    expect(splitTextToSentences(123 as any)).toEqual([]);
  });

  it('merges fragments shorter than minSize into their neighbour', () => {
    const withDefault = splitTextToSentences('Hi. There. This sentence is long enough to stand.');

    expect(withDefault.every((sentence) => sentence.length >= 20)).toBe(true);
  });

  it('honours a custom minSize', () => {
    const sentences = splitTextToSentences('Hi there. Bye now.', { minSize: 1 });

    expect(sentences.length).toBeGreaterThanOrEqual(2);
  });

  it('splits on HTML block tags when asked', () => {
    const html = '<p>The first block of text here.</p><p>The second block of text here.</p>';

    const split = splitTextToSentences(html, { splitOnHtmlTags: true });
    expect(split.length).toBeGreaterThanOrEqual(2);
  });
});

describe('convertTextToTokens', () => {
  const phrasesModel: PhrasesModel = {
    ma: {
      machine: [
        [null, 1, 5],
        ['learning', 5, 9],
      ],
    },
    ga: {
      game: [[null, 1, 3]],
    },
  };

  it('throws without a phrases model', () => {
    expect(() => convertTextToTokens('anything', {})).toThrow('Missing phrasesModel');
  });

  it('throws without a phrase', () => {
    expect(() => convertTextToTokens('', { phrasesModel })).toThrow('Missing  phrase');
  });

  it('marks stop words with a zero category', () => {
    const tokens = convertTextToTokens('the machine', { phrasesModel });

    expect(tokens[0]).toEqual(['the', 0, 0, '']);
  });

  it('keeps stop words as ordinary tokens when asked not to ignore them', () => {
    const tokens = convertTextToTokens('the', { phrasesModel, ignoreStopWords: 0 });

    expect(tokens[0][0]).toBe('the');
  });

  it('joins a known multi-word phrase into one token', () => {
    const tokens = convertTextToTokens('machine learning is useful', { phrasesModel });

    expect(tokens[0]).toEqual(['machine learning', 5, 9, '']);
  });

  it('keeps a known single word when no phrase follows', () => {
    const tokens = convertTextToTokens('machine tools', { phrasesModel });

    expect(tokens[0]).toEqual(['machine', 1, 5, '']);
  });

  it('emits unknown words as bare tokens', () => {
    const tokens = convertTextToTokens('zzzzq', { phrasesModel });

    expect(tokens[0]).toEqual(['zzzzq', 0, 0, '']);
  });

  it('falls back to the root stem to score an inflected word', () => {
    // The surface form is kept; only the model lookup uses the stem.
    const tokens = convertTextToTokens('gaming', { phrasesModel });

    expect(tokens[0]).toEqual(['gaming', 1, 3, '']);
  });

  it('skips the root-stem lookup when checkRootWords is off', () => {
    const tokens = convertTextToTokens('gaming', { phrasesModel, checkRootWords: 0 });

    expect(tokens[0]).toEqual(['gaming', 0, 0, '']);
  });

  it('applies the typos model when enabled', () => {
    const tokens = convertTextToTokens('machien learning', {
      phrasesModel,
      typosModel: { machien: 'machine' },
      checkTypos: 1,
    });

    expect(tokens[0][0]).toBe('machine learning');
  });

  it('strips punctuation before tokenizing', () => {
    const tokens = convertTextToTokens('machine, learning!', { phrasesModel });

    expect(tokens[0][0]).toBe('machine learning');
  });
});

describe('suggestNextWordCompletions', () => {
  const phrasesModel = {
    se: {
      self: [
        ['attention', 1, 5],
        ['attract', 1, 4],
        [null, 1, 3],
      ],
    },
    ar: {
      artificial: [['intelligence', 1, 9]],
    },
  } as any;

  it('rejects without a phrases model', async () => {
    await expect(suggestNextWordCompletions('self att')).rejects.toThrow('Missing phrasesModel');
  });

  it('returns undefined for an empty query', async () => {
    await expect(suggestNextWordCompletions('   ', { phrasesModel })).resolves.toBeUndefined();
  });

  it('completes a partially typed phrase', async () => {
    const results = await suggestNextWordCompletions('self att', {
      phrasesModel,
      optionShowFullQuery: false,
    });

    expect(results).toEqual(
      expect.arrayContaining([{ phrase: 'self attention' }, { phrase: 'self attract' }])
    );
  });

  it('completes a partially typed word from the model keys', async () => {
    const results = await suggestNextWordCompletions('artif', {
      phrasesModel,
      optionShowFullQuery: false,
    });

    expect(results).toEqual([{ word: 'artificial' }]);
  });

  it('rewrites suggestions as full queries by default', async () => {
    const results = await suggestNextWordCompletions('self att', { phrasesModel });

    expect(results?.every((result) => 'name' in result)).toBe(true);
    expect(results?.[0].name).toContain('self att');
  });

  it('honours limitMaxResults', async () => {
    const results = await suggestNextWordCompletions('self att', {
      phrasesModel,
      limitMaxResults: 1,
      optionShowFullQuery: false,
    });

    expect(results).toHaveLength(1);
  });

  it('returns an empty list for an unknown prefix', async () => {
    const results = await suggestNextWordCompletions('zzz', { phrasesModel });

    expect(results).toEqual([]);
  });

  it('strips punctuation from the query', async () => {
    const results = await suggestNextWordCompletions('self, att!', {
      phrasesModel,
      optionShowFullQuery: false,
    });

    expect(results?.length).toBeGreaterThan(0);
  });
});
