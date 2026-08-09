import { describe, expect, it } from 'vitest';
import { isCompleteSentence, processStreamingText } from '../speech/utils/sentence-detector.js';

describe('isCompleteSentence', () => {
  it('rejects empty and whitespace-only input', () => {
    expect(isCompleteSentence('')).toBe(false);
    expect(isCompleteSentence('   ')).toBe(false);
    expect(isCompleteSentence(undefined)).toBe(false);
    expect(isCompleteSentence(null)).toBe(false);
  });

  it('rejects a fragment with no terminator', () => {
    expect(isCompleteSentence('The quick brown fox')).toBe(false);
  });

  it.each(['.', '!', '?'])('accepts text terminated by "%s"', (mark) => {
    expect(isCompleteSentence(`Hello there${mark}`)).toBe(true);
  });

  it('accepts a terminator followed by a closing quote or bracket', () => {
    expect(isCompleteSentence('He said "hello."')).toBe(true);
    expect(isCompleteSentence('(An aside.)')).toBe(true);
  });

  it('accepts a terminator followed by the start of the next sentence', () => {
    expect(isCompleteSentence('First. Second')).toBe(true);
  });

  it('accepts a closing quote followed by punctuation and a new sentence', () => {
    // Matches the dialogEnd pattern (quote, then punctuation, then a capital)
    // rather than the basic terminator pattern.
    expect(isCompleteSentence('"Wait", She said')).toBe(true);
  });

  it('does not treat a mid-clause dialog comma as a boundary', () => {
    expect(isCompleteSentence('"Wait", she said')).toBe(false);
  });

  it('accepts a colon or semicolon introducing a list', () => {
    expect(isCompleteSentence('Ingredients: ')).toBe(true);
    expect(isCompleteSentence('Steps:\n- one')).toBe(true);
    expect(isCompleteSentence('First item; ')).toBe(true);
  });

  it('accepts a paragraph break', () => {
    expect(isCompleteSentence('An unterminated line\n\nand another')).toBe(true);
  });

  it('force-breaks very long text with no terminator at all', () => {
    // The length fallback kicks in past 150 characters.
    expect(isCompleteSentence('word '.repeat(29).trim())).toBe(false);
    expect(isCompleteSentence('word '.repeat(40).trim())).toBe(true);
  });
});

describe('processStreamingText', () => {
  it('returns nothing for empty input', () => {
    expect(processStreamingText('', '')).toEqual({ sentences: [], remainder: '' });
    expect(processStreamingText('  ', ' ')).toEqual({ sentences: [], remainder: '' });
  });

  it('holds back an incomplete fragment as the remainder', () => {
    const result = processStreamingText('', 'The quick brown');

    expect(result.sentences).toEqual([]);
    expect(result.remainder).toBe('The quick brown');
  });

  it('concatenates the accumulator with the new chunk', () => {
    const result = processStreamingText('The quick ', 'brown');

    expect(result.remainder).toBe('The quick brown');
  });

  it('emits a sentence once it is terminated', () => {
    const result = processStreamingText('Hello there', '. ');

    expect(result.sentences).toEqual(['Hello there.']);
  });

  it('splits several sentences arriving in one chunk', () => {
    const result = processStreamingText('', 'One sentence. Two sentence. ');

    expect(result.sentences).toEqual(['One sentence.', 'Two sentence.']);
    expect(result.remainder).toBe('');
  });

  it('keeps a trailing fragment as the remainder', () => {
    const result = processStreamingText('', 'Done. And now a partial');

    expect(result.sentences).toEqual(['Done.']);
    expect(result.remainder).toBe('And now a partial');
  });

  it('drives a realistic streaming loop', () => {
    const chunks = ['The rain in ', 'Spain falls ', 'mainly on the plain. ', 'It really ', 'does. '];
    let remainder = '';
    const spoken = [];

    for (const chunk of chunks) {
      const result = processStreamingText(remainder, chunk);
      spoken.push(...result.sentences);
      remainder = result.remainder;
    }

    expect(spoken).toEqual(['The rain in Spain falls mainly on the plain.', 'It really does.']);
    expect(remainder).toBe('');
  });

  it('trims whitespace off the sentences it emits', () => {
    const result = processStreamingText('', '   Padded sentence.   ');

    expect(result.sentences[0]).toBe('Padded sentence.');
  });
});
