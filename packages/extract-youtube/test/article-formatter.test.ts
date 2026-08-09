/**
 * @fileoverview Unit tests for ArticleFormatter and the package barrel export.
 */

import * as pkg from '../src/index';
import { ArticleFormatter, FormatterLoader } from '../src/formatters';
import { FetchedTranscript } from '../src/models';

function transcript(snippets: Array<{ text: string; start: number; duration?: number }>) {
  return new FetchedTranscript(
    snippets.map((snippet) => ({ duration: 1, ...snippet })),
    'vid123',
    'English',
    'en',
    false
  );
}

describe('ArticleFormatter', () => {
  const sample = transcript([
    { text: 'Hello there', start: 0 },
    { text: 'How are you', start: 1.5 },
    { text: 'Fine thanks', start: 4 },
  ]);

  it('returns the joined text with word and character counts', () => {
    const parsed = JSON.parse(new ArticleFormatter().formatTranscript(sample));

    expect(parsed.text).toBe('Hello there How are you Fine thanks');
    expect(parsed.wordCount).toBe(7);
    expect(parsed.charCount).toBe(parsed.text.length);
  });

  it('collapses runs of whitespace', () => {
    const parsed = JSON.parse(
      new ArticleFormatter().formatTranscript(
        transcript([{ text: 'Hello    there', start: 1 }])
      )
    );

    expect(parsed.text).toBe('Hello there');
  });

  it('emits a compressed speeds/positions pair', () => {
    const parsed = JSON.parse(new ArticleFormatter().formatTranscript(sample));

    expect(typeof parsed.timestamps).toBe('string');
    expect(parsed.timestamps).toContain('  ');
  });

  it('joins several transcripts with blank lines', () => {
    const output = new ArticleFormatter().formatTranscripts([sample, sample]);

    expect(output.split('\n\n')).toHaveLength(2);
  });

  it('is reachable through the formatter loader', () => {
    expect(new FormatterLoader().load('article')).toBeInstanceOf(ArticleFormatter);
  });
});

describe('package barrel', () => {
  it('exports the API entry point and models', () => {
    expect(pkg.YouTubeTranscriptApi).toBeDefined();
    expect(pkg.FetchedTranscript).toBeDefined();
    expect(pkg.Transcript).toBeDefined();
    expect(pkg.TranscriptList).toBeDefined();
    expect(pkg.TranscriptListFetcher).toBeDefined();
  });

  it('exports the transcript timing utilities', () => {
    expect(typeof pkg.encodeTranscriptSpeeds).toBe('function');
    expect(typeof pkg.getTimestampAtChar).toBe('function');
    expect(typeof pkg.decompressTimestampsArray).toBe('function');
  });

  it('exports the proxy configurations', () => {
    expect(pkg.ProxyConfig).toBeDefined();
    expect(pkg.GenericProxyConfig).toBeDefined();
    expect(pkg.WebshareProxyConfig).toBeDefined();
    expect(pkg.InvalidProxyConfig).toBeDefined();
  });

  it('exports every formatter', () => {
    for (const name of [
      'Formatter',
      'JSONFormatter',
      'PrettyPrintFormatter',
      'TextFormatter',
      'ArticleFormatter',
      'SRTFormatter',
      'WebVTTFormatter',
      'FormatterLoader',
      'UnknownFormatterType',
    ] as const) {
      expect(pkg[name]).toBeDefined();
    }
  });

  it('exports the error hierarchy and the playability enums', () => {
    expect(pkg.YouTubeTranscriptApiException).toBeDefined();
    expect(pkg.NoTranscriptFound).toBeDefined();
    expect(pkg.IpBlocked).toBeDefined();
    expect(pkg.PlayabilityStatus).toBeDefined();
    expect(pkg.PlayabilityFailedReason).toBeDefined();
  });
});
