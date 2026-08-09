import { beforeEach, describe, expect, it } from 'vitest';
import { getStorage, setStorage, ssrSafeLocalStorage } from '../src/utils/storage';

describe('getStorage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('returns null by default for a missing key', () => {
    expect(getStorage('missing')).toBeNull();
  });

  it('returns the supplied default for a missing key', () => {
    expect(getStorage('missing', 'fallback')).toBe('fallback');
  });

  it('parses stored JSON', () => {
    window.localStorage.setItem('key', JSON.stringify({ a: 1 }));

    expect(getStorage('key')).toEqual({ a: 1 });
  });

  it('returns the raw string when the value is not JSON', () => {
    window.localStorage.setItem('key', 'plain text');

    expect(getStorage('key')).toBe('plain text');
  });

  it('treats an empty stored string as absent', () => {
    window.localStorage.setItem('key', '');

    expect(getStorage('key', 'fallback')).toBe('fallback');
  });
});

describe('setStorage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('writes a string value', () => {
    setStorage('key', 'value');

    expect(window.localStorage.getItem('key')).toBe('value');
  });

  it('stringifies non-string values', () => {
    setStorage('num', 42);

    expect(window.localStorage.getItem('num')).toBe('42');
  });

  it('round-trips a JSON payload through getStorage', () => {
    setStorage('obj', JSON.stringify({ a: 1 }));

    expect(getStorage('obj')).toEqual({ a: 1 });
  });
});

describe('ssrSafeLocalStorage', () => {
  it('is the real localStorage when a window exists', () => {
    expect(ssrSafeLocalStorage).toBe(window.localStorage);
  });

  it('implements the Storage interface', () => {
    for (const method of ['getItem', 'setItem', 'removeItem', 'clear', 'key']) {
      expect(typeof (ssrSafeLocalStorage as unknown as Record<string, unknown>)[method]).toBe(
        'function'
      );
    }
  });
});
