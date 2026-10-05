/**
 * @fileoverview The htmldate-style building blocks: URL dates, free-text month
 * names in several languages, the permissive custom parser, the text-pattern
 * searches, and the full `extractDate` entry point on representative pages.
 */
import { parseHTML } from 'linkedom';
import { describe, expect, it } from 'vitest';
import {
  custom_parse,
  discard_unwanted,
  external_date_parser,
  extract_url_date,
  idiosyncrasies_search,
  img_search,
  json_search,
  pattern_search,
  regex_parse,
  try_date_expr,
  TIMESTAMP_PATTERN,
} from '../src/html-to-cite/extract-date/date-extractors';
import { extractDate } from '../src/html-to-cite/extract-date/extract-date';

const MIN = new Date(1995, 0, 1);
const MAX = new Date(2035, 0, 1);
const options = { format: '%Y-%m-%d', min: MIN, max: MAX, extensive: true, original: false };

const doc = (body: string, head = '') =>
  parseHTML(`<!doctype html><html><head>${head}</head><body>${body}</body></html>`).document;

describe('extract_url_date', () => {
  it('reads year/month/day path segments, with - / _ separators', () => {
    expect(extract_url_date('https://example.com/2019/07/22/story', options)).toBe('2019-07-22');
    expect(extract_url_date('https://example.com/posts/2020-01-05-title', options)).toBe('2020-01-05');
    expect(extract_url_date('https://example.com/a_2018_11_30_b', options)).toBe('2018-11-30');
  });

  it('returns null without a date, without a URL, or outside the allowed range', () => {
    expect(extract_url_date('https://example.com/about', options)).toBeNull();
    expect(extract_url_date(null, options)).toBeNull();
    expect(extract_url_date('https://example.com/1960/01/01/old', options)).toBeNull();
    expect(extract_url_date('https://example.com/2099/01/01/future', options)).toBeNull();
  });
});

describe('regex_parse (free-text month names)', () => {
  const ymd = (d: Date | null) => d && [d.getFullYear(), d.getMonth() + 1, d.getDate()];

  it.each([
    ['June 5, 2018', [2018, 6, 5]],
    ['March 3rd, 2021', [2021, 3, 3]],
    ['5 June 2018', [2018, 6, 5]],
    ['5th of June 2018', [2018, 6, 5]],
    ['12. März 2020', [2020, 3, 12]],
    ['3 janvier 2019', [2019, 1, 3]],
    ['7 Mei 2017', [2017, 5, 7]],
    ['1 Ocak 2016', [2016, 1, 1]],
    ['Dec 25, 2015', [2015, 12, 25]],
  ])('parses %s', (text, expected) => {
    expect(ymd(regex_parse(text))).toEqual(expected);
  });

  it('swaps day and month when the "day" is obviously a month', () => {
    // 15 can only be a day, so "March 15" stays; an impossible day-first month swaps.
    expect(ymd(regex_parse('15 March 2020'))).toEqual([2020, 3, 15]);
  });

  it('returns null for text without a recognisable date', () => {
    expect(regex_parse('no date here')).toBeNull();
    expect(regex_parse('')).toBeNull();
  });
});

describe('custom_parse', () => {
  const parse = (s: string) => custom_parse(s, '%Y-%m-%d', MIN, MAX);

  it.each([
    ['2021-03-04', '2021-03-04'],
    ['20210304', '2021-03-04'],
    ['2021/03/04', '2021-03-04'],
    ['4.3.2021', '2021-03-04'],
    ['04.03.21', '2021-03-04'],
    ['2021-03', '2021-03-01'],
    ['03/2021', '2021-03-01'],
    ['June 5, 2018', '2018-06-05'],
    ['prefix 20181122 suffix', '2018-11-22'],
  ])('parses %s', (input, expected) => {
    expect(parse(input)).toBe(expected);
  });

  it('reads day-first dates, with the day/month swap for ambiguous short years', () => {
    expect(parse('25/12/2020')).toBe('2020-12-25');
    expect(parse('25.12.20')).toBe('2020-12-25');
  });

  it('does not read a month-first US date whose second field exceeds 12', () => {
    // "month" would be 25, which the day/month/year pattern cannot match.
    expect(parse('12/25/2020')).toBeNull();
  });

  it('treats two-digit years of 90+ as 19xx and the rest as 20xx', () => {
    expect(parse('1.2.95')).toBe('1995-02-01');
    expect(parse('1.2.05')).toBe('2005-02-01');
  });

  it('rejects garbage and out-of-range dates', () => {
    expect(parse('hello world')).toBeNull();
    expect(parse('1950-01-01')).toBeNull();
    expect(parse('2099-01-01')).toBeNull();
  });
});

describe('external_date_parser', () => {
  it('delegates to the platform date parser', () => {
    expect(external_date_parser('2020-02-03T04:05:06Z', '%Y-%m-%d')).toBe('2020-02-03');
    expect(external_date_parser('not a date', '%Y-%m-%d')).toBeNull();
  });
});

describe('try_date_expr', () => {
  const run = (s: string | null, extensive = true) => try_date_expr(s as string, '%Y-%m-%d', extensive, MIN, MAX);

  it('parses plausible date strings', () => {
    expect(run('2020-05-06')).toBe('2020-05-06');
    expect(run('  June 5, 2018  ')).toBe('2018-06-05');
  });

  it('rejects empty input and strings with too few or too many digits', () => {
    expect(run(null)).toBeNull();
    expect(run('')).toBeNull();
    expect(run('abc 12')).toBeNull();
    expect(run('1234567890123456789012')).toBeNull();
  });

  it('rejects text that looks like prices, URLs, times or codes', () => {
    for (const s of ['$2020-05-06', 'https://x.com/2020-05-06', '12:30 2020', 'IBAN DE89 2020', '2020']) {
      expect(run(s)).toBeNull();
    }
  });

  it('accepts loosely separated dates in both modes', () => {
    expect(run('2020/5/6', true)).toBe('2020-05-06');
    expect(run('2020/5/6', false)).toBe('2020-05-06');
    expect(run('2020 5 6', true)).toBe('2020-05-06');
  });
});

