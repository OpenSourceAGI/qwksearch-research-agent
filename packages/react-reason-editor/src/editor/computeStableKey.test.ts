import { describe, it, expect } from 'vitest';
import { computeStableKey } from './computeStableKey';

describe('computeStableKey', () => {
  it('uses contentKey when reloadToken is omitted', () => {
    expect(computeStableKey('doc-1', 'hello world')).toBe('doc-1');
  });

  it('falls back to a content prefix when contentKey is omitted', () => {
    expect(computeStableKey(undefined, 'hello world')).toBe('hello world'.slice(0, 40));
  });

  it('stays the same across re-renders with an unchanged reloadToken', () => {
    expect(computeStableKey('doc-1', 'hello world', 0)).toBe(computeStableKey('doc-1', 'hello world', 0));
  });

  it('changes when reloadToken changes, even though contentKey is unchanged', () => {
    const before = computeStableKey('doc-1', 'hello world', 0);
    const after = computeStableKey('doc-1', 'hello world', 1);

    expect(after).not.toBe(before);
  });

  it('incorporates both contentKey and reloadToken so different documents never collide', () => {
    const docA = computeStableKey('doc-a', 'content', 1);
    const docB = computeStableKey('doc-b', 'content', 1);

    expect(docA).not.toBe(docB);
  });
});
