/**
 * @fileoverview Unit tests for domain normalization and URL validation.
 */
import { describe, expect, it } from 'vitest';
import { convertURLToDomain, isURLValid } from '../src/html-to-cite/url-to-domain';

describe('convertURLToDomain', () => {
  it('strips a common TLD', () => {
    expect(convertURLToDomain('example.com')).toBe('example');
    expect(convertURLToDomain('example.org')).toBe('example');
    expect(convertURLToDomain('example.net')).toBe('example');
  });

  it('keeps the last two labels for a subdomain', () => {
    expect(convertURLToDomain('news.bbc.co.uk')).toBe('news.bbc');
    expect(convertURLToDomain('shop.example.com')).toBe('shop.example');
  });

  it('cuts at the first suffix-like label, even mid-word', () => {
    // "wiki" is in the suffix list and the pattern is not anchored to a label
    // boundary, so "en.wikipedia.org" is cut at ".wiki" rather than ".org".
    expect(convertURLToDomain('en.wikipedia.org')).toBe('en');
  });

  it('handles a deeply nested subdomain', () => {
    expect(convertURLToDomain('a.b.c.example.com')).toBe('c.example');
  });

  it('handles a country-code TLD', () => {
    expect(convertURLToDomain('example.de')).toBe('example');
    expect(convertURLToDomain('example.fr')).toBe('example');
  });

  it('falls back to the generic dotted-suffix match', () => {
    expect(convertURLToDomain('example.museum')).toBe('example');
  });

  it('returns an empty string when there is no suffix to strip', () => {
    expect(convertURLToDomain('localhost')).toBe('');
  });
});

describe('isURLValid', () => {
  it('accepts http and https URLs', () => {
    expect(isURLValid('https://example.com')).toBe(true);
    expect(isURLValid('http://example.com')).toBe(true);
  });

  it('accepts a bare domain', () => {
    expect(isURLValid('example.com')).toBe(true);
  });

  it('accepts a path', () => {
    expect(isURLValid('https://example.com/some/path')).toBe(true);
  });

  it('accepts a subdomain', () => {
    expect(isURLValid('https://en.wikipedia.org/wiki/Main')).toBe(true);
  });

  it('rejects a plain word', () => {
    expect(isURLValid('not a url')).toBe(false);
  });

  it('rejects a hostname with no TLD', () => {
    expect(isURLValid('http://localhost')).toBe(false);
  });

  it('rejects an unsupported scheme', () => {
    expect(isURLValid('ftp://example.com')).toBe(false);
  });
});
