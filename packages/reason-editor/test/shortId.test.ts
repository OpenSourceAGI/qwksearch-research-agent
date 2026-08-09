import { describe, expect, it, vi } from 'vitest';
import { shortId } from '../src/utils/shortId';

describe('shortId', () => {
  it('returns 8 characters by default', () => {
    expect(shortId()).toHaveLength(8);
  });

  it('honours a requested length', () => {
    expect(shortId(4)).toHaveLength(4);
    expect(shortId(6)).toHaveLength(6);
  });

  it('never exceeds the requested length', () => {
    // The id is sliced out of Math.random().toString(36), whose fractional
    // part is finite, so a large request can come back short — but never long.
    for (let i = 0; i < 100; i++) {
      expect(shortId(20).length).toBeLessThanOrEqual(20);
    }
  });

  it('only emits base-36 characters', () => {
    for (let i = 0; i < 50; i++) {
      expect(shortId()).toMatch(/^[a-z0-9]+$/);
    }
  });

  it('produces distinct ids across many calls', () => {
    const ids = new Set(Array.from({ length: 500 }, () => shortId()));

    // Collisions are possible in principle but should be vanishingly rare.
    expect(ids.size).toBeGreaterThan(495);
  });

  it('derives the id from Math.random', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    expect(shortId()).toBe((0.5).toString(36).substring(2, 10));
  });
});
