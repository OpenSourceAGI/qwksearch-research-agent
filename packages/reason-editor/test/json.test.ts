import { describe, expect, it } from 'vitest';
import { safeJSONParse, safeJSONStringify } from '../src/utils/json';

describe('safeJSONParse', () => {
  it('parses a valid JSON string', () => {
    expect(safeJSONParse('{"a":1}')).toEqual({ a: 1 });
    expect(safeJSONParse('[1,2,3]')).toEqual([1, 2, 3]);
  });

  it('returns an object input untouched rather than re-parsing it', () => {
    const input = { already: 'parsed' };
    expect(safeJSONParse(input)).toBe(input);
  });

  it('returns an empty object for malformed JSON by default', () => {
    expect(safeJSONParse('{not json')).toEqual({});
  });

  it('returns the supplied default for malformed JSON', () => {
    expect(safeJSONParse('{not json', { fallback: true })).toEqual({ fallback: true });
    expect(safeJSONParse(undefined, 'nope')).toBe('nope');
  });

  it('parses JSON scalars', () => {
    expect(safeJSONParse('42')).toBe(42);
    expect(safeJSONParse('"text"')).toBe('text');
    expect(safeJSONParse('true')).toBe(true);
  });

  it('passes null straight through, since typeof null is "object"', () => {
    expect(safeJSONParse(null)).toBeNull();
  });
});

describe('safeJSONStringify', () => {
  it('serializes plain values', () => {
    expect(safeJSONStringify({ a: 1 })).toBe('{"a":1}');
    expect(safeJSONStringify([1, 2])).toBe('[1,2]');
    expect(safeJSONStringify('text')).toBe('"text"');
  });

  it('returns "{}" for a circular structure', () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    expect(safeJSONStringify(circular)).toBe('{}');
  });

  it('returns the supplied default for a circular structure', () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    expect(safeJSONStringify(circular, '[]')).toBe('[]');
  });

  it('round-trips with safeJSONParse', () => {
    const value = { nested: { list: [1, 2, 3] } };

    expect(safeJSONParse(safeJSONStringify(value))).toEqual(value);
  });
});
