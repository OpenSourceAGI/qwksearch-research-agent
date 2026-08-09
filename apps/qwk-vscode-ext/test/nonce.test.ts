import { describe, expect, it } from 'vitest';
import { getNonce } from '../src/nonce';

describe('getNonce', () => {
  it('returns a 32 character nonce', () => {
    expect(getNonce()).toHaveLength(32);
  });

  it('uses only alphanumeric characters, so it is CSP-safe unquoted', () => {
    for (let i = 0; i < 50; i++) {
      expect(getNonce()).toMatch(/^[A-Za-z0-9]{32}$/);
    }
  });

  it('produces a different value on every call', () => {
    const nonces = new Set(Array.from({ length: 200 }, () => getNonce()));

    expect(nonces.size).toBe(200);
  });
});
