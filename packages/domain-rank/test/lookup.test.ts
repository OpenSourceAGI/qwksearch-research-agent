import { describe, expect, it } from 'bun:test';
import {
  getAllDomains,
  getTopDomains,
  getTotalDomains,
  lookupDomain,
  searchDomains,
} from '../src/index';

describe('getTotalDomains', () => {
  it('reports a populated dataset', () => {
    expect(getTotalDomains()).toBeGreaterThan(100);
  });

  it('agrees with getAllDomains', () => {
    expect(getAllDomains()).toHaveLength(getTotalDomains());
  });
});

describe('lookupDomain', () => {
  it('finds a well-known domain', () => {
    const result = lookupDomain('google.com');

    expect(result).not.toBeNull();
    expect(result!.domain).toBe('google.com');
    expect(typeof result!.rank).toBe('number');
  });

  it('is case insensitive', () => {
    expect(lookupDomain('GOOGLE.COM')?.domain).toBe('google.com');
  });

  it('returns null for a domain that is not ranked', () => {
    expect(lookupDomain('this-domain-does-not-exist-12345.example')).toBeNull();
  });

  it('returns a name and rank for every top domain', () => {
    for (const entry of getTopDomains(20)) {
      const looked = lookupDomain(entry.domain);
      expect(looked, entry.domain).not.toBeNull();
      expect(typeof looked!.rank).toBe('number');
    }
  });
});

describe('getTopDomains', () => {
  it('defaults to 100 entries', () => {
    expect(getTopDomains()).toHaveLength(100);
  });

  it('honours the requested count', () => {
    expect(getTopDomains(5)).toHaveLength(5);
  });

  it('returns them in ascending rank order', () => {
    const ranks = getTopDomains(50).map((d) => d.rank);

    expect([...ranks].sort((a, b) => a - b)).toEqual(ranks);
  });

  it('never returns more entries than the dataset holds', () => {
    expect(getTopDomains(getTotalDomains() + 1000)).toHaveLength(getTotalDomains());
  });

  it('returns an empty list for a zero count', () => {
    expect(getTopDomains(0)).toEqual([]);
  });
});

describe('searchDomains', () => {
  it('matches on the domain name', () => {
    const results = searchDomains('google');

    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.domain.includes('google'))).toBe(true);
  });

  it('is case insensitive', () => {
    expect(searchDomains('GOOGLE').length).toBe(searchDomains('google').length);
  });

  it('caps results at the default limit of 10', () => {
    expect(searchDomains('com').length).toBeLessThanOrEqual(10);
  });

  it('honours an explicit limit', () => {
    expect(searchDomains('com', 3).length).toBeLessThanOrEqual(3);
  });

  it('sorts matches by rank', () => {
    const ranks = searchDomains('a', 10).map((r) => r.rank);

    expect([...ranks].sort((x, y) => x - y)).toEqual(ranks);
  });

  it('returns an empty array when nothing matches', () => {
    expect(searchDomains('zzzzz-no-such-domain-zzzzz')).toEqual([]);
  });
});

describe('getAllDomains', () => {
  it('returns every entry in ascending rank order', () => {
    const ranks = getAllDomains().map((d) => d.rank);

    expect([...ranks].sort((a, b) => a - b)).toEqual(ranks);
  });

  it('gives every entry a domain and a name field', () => {
    for (const entry of getAllDomains().slice(0, 200)) {
      expect(typeof entry.domain).toBe('string');
      expect(entry.domain.length).toBeGreaterThan(0);
      expect(typeof entry.name).toBe('string');
    }
  });
});
