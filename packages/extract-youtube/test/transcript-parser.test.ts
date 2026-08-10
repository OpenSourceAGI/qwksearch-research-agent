/**
 * @fileoverview Unit tests for the transcript XML parser.
 */

import { TranscriptParser } from '../src/parsers/transcript-parser';

const xml = (body: string) => `<?xml version="1.0" encoding="utf-8" ?><transcript>${body}</transcript>`;

describe('TranscriptParser', () => {
  it('parses several text elements into snippets', () => {
    const snippets = new TranscriptParser().parseTranscriptXml(
      xml(
        '<text start="0.5" dur="1.5">Hello</text>' +
          '<text start="2.0" dur="3.25">world</text>'
      )
    );

    expect(snippets).toEqual([
      { text: 'Hello', start: 0.5, duration: 1.5 },
      { text: 'world', start: 2, duration: 3.25 },
    ]);
  });

  it('wraps a single text element in an array', () => {
    const snippets = new TranscriptParser().parseTranscriptXml(
      xml('<text start="1" dur="2">Only one</text>')
    );

    expect(snippets).toHaveLength(1);
    expect(snippets[0].text).toBe('Only one');
  });

  it('returns an empty array when there are no text elements', () => {
    expect(new TranscriptParser().parseTranscriptXml(xml(''))).toEqual([]);
  });

  it('returns an empty array for XML with no transcript root', () => {
    expect(new TranscriptParser().parseTranscriptXml('<other></other>')).toEqual([]);
  });

  it('skips elements with no text content', () => {
    const snippets = new TranscriptParser().parseTranscriptXml(
      xml('<text start="1" dur="2"></text><text start="3" dur="1">Kept</text>')
    );

    expect(snippets).toHaveLength(1);
    expect(snippets[0].text).toBe('Kept');
  });

  it('defaults a missing duration attribute to 0', () => {
    const snippets = new TranscriptParser().parseTranscriptXml(
      xml('<text start="4">No duration</text>')
    );

    expect(snippets[0]).toEqual({ text: 'No duration', start: 4, duration: 0 });
  });

  it('drops an element with no attributes at all', () => {
    // With no attributes the XML parser yields a bare string, which has no
    // `#text` key and is filtered out.
    expect(new TranscriptParser().parseTranscriptXml(xml('<text>No timing</text>'))).toEqual([]);
  });

  it('decodes HTML entities', () => {
    const snippets = new TranscriptParser().parseTranscriptXml(
      xml('<text start="0" dur="1">Tom &amp;amp; Jerry</text>')
    );

    expect(snippets[0].text).toBe('Tom & Jerry');
  });

  it('strips every HTML tag by default', () => {
    const snippets = new TranscriptParser().parseTranscriptXml(
      xml('<text start="0" dur="1">a &lt;b&gt;bold&lt;/b&gt; word</text>')
    );

    expect(snippets[0].text).toBe('a bold word');
  });

  it('keeps formatting tags when preserveFormatting is set', () => {
    const snippets = new TranscriptParser(true).parseTranscriptXml(
      xml('<text start="0" dur="1">a &lt;b&gt;bold&lt;/b&gt; word</text>')
    );

    expect(snippets[0].text).toContain('<b>');
    expect(snippets[0].text).toContain('</b>');
  });

  it('coerces non-string text content', () => {
    const snippets = new TranscriptParser().parseTranscriptXml(
      xml('<text start="0" dur="1">12345</text>')
    );

    expect(snippets[0].text).toBe('12345');
  });
});
