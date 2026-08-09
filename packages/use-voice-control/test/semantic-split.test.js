import { describe, expect, it } from 'vitest';
import { splitLongSentence, splitTextSmart } from '../speech/utils/semantic-split.js';

describe('splitTextSmart', () => {
  it('returns a short text unchanged as a single chunk', () => {
    expect(splitTextSmart('Just one short line.')).toEqual(['Just one short line.']);
  });

  it('trims each chunk it emits', () => {
    expect(splitTextSmart('   padded   ')).toEqual(['padded']);
  });

  it('splits on paragraph breaks first', () => {
    const chunks = splitTextSmart('First paragraph.\n\nSecond paragraph.');

    expect(chunks).toEqual(['First paragraph.', 'Second paragraph.']);
  });

  it('treats blank lines with whitespace as paragraph breaks', () => {
    const chunks = splitTextSmart('First.\n   \nSecond.');

    expect(chunks).toEqual(['First.', 'Second.']);
  });

  it('keeps every chunk within the requested maximum length', () => {
    const paragraph = Array.from({ length: 30 }, (_, i) => `this is sentence number ${i}. `).join('');

    const chunks = splitTextSmart(paragraph, 100);

    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(100);
    }
  });

  it('preserves all of the words it was given', () => {
    const paragraph = Array.from({ length: 30 }, (_, i) => `this is sentence number ${i}. `).join('');

    const chunks = splitTextSmart(paragraph, 100);

    const rejoined = chunks.join(' ').replace(/\s+/g, ' ').trim();
    expect(rejoined).toBe(paragraph.replace(/\s+/g, ' ').trim());
  });

  it('falls back to comma and word splitting for one oversized sentence', () => {
    // A single sentence longer than the limit, with no interior sentence break.
    const sentence = `${'alpha bravo charlie delta '.repeat(20)}end.`;

    const chunks = splitTextSmart(sentence, 80);

    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(80);
    }
  });

  it('honours the default 500 character limit', () => {
    const long = 'word '.repeat(400);

    const chunks = splitTextSmart(long);

    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(500);
    }
  });
});

describe('splitLongSentence', () => {
  it('returns a short sentence as one chunk', () => {
    expect(splitLongSentence('short enough', 100)).toEqual(['short enough']);
  });

  it('splits on commas when the sentence exceeds the limit', () => {
    const sentence = 'part one is here, part two is here, part three is here, part four is here';

    const chunks = splitLongSentence(sentence, 40);

    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(40);
    }
  });

  it('rejoins comma clauses that still fit together', () => {
    const chunks = splitLongSentence('a, b, c', 100);

    expect(chunks).toEqual(['a, b, c']);
  });

  it('falls back to word boundaries when a single clause is too long', () => {
    const clause = 'alpha bravo charlie delta echo foxtrot golf hotel india juliet';

    const chunks = splitLongSentence(clause, 20);

    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(20);
    }
    expect(chunks.join(' ')).toBe(clause);
  });

  it('emits a single over-long word rather than dropping it', () => {
    const word = 'x'.repeat(50);

    const chunks = splitLongSentence(`short, ${word}`, 20);

    expect(chunks).toContain(word);
  });
});
