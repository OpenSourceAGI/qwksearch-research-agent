import { describe, expect, it } from 'bun:test';
import { convertURLToDomain, isURLValid } from '../src/domain-api';

describe('isURLValid', () => {
  it('accepts URLs with and without a scheme', () => {
    expect(isURLValid('https://example.com')).toBe(true);
    expect(isURLValid('http://example.com')).toBe(true);
    expect(isURLValid('example.com')).toBe(true);
  });

  it('accepts subdomains and paths', () => {
    expect(isURLValid('https://en.wikipedia.org/wiki/Main_Page')).toBe(true);
    expect(isURLValid('sub.domain.example.com')).toBe(true);
  });

  it('rejects a bare hostname with no TLD', () => {
    expect(isURLValid('localhost')).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(isURLValid('')).toBe(false);
  });

  it('rejects a non-URL sentence', () => {
    expect(isURLValid('this is not a url at all!')).toBe(false);
  });
});

describe('convertURLToDomain', () => {
  it('strips a common TLD', () => {
    expect(convertURLToDomain('example.com')).toBe('example');
  });

  it('keeps the last two labels of a subdomained host', () => {
    expect(convertURLToDomain('mail.example.org')).toBe('mail.example');
    expect(convertURLToDomain('sub.github.com')).toBe('sub.github');
  });

  it('cuts at the first TLD-like substring, even mid-label', () => {
    // Known quirk: the TLD alternation is matched anywhere in the string, so
    // "wiki" matches inside "wikipedia" and "co" inside "ycombinator", and
    // the host is truncated at that point rather than at the real TLD.
    expect(convertURLToDomain('en.wikipedia.org')).toBe('en');
    expect(convertURLToDomain('news.ycombinator.com')).toBe('news.');
  });

  it('handles a multi-part TLD', () => {
    expect(convertURLToDomain('bbc.co.uk')).toBe('bbc');
  });

  it('keeps the last two labels for a deep subdomain', () => {
    // news.bbc.co.uk -> "news.bbc" after the TLD is removed.
    expect(convertURLToDomain('news.bbc.co.uk')).toBe('news.bbc');
  });

  it('returns a bare label unchanged', () => {
    expect(convertURLToDomain('localhost')).toBe('localhost');
  });

  it('returns an empty string for empty input', () => {
    expect(convertURLToDomain('')).toBe('');
  });

  it('is deterministic', () => {
    expect(convertURLToDomain('example.com')).toBe(convertURLToDomain('example.com'));
  });
});