describe('search helpers', () => {
  it('img_search reads a date from the og:image URL', () => {
    const d = doc('', '<meta property="og:image" content="https://cdn.example.com/2017/03/09/hero.jpg">');
    expect(img_search(d, options)).toBe('2017-03-09');
    expect(img_search(doc(''), options)).toBeNull();
  });

  it('pattern_search validates and reformats the captured date', () => {
    expect(pattern_search('updated 2019-08-07T10:11:12 today', TIMESTAMP_PATTERN, options)).toBe('2019-08-07');
    expect(pattern_search('nothing', TIMESTAMP_PATTERN, options)).toBeNull();
    expect(pattern_search('1900-01-01T00:00:00', TIMESTAMP_PATTERN, options)).toBeNull();
  });

  it('json_search reads dateModified from structured data', () => {
    const d = doc('', '<script type="application/ld+json">{"dateModified": "2021-06-07"}</script>');
    expect(json_search(d, options)).toBe('2021-06-07');
  });

  it('json_search ignores scripts without a date key and returns null without scripts', () => {
    expect(json_search(doc('', '<script type="application/ld+json">{"name":"x"}</script>'), options)).toBeNull();
    expect(json_search(doc(''), options)).toBeNull();
  });

  it('idiosyncrasies_search finds labelled dates (English, German, Turkish)', () => {
    expect(idiosyncrasies_search('<p>Published: 2018/04/05</p>', options)).toBe('2018-04-05');
    expect(idiosyncrasies_search('<p>Datum: 7.8.2019</p>', options)).toBe('2019-08-07');
    expect(idiosyncrasies_search('<p>yayımlanma tarihi: 3/4/2017</p>', options)).toBe('2017-04-03');
    expect(idiosyncrasies_search('<p>plain text</p>', options)).toBeNull();
  });

  it('discard_unwanted strips the Wayback Machine banner', () => {
    const d = doc('<div id="wm-ipp-base">banner</div><p>keep</p>');
    const [tree, removed] = discard_unwanted(d);
    expect(removed).toHaveLength(1);
    expect(tree.querySelector('#wm-ipp-base')).toBeNull();
    expect(tree.querySelector('p')).not.toBeNull();
  });
});

describe('extractDate (end to end)', () => {
  it('prefers meta tags and honours original_date for modified-vs-published', () => {
    const head =
      '<meta property="article:modified_time" content="2024-02-01"><meta property="article:published_time" content="2020-01-15">';
    expect(extractDate(doc('', head), true, false)).toBe('2024-02-01');
    expect(extractDate(doc('', head), true, true)).toBe('2020-01-15');
    expect(extractDate(doc('', '<meta property="article:published_time" content="2023-05-17T10:00:00Z">'))).toBe('2023-05-17');
    expect(extractDate(doc('', '<meta name="date" content="2022-11-03">'))).toBe('2022-11-03');
  });

  it('uses a date in the URL, and defers to page content when asked', () => {
    const d = doc('', '<meta name="date" content="2022-11-03">');
    const url = 'https://example.com/2019/07/22/story';
    expect(extractDate(d, true, false, '%Y-%m-%d', url)).toBe('2019-07-22');
    expect(extractDate(d, true, false, '%Y-%m-%d', url, false, null, null, true)).toBe('2022-11-03');
    expect(extractDate(doc('<p>x</p>'), true, false, '%Y-%m-%d', url, false, null, null, true)).toBe('2019-07-22');
  });

  it('falls back to the canonical link for the URL date', () => {
    expect(extractDate(doc('', '<link rel="canonical" href="https://example.com/2013/01/02/x">'))).toBe('2013-01-02');
  });

  it('reads <abbr>/<time> elements and date-ish class names', () => {
    expect(extractDate(doc('<abbr class="published" title="2018-03-02T12:00:00">March 2</abbr>'))).toContain('2018');
    expect(extractDate(doc('<time datetime="2017-12-25">Dec 25</time>'))).toContain('2017');
    expect(extractDate(doc('<span class="date">March 5, 2021</span>'))).toBe('2021-03-05');
  });

  it('reads a date from the title or an h1', () => {
    expect(extractDate(doc('<h1>Report of 2016-09-30</h1>'))).toBe('2016-09-30');
  });

  it('returns null for a page with no date, a null tree, or an invalid output format', () => {
    expect(extractDate(doc('<p>No date here.</p>'))).toBeNull();
    expect(extractDate(null)).toBeNull();
    expect(extractDate(doc('', '<meta name="date" content="2022-11-03">'), true, false, 'garbage')).toBeNull();
  });

  it('respects the min/max window', () => {
    const d = doc('', '<meta name="date" content="2022-11-03">');
    expect(extractDate(d, true, false, '%Y-%m-%d', null, false, '2023-01-01', '2024-01-01')).toBeNull();
    expect(extractDate(d, true, false, '%Y-%m-%d', null, false, '2022-01-01', '2023-01-01')).toBe('2022-11-03');
  });

  it('can be run verbosely without changing the result', () => {
    expect(extractDate(doc('', '<meta name="date" content="2022-11-03">'), true, false, '%Y-%m-%d', null, true)).toBe('2022-11-03');
  });
});
