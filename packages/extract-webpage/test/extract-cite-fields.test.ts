/**
 * @fileoverview Unit tests for the per-field citation extractors (title,
 * source, author) and the human-name parser they depend on. Documents are
 * built with linkedom, which is already a runtime dependency of this package.
 */
import { parseHTML } from 'linkedom';
import { describe, expect, it } from 'vitest';
import { extractAuthor } from '../src/html-to-cite/extract-author';
import { extractSource } from '../src/html-to-cite/extract-source';
import { extractTitle } from '../src/html-to-cite/extract-title';
import { extractHumanName } from '../src/html-to-cite/human-names-recognize';

function doc(body: string, head = '') {
  return parseHTML(`<!doctype html><html><head>${head}</head><body>${body}</body></html>`).document;
}

describe('extractTitle', () => {
  it('prefers a meta title', () => {
    const document = doc('<h1>Page heading</h1>', '<meta property="og:title" content="Meta title">');

    expect(extractTitle(document)).toBe('Meta title');
  });

  it('falls back to an article heading', () => {
    const document = doc('<article><h1>Article heading</h1></article>');

    expect(extractTitle(document)).toBe('Article heading');
  });

  it('falls back to the entry-title class', () => {
    const document = doc('<div class="hentry"><span class="entry-title">Entry heading</span></div>');

    expect(extractTitle(document)).toBe('Entry heading');
  });

  it('falls back to the document title', () => {
    const document = doc('<p>no headings here</p>', '<title>Document title</title>');

    expect(extractTitle(document)).toBe('Document title');
  });

  it('keeps the longest part of a breadcrumbed title', () => {
    const document = doc(
      '',
      '<meta name="title" content="Site | The actual article headline">'
    );

    expect(extractTitle(document)).toBe('The actual article headline');
  });

  it('leaves short split parts alone', () => {
    const document = doc('', '<meta name="title" content="A | B">');

    expect(extractTitle(document)).toBe('A | B');
  });

  it('truncates very long titles to 150 characters', () => {
    const long = 'x'.repeat(400);
    const document = doc('', `<meta name="title" content="${long}">`);

    expect(extractTitle(document)).toHaveLength(150);
  });

  it('strips leftover tags and collapses whitespace', () => {
    const document = doc('<h1>  Spaced    out   heading  </h1>');

    expect(extractTitle(document)).toBe('Spaced out heading');
  });
});

describe('extractSource', () => {
  it('reads the og:site_name meta tag', () => {
    const document = doc('', '<meta property="og:site_name" content="Example News">');

    expect(extractSource(document)).toBe('Example News');
  });

  it('reads an og:site_name class marker', () => {
    const document = doc('<meta class="og:site_name" content="Class News">');

    expect(extractSource(document)).toBe('Class News');
  });

  it('falls back to the "cre" class marker', () => {
    const document = doc('<meta class="cre" content="Cre News">');

    expect(extractSource(document)).toBe('Cre News');
  });

  it('returns undefined when nothing matches', () => {
    expect(extractSource(doc('<p>nothing</p>'))).toBeUndefined();
  });
});

describe('extractAuthor', () => {
  it('reads an author meta tag', () => {
    const document = doc('', '<meta name="dc.creator" content="Jane Smith">');

    expect(extractAuthor(document)?.author_cite).toContain('Smith');
  });

  it('reads an author selector', () => {
    const document = doc('<div class="byline">By John Doe</div>');

    expect(extractAuthor(document)?.author_cite).toContain('Doe');
  });

  it('strips a leading @ from a handle', () => {
    const document = doc('', '<meta name="authors" content="@Jane Smith">');

    expect(extractAuthor(document)?.author_cite).toContain('Smith');
  });

  it('rejects a URL as an author', () => {
    const document = doc('', '<meta name="authors" content="https://example.com/staff">');

    expect(extractAuthor(document)).toBeNull();
  });

  it('rejects an over-long author string', () => {
    const document = doc('', `<meta name="authors" content="${'a'.repeat(400)}">`);

    expect(extractAuthor(document)).toBeNull();
  });

  it('returns null when the document has no author', () => {
    expect(extractAuthor(doc('<p>Just some text.</p>'))).toBeNull();
  });
});

describe('extractHumanName', () => {
  it('returns empty fields for missing input', () => {
    expect(extractHumanName('')).toEqual({ author_cite: '', author_short: '', author_type: 4 });
    expect(extractHumanName(null as any)).toEqual({
      author_cite: '',
      author_short: '',
      author_type: 4,
    });
  });

  it('classifies a single personal name', () => {
    const result = extractHumanName('Jane Smith');

    expect(result.author_type).toBe(0);
    expect(result.author_cite).toContain('Smith');
  });

  it('classifies two comma-separated authors', () => {
    const result = extractHumanName('Jane Smith, John Doe');

    expect(result.author_type).toBe(1);
    expect(result.author_cite).toBe('Smith, Jane & Doe, John');
  });

  it('over-splits an "and"-joined pair into more than two authors', () => {
    // Pins current behaviour: the "and"/"&" separator yields a third,
    // empty-ish part, so the pair is reported as the >2 author type.
    expect(extractHumanName('Jane Smith and John Doe').author_type).toBe(2);
    expect(extractHumanName('Jane Smith & John Doe').author_type).toBe(2);
  });

  it('classifies three or more authors', () => {
    expect(extractHumanName('Jane Smith, John Doe, Alice Roe').author_type).toBe(2);
  });

  it('classifies an organization', () => {
    expect(extractHumanName('Reuters News Agency Inc.').author_type).toBe(3);
  });

  it('strips a leading "by"', () => {
    expect(extractHumanName('By: Jane Smith').author_cite).not.toMatch(/^by/i);
  });

  it('normalises runs of whitespace', () => {
    expect(extractHumanName('Jane     Smith').author_cite).toContain('Smith');
  });

  it('abbreviates long author lists with et al.', () => {
    const result = extractHumanName('Jane Smith, John Doe, Alice Roe, Bob Poe', {
      maxAuthorsBeforeEtAl: 2,
    });

    expect(result.author_cite).toContain('et al');
  });

  it('honours the shortened-citation option', () => {
    const shortened = extractHumanName('Jane Smith', { formatCiteShortenAuthor: true });

    expect(typeof shortened.author_short).toBe('string');
    expect(typeof shortened.author_cite).toBe('string');
  });
});
