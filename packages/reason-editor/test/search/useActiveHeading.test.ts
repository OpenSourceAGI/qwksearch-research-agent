/**
 * Regression coverage for `computeActiveHeadingKey`'s scroll-spy math: the
 * last heading whose top is at or above the threshold is "active", falling
 * back to the first heading when the reader is scrolled above all of them.
 */
import { describe, expect, it } from 'vitest';

import { computeActiveHeadingKey } from '@/search/useActiveHeading';

describe('computeActiveHeadingKey', () => {
  it('returns null when there are no headings', () => {
    expect(computeActiveHeadingKey([], 100)).toBeNull();
  });

  it('falls back to the first heading when none have scrolled past the threshold', () => {
    const headings = [
      { key: 'h1', top: 500 },
      { key: 'h2', top: 800 },
    ];

    expect(computeActiveHeadingKey(headings, 100)).toBe('h1');
  });

  it('returns the last heading whose top is at or above the threshold', () => {
    const headings = [
      { key: 'h1', top: -200 },
      { key: 'h2', top: 50 },
      { key: 'h3', top: 400 },
    ];

    expect(computeActiveHeadingKey(headings, 100)).toBe('h2');
  });

  it('treats a heading exactly at the threshold as scrolled past', () => {
    const headings = [
      { key: 'h1', top: -50 },
      { key: 'h2', top: 100 },
    ];

    expect(computeActiveHeadingKey(headings, 100)).toBe('h2');
  });

  it('picks the last heading when every heading has scrolled past', () => {
    const headings = [
      { key: 'h1', top: -300 },
      { key: 'h2', top: -100 },
      { key: 'h3', top: -10 },
    ];

    expect(computeActiveHeadingKey(headings, 100)).toBe('h3');
  });
});
