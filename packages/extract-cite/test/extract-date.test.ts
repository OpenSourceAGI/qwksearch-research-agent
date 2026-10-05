/**
 * @fileoverview Unit tests for the date extraction pipeline: the quick
 * meta/selector/URL scan, the candidate validators and the full htmldate-style
 * extractor.
 */
import { parseHTML } from 'linkedom';
import { describe, expect, it } from 'vitest';
import { extractDateQuick } from '../src/html-to-cite/extract-date/extract-date-quick';
import {
  check_date_input,
  get_max_date,
  get_min_date,
  is_valid_date,
  is_valid_format,
} from '../src/html-to-cite/extract-date/date-validators';
import { extract_url_date, regex_parse } from '../src/html-to-cite/extract-date/date-extractors';
import { extractDate } from '../src/html-to-cite/extract-date/extract-date';

function doc(body: string, head = '') {
  return parseHTML(`<!doctype html><html><head>${head}</head><body>${body}</body></html>`).document;
}

describe('extractDateQuick', () => {
  it('reads a published-date meta tag', () => {
    const document = doc('', '<meta property="article:published_time" content="2023-05-17">');

    expect(extractDateQuick(document, 'https://example.com/post')).toContain('2023');
  });

  it('reads a date from a selector', () => {
    const document = doc('<time class="entry-date">2021-03-04</time>');

    expect(extractDateQuick(document, 'https://example.com/post')).toContain('2021');
  });

  it('reads a date embedded in the URL', () => {
    const document = doc('<p>no date markup</p>');

    expect(extractDateQuick(document, 'https://example.com/2019/07/22/story')).toContain('2019');
  });

  it('reads a date from a "Published" text pattern', () => {
    const document = doc('<div>Published 2018-02-11</div>');

    expect(extractDateQuick(document, 'https://example.com/story')).toContain('2018');
  });

  it('returns null when nothing matches', () => {
    const document = doc('<p>Just prose, no dates at all.</p>');

    expect(extractDateQuick(document, 'https://example.com/story')).toBeNull();
  });
});

describe('is_valid_date', () => {
  const earliest = new Date(2002, 0, 1);
  const latest = new Date(2030, 0, 1);

  it('rejects null', () => {
    expect(is_valid_date(null, '%Y-%m-%d', earliest, latest)).toBe(false);
  });

  it('accepts a Date inside the range', () => {
    expect(is_valid_date(new Date(2020, 5, 1), '%Y-%m-%d', earliest, latest)).toBe(true);
  });

  it('rejects a Date before the earliest bound', () => {
    expect(is_valid_date(new Date(1990, 5, 1), '%Y-%m-%d', earliest, latest)).toBe(false);
  });

  it('rejects a Date after the latest bound', () => {
    expect(is_valid_date(new Date(2040, 5, 1), '%Y-%m-%d', earliest, latest)).toBe(false);
  });

  it('parses a YYYY-MM-DD string', () => {
    expect(is_valid_date('2020-06-01', 'YYYY-MM-DD', earliest, latest)).toBe(true);
  });

  it('falls back to the default bounds when none are given', () => {
    expect(is_valid_date(new Date(2020, 5, 1), '%Y-%m-%d', null, null)).toBe(true);
    expect(is_valid_date(new Date(1990, 5, 1), '%Y-%m-%d', null, null)).toBe(false);
  });
});

describe('is_valid_format', () => {
  it('accepts a strftime-style format', () => {
    expect(is_valid_format('%Y-%m-%d')).toBe(true);
  });

  it('rejects a format with no directives', () => {
    expect(is_valid_format('YYYY-MM-DD')).toBe(false);
  });

  it('rejects a non-string format', () => {
    expect(is_valid_format(null)).toBe(false);
    expect(is_valid_format(42)).toBe(false);
  });
});

