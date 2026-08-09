import { describe, expect, it, vi } from 'vitest';

const constructed: unknown[] = [];
class FakeSearch {
  constructor() {
    constructed.push(this);
  }
}

vi.mock('search-web-api', () => ({ Search: FakeSearch }));

const { getSearchInstance } = await import('../src/lib/search-instance.js');

describe('getSearchInstance', () => {
  it('returns a Search instance', () => {
    expect(getSearchInstance()).toBeInstanceOf(FakeSearch);
  });

  it('constructs the instance lazily and only once', () => {
    const first = getSearchInstance();
    const second = getSearchInstance();

    expect(second).toBe(first);
    expect(constructed).toHaveLength(1);
  });
});
