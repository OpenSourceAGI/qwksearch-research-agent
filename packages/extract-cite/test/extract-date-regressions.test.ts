/**
 * @fileoverview Regression tests for date extraction: timezone-stable output,
 * itemprop reserve dates, JSON-LD published vs modified, and year-only format.
 */
import { parseHTML } from 'linkedom';
import { describe, expect, it } from 'vitest';
import { extractDate } from '../src/html-to-cite/extract-date/extract-date';
import { extract_url_date, custom_parse, json_search } from '../src/html-to-cite/extract-date/date-extractors';

const MIN = new Date(1995, 0, 1);
const MAX = new Date(2035, 0, 1);
const options = { format: '%Y-%m-%d', min: MIN, max: MAX, extensive: true, original: false };
const doc = (body: string, head = '') =>
  parseHTML(`<html><head>${head}</head><body>${body}</body></html>`).document;

describe('timezone stability', () => {
  const zones = ['Pacific/Kiritimati', 'America/Los_Angeles', 'UTC'];
  for (const tz of zones) {
    it(`keeps the calendar day in ${tz}`, () => {
      const previous = process.env.TZ;
      process.env.TZ = tz;
      try {
        expect(extract_url_date('https://e.com/2021/03/05/post', options)).toBe('2021-03-05');
        expect(custom_parse('20210305', '%Y-%m-%d', MIN, MAX)).toBe('2021-03-05');
        expect(custom_parse('2021-03-05', '%Y-%m-%d', MIN, MAX)).toBe('2021-03-05');
        expect(custom_parse('5 March 2021', '%Y-%m-%d', MIN, MAX)).toBe('2021-03-05');
      } finally {
        if (previous === undefined) delete process.env.TZ;
        else process.env.TZ = previous;
      }
    });
  }
});

describe('extractDate consistency', () => {
  it('uses the datePublished JSON-LD value when original is requested', () => {
    const tree = doc(
      '',
      '<script type="application/ld+json">{"datePublished": "2020-01-02", "dateModified": "2021-05-06"}</script>'
    );
    expect(json_search(tree, { ...options, original: true })).toBe('2020-01-02');
    expect(json_search(tree, { ...options, original: false })).toBe('2021-05-06');
  });

  it('keeps scanning JSON-LD scripts after one without a usable date', () => {
    const tree = doc(
      '',
      '<script type="application/ld+json">{"dateless": "date"}</script>' +
        '<script type="application/ld+json">{"dateModified": "2021-05-06"}</script>'
    );
    expect(json_search(tree, options)).toBe('2021-05-06');
  });

  it('keeps a non-matching itemprop date as the fallback', () => {
    const tree = doc(
      '<p>text</p>',
      '<meta itemprop="datePublished" content="2019-04-03">'
    );
    expect(extractDate(tree, false, false, '%Y-%m-%d')).toBe('2019-04-03');
  });
});
