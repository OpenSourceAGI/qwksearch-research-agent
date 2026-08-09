/**
 * @fileoverview Unit tests for the adult-content likelihood classifier.
 * Uses deliberately mild, non-explicit fixtures — the classifier keys off
 * keywords, hostnames and TLDs, all of which these exercise.
 */
import { describe, expect, it } from 'vitest';
import { isURLPorn } from '../src/url-to-content/is-url-adult';

describe('isURLPorn input handling', () => {
  it('returns false with neither a url nor a title', () => {
    expect(isURLPorn({})).toBe(false);
    expect(isURLPorn()).toBe(false);
  });

  it('rejects a non-object options argument', () => {
    expect(() => isURLPorn(null as any)).toThrow('Options parameter must be an object');
    expect(() => isURLPorn('url' as any)).toThrow('Options parameter must be an object');
  });

  it('rejects a threshold outside 0..1', () => {
    expect(() => isURLPorn({ url: 'https://example.com', threshold: -0.1 })).toThrow(
      'Threshold must be between 0 and 1'
    );
    expect(() => isURLPorn({ url: 'https://example.com', threshold: 1.5 })).toThrow(
      'Threshold must be between 0 and 1'
    );
  });

  it('accepts the boundary thresholds', () => {
    expect(() => isURLPorn({ url: 'https://example.com', threshold: 0 })).not.toThrow();
    expect(() => isURLPorn({ url: 'https://example.com', threshold: 1 })).not.toThrow();
  });
});

describe('isURLPorn classification', () => {
  it('clears an ordinary news URL', () => {
    expect(isURLPorn({ url: 'https://example.com/news/local-election-results' })).toBe(false);
  });

  it('clears an ordinary title', () => {
    expect(isURLPorn({ title: 'Quarterly earnings report for the fiscal year' })).toBe(false);
  });

  it('flags an adult-designated TLD', () => {
    expect(isURLPorn({ url: 'https://example.xxx/' })).toBe(true);
  });

  it('flags an adult keyword in the hostname', () => {
    expect(isURLPorn({ url: 'https://porn-tube.example.com/videos/1' })).toBe(true);
  });

  it('scores a URL and a title together', () => {
    const combined = isURLPorn({
      url: 'https://example.xxx/',
      title: 'Adult XXX videos',
    });

    expect(combined).toBe(true);
  });

  it('is stricter with a high threshold', () => {
    const url = 'https://example.com/adult/gallery';

    expect(isURLPorn({ url, threshold: 0.01 })).toBe(true);
    expect(isURLPorn({ url, threshold: 1 })).toBe(false);
  });

  it('treats an unparseable URL as a plain string without throwing', () => {
    expect(() => isURLPorn({ url: 'not a url at all' })).not.toThrow();
    expect(isURLPorn({ url: 'not a url at all' })).toBe(false);
  });

  it('handles an empty string for either field', () => {
    expect(isURLPorn({ url: '', title: 'Quarterly earnings report' })).toBe(false);
    expect(isURLPorn({ url: 'https://example.com/about', title: '' })).toBe(false);
  });

  it('is deterministic across repeated calls', () => {
    const options = { url: 'https://example.xxx/' };

    expect(isURLPorn(options)).toBe(isURLPorn(options));
  });
});