describe('date bounds helpers', () => {
  it('passes a valid Date through check_date_input', () => {
    const date = new Date(2020, 0, 1);

    expect(check_date_input(date, new Date()).getTime()).toBe(date.getTime());
  });

  it('parses a date string', () => {
    expect(check_date_input('2015-01-01', new Date()).getFullYear()).toBe(2015);
  });

  it('falls back to the default for a non-Date, non-string input', () => {
    const fallback = new Date(2015, 0, 1);

    expect(check_date_input(null, fallback).getTime()).toBe(fallback.getTime());
    expect(check_date_input(42, fallback).getTime()).toBe(fallback.getTime());
  });

  it('yields an Invalid Date for an unparseable string', () => {
    // `new Date(str)` does not throw, so the string branch returns Invalid Date
    // rather than the supplied default.
    expect(Number.isNaN(check_date_input('not a date', new Date(2015, 0, 1)).getTime())).toBe(true);
  });

  it('supplies defaults for the min and max bounds', () => {
    expect(get_min_date(null)).toBeInstanceOf(Date);
    expect(get_max_date(null)).toBeInstanceOf(Date);
    expect(get_min_date(new Date(2010, 0, 1)).getFullYear()).toBe(2010);
  });
});

describe('extract_url_date', () => {
  const options = {
    extensive_search: true,
    max: new Date(2030, 0, 1),
    min: new Date(2002, 0, 1),
    original: false,
    format: '%Y-%m-%d',
  } as any;

  it('reads a Y/M/D path', () => {
    expect(extract_url_date('https://example.com/2019/07/22/story', options)).toContain('2019');
  });

  it('returns null for a URL with no date', () => {
    expect(extract_url_date('https://example.com/about', options)).toBeNull();
  });

  it('returns null for a nullish URL', () => {
    expect(extract_url_date(null, options)).toBeNull();
  });
});

describe('regex_parse', () => {
  it('parses a long-form English date', () => {
    const parsed = regex_parse('Published on January 5, 2020 by staff');

    expect(parsed).toBeInstanceOf(Date);
    expect(parsed.getFullYear()).toBe(2020);
  });

  it('returns null for text with no date', () => {
    expect(regex_parse('nothing to see here')).toBeNull();
  });
});

describe('extractDate', () => {
  it('returns null without a tree', () => {
    expect(extractDate(null)).toBeNull();
  });

  it('rejects a malformed output format', () => {
    const document = doc('<p>text</p>');

    expect(extractDate(document, true, false, 'YYYY-MM-DD')).toBeNull();
  });

  it('reads the date from a header meta tag', () => {
    const document = doc(
      '<p>Story body</p>',
      '<meta property="article:published_time" content="2021-08-09">'
    );

    expect(extractDate(document, true, false, '%Y-%m-%d', 'https://example.com/story')).toBe(
      '2021-08-09'
    );
  });

  it('falls back to the URL when the markup has no date', () => {
    const document = doc('<p>Story body</p>');

    expect(
      extractDate(document, true, false, '%Y-%m-%d', 'https://example.com/2019/07/22/story')
    ).toContain('2019');
  });

  it('picks up the canonical link when no URL is passed', () => {
    const document = doc(
      '<p>Story body</p>',
      '<link rel="canonical" href="https://example.com/2018/03/04/story">'
    );

    expect(extractDate(document)).toContain('2018');
  });

  it('honours deferred URL extraction', () => {
    const document = doc(
      '<p>Story body</p>',
      '<meta property="article:published_time" content="2021-08-09">'
    );

    const deferred = extractDate(
      document,
      true,
      false,
      '%Y-%m-%d',
      'https://example.com/2019/07/22/story',
      false,
      null,
      null,
      true
    );

    // With deferral the markup date wins over the URL date.
    expect(deferred).toBe('2021-08-09');
  });

  it('returns null for a document with no date anywhere', () => {
    const document = doc('<p>Nothing dated in this document at all.</p>');

    expect(extractDate(document, true, false, '%Y-%m-%d', 'https://example.com/about')).toBeNull();
  });
});
