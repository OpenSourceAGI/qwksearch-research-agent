import { describe, expect, it } from 'vitest';
import type { Editor } from '@tiptap/core';
import {
  clamp,
  ensureNameValueOptions,
  getCssUnitWithDefault,
  hasExtension,
  isBoolean,
  isFunction,
  isNumber,
  isString,
} from '../src/utils/utils';

describe('clamp', () => {
  it('returns the value when it is inside the range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it('clamps to the bounds', () => {
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
  });

  it('leaves values sitting exactly on a bound alone', () => {
    expect(clamp(0, 0, 10)).toBe(0);
    expect(clamp(10, 0, 10)).toBe(10);
  });

  it('handles negative ranges', () => {
    expect(clamp(-5, -10, -1)).toBe(-5);
    expect(clamp(0, -10, -1)).toBe(-1);
  });
});

describe('type guards', () => {
  it('isNumber', () => {
    expect(isNumber(1)).toBe(true);
    expect(isNumber(Number.NaN)).toBe(true);
    expect(isNumber('1')).toBe(false);
    expect(isNumber(null)).toBe(false);
  });

  it('isString', () => {
    expect(isString('')).toBe(true);
    expect(isString(1)).toBe(false);
    expect(isString(undefined)).toBe(false);
  });

  it('isBoolean', () => {
    expect(isBoolean(false)).toBe(true);
    expect(isBoolean(0)).toBe(false);
  });

  it('isFunction', () => {
    expect(isFunction(() => {})).toBe(true);
    expect(isFunction(class {})).toBe(true);
    expect(isFunction({})).toBe(false);
  });
});

describe('getCssUnitWithDefault', () => {
  it('returns falsy input unchanged', () => {
    expect(getCssUnitWithDefault(undefined)).toBeUndefined();
    expect(getCssUnitWithDefault('')).toBe('');
    expect(getCssUnitWithDefault(0)).toBe(0);
  });

  it('appends the default unit to a bare number', () => {
    expect(getCssUnitWithDefault(12)).toBe('12px');
    expect(getCssUnitWithDefault('12')).toBe('12px');
  });

  it('honours an explicit default unit', () => {
    expect(getCssUnitWithDefault(12, 'rem')).toBe('12rem');
  });

  it('keeps a unit that is already present', () => {
    expect(getCssUnitWithDefault('12em')).toBe('12em');
    expect(getCssUnitWithDefault('50%')).toBe('50%');
    expect(getCssUnitWithDefault('12pt', 'rem')).toBe('12pt');
  });

  it('preserves fractional values', () => {
    expect(getCssUnitWithDefault('1.5')).toBe('1.5px');
  });

  it('returns non-numeric input unchanged', () => {
    expect(getCssUnitWithDefault('auto')).toBe('auto');
  });
});

describe('ensureNameValueOptions', () => {
  it('expands bare strings into name/value pairs', () => {
    expect(ensureNameValueOptions(['a', 'b'])).toEqual([
      { value: 'a', name: 'a' },
      { value: 'b', name: 'b' },
    ]);
  });

  it('leaves objects untouched', () => {
    const option = { value: 'a', name: 'Alpha' };

    expect(ensureNameValueOptions([option])[0]).toBe(option);
  });

  it('handles a mixed list', () => {
    expect(ensureNameValueOptions(['a', { value: 'b', name: 'Bravo' }])).toEqual([
      { value: 'a', name: 'a' },
      { value: 'b', name: 'Bravo' },
    ]);
  });

  it('returns an empty array for empty input', () => {
    expect(ensureNameValueOptions([])).toEqual([]);
  });
});

describe('hasExtension', () => {
  function editorWith(names: string[]) {
    return { extensionManager: { extensions: names.map((name) => ({ name })) } } as unknown as Editor;
  }

  it('finds a registered extension by name', () => {
    expect(hasExtension(editorWith(['bold', 'italic']), 'bold')).toBe(true);
  });

  it('returns false for an unregistered extension', () => {
    expect(hasExtension(editorWith(['bold']), 'katex')).toBe(false);
  });

  it('returns false when there is no editor', () => {
    expect(hasExtension(undefined as unknown as Editor, 'bold')).toBe(false);
  });

  it('returns false when the editor has no extension manager', () => {
    expect(hasExtension({} as Editor, 'bold')).toBe(false);
  });
});
