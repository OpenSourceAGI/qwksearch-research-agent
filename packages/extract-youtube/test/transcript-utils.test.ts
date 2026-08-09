/**
 * @fileoverview Unit tests for the transcript timing utilities: run-length
 * encoded playback speeds and character-offset → timestamp interpolation.
 */

import { FetchedTranscript } from '../src/models';
import {
  decompressTimestampsArray,
  encodeTranscriptSpeeds,
  getTimestampAtChar,
} from '../src/utils/transcript-utils';

function transcript(snippets: Array<{ text: string; start: number; duration?: number }>) {
  return new FetchedTranscript(
    snippets.map((snippet) => ({ duration: 1, ...snippet })),
    'vid123',
    'English',
    'en',
    false
  );
}

describe('encodeTranscriptSpeeds', () => {
  it('joins snippets and counts words', () => {
    const result = encodeTranscriptSpeeds(
      transcript([
        { text: 'Hello  world', start: 0 },
        { text: 'again', start: 2 },
      ])
    );

    expect(result.html).toBe('Hello world again');
    expect(result.word_count).toBe(3);
  });

  it('returns no speeds when every snippet starts at zero', () => {
    const result = encodeTranscriptSpeeds(transcript([{ text: 'only', start: 0 }]));

    expect(result.speeds).toBe('');
    expect(result.html).toBe('only');
  });

  it('run-length encodes repeated speed values', () => {
    const result = encodeTranscriptSpeeds(
      transcript([
        { text: 'aaaaaaaaaa', start: 1 },
        { text: 'aaaaaaaaaa', start: 2 },
        { text: 'aaaaaaaaaa', start: 3 },
      ])
    );

    // 10/1, 20/2 and 30/3 all floor to 10, minus the constant 10 offset.
    expect(result.speeds).toBe('0x3');
  });

  it('emits separate runs when the speed changes', () => {
    const result = encodeTranscriptSpeeds(
      transcript([
        { text: 'aaaaaaaaaa', start: 1 },
        { text: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', start: 2 },
      ])
    );

    expect(result.speeds.split(',').length).toBe(2);
  });

  it('prepends an embed player when asked', () => {
    const result = encodeTranscriptSpeeds(
      transcript([
        { text: 'aaaaaaaaaa', start: 1 },
        { text: 'bbbbbbbbbb', start: 2 },
      ]),
      true
    );

    expect(result.html).toContain('<iframe');
    expect(result.html).toContain('https://www.youtube.com/embed/vid123');
    expect(result.html).toContain(`data-timestamps="${result.speeds}"`);
    expect(result.html).toContain('aaaaaaaaaa bbbbbbbbbb');
  });
});

describe('getTimestampAtChar', () => {
  const sample = transcript([
    { text: 'aaaa', start: 0 },
    { text: 'bbbb', start: 10 },
    { text: 'cccc', start: 20 },
  ]);

  it('returns 0 at or before the start', () => {
    expect(getTimestampAtChar(sample, 0)).toBe(0);
    expect(getTimestampAtChar(sample, -5)).toBe(0);
  });

  it('returns the final timestamp past the end', () => {
    expect(getTimestampAtChar(sample, 10_000)).toBe(20);
  });

  it('interpolates between snippet boundaries', () => {
    // Snippet boundaries land at char 5 (t=0), 10 (t=10) and 15 (t=20).
    expect(getTimestampAtChar(sample, 5)).toBe(0);
    expect(getTimestampAtChar(sample, 10)).toBe(10);
    expect(getTimestampAtChar(sample, 8)).toBeCloseTo(6, 5);
  });

  it('handles a transcript with a single snippet', () => {
    const single = transcript([{ text: 'aaaa', start: 7 }]);

    expect(getTimestampAtChar(single, 100)).toBe(7);
  });
});

describe('decompressTimestampsArray', () => {
  it('expands a run-length encoded string', () => {
    expect(decompressTimestampsArray('12x3,8x2,15x1')).toEqual([12, 12, 12, 8, 8, 15]);
  });

  it('handles a single run', () => {
    expect(decompressTimestampsArray('4x2')).toEqual([4, 4]);
  });

  it('round-trips values produced by the encoder', () => {
    const { speeds } = encodeTranscriptSpeeds(
      transcript([
        { text: 'aaaaaaaaaa', start: 1 },
        { text: 'aaaaaaaaaa', start: 2 },
      ])
    );

    expect(decompressTimestampsArray(speeds)).toEqual([0, 0]);
  });
});
