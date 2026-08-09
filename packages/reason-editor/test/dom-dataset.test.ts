import { describe, expect, it, vi } from 'vitest';
import {
  getDatasetAttribute,
  jsonToDOMDataset,
  jsonToStr,
  nodeAttrsToDataset,
  strToJSON,
} from '../src/utils/dom-dataset';

describe('jsonToStr', () => {
  it('serializes a plain object', () => {
    expect(jsonToStr({ a: 1 })).toBe('{"a":1}');
  });

  it('falls back to "{}" for a circular structure', () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    expect(jsonToStr(circular)).toBe('{}');
  });
});

describe('strToJSON', () => {
  it('parses valid JSON', () => {
    expect(strToJSON('{"a":1}')).toEqual({ a: 1 });
  });

  it('returns an empty object for invalid JSON', () => {
    expect(strToJSON('not json')).toEqual({});
  });
});

describe('jsonToDOMDataset', () => {
  it('prefixes each key with data- and encodes the value', () => {
    expect(jsonToDOMDataset({ width: '100%' })).toEqual([{ key: 'data-width', value: '100%25' }]);
  });

  it('serializes object values before encoding', () => {
    const [entry] = jsonToDOMDataset({ meta: { a: 1 } });

    expect(entry.key).toBe('data-meta');
    expect(decodeURIComponent(entry.value)).toBe('{"a":1}');
  });

  it('returns one entry per key', () => {
    expect(jsonToDOMDataset({ a: '1', b: '2' })).toHaveLength(2);
  });

  it('returns an empty list for an empty object', () => {
    expect(jsonToDOMDataset({})).toEqual([]);
  });
});

describe('getDatasetAttribute', () => {
  function element(html: string): HTMLElement {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.firstElementChild as HTMLElement;
  }

  it('reads a data- attribute and coerces numeric values', () => {
    const el = element('<img data-width="640" />');

    expect(getDatasetAttribute('width')(el)).toBe(640);
  });

  it('accepts an attribute name that already carries the data- prefix', () => {
    const el = element('<img data-width="640" />');

    expect(getDatasetAttribute('data-width')(el)).toBe(640);
  });

  it('decodes percent-encoded values', () => {
    const el = element('<img data-width="100%25" />');

    expect(getDatasetAttribute('width')(el)).toBe('100%');
  });

  it('keeps "auto" as a string', () => {
    const el = element('<img data-width="auto" />');

    expect(getDatasetAttribute('width')(el)).toBe('auto');
  });

  it('returns a non-numeric value as a string', () => {
    const el = element('<img data-align="center" />');

    expect(getDatasetAttribute('align')(el)).toBe('center');
  });

  it('parses JSON when transformToJSON is set', () => {
    const el = element(`<img data-meta="${encodeURIComponent('{"a":1}')}" />`);

    expect(getDatasetAttribute('meta', true)(el)).toEqual({ a: 1 });
  });

  it('returns an empty object when JSON parsing fails', () => {
    const el = element('<img data-meta="nope" />');

    expect(getDatasetAttribute('meta', true)(el)).toEqual({});
  });

  it('falls back to scraping outerHTML when the attribute reads as "null"', () => {
    const el = element('<img data-width="null" width="320" />');

    expect(getDatasetAttribute('width')(el)).toBe(320);
  });

  it('unescapes &quot; in the outerHTML fallback path', () => {
    const el = element('<img data-meta="null" meta="&quot;quoted&quot;" />');

    expect(getDatasetAttribute('meta')(el)).toBe('"quoted"');
  });

  it('logs and recovers when the fallback path throws', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const broken = {
      getAttribute: () => 'null',
      get outerHTML(): string {
        throw new Error('detached');
      },
    } as unknown as HTMLElement;

    expect(() => getDatasetAttribute('width')(broken)).not.toThrow();
    expect(error).toHaveBeenCalled();
  });
});

describe('nodeAttrsToDataset', () => {
  it('copies scalar attributes through', () => {
    const node = { attrs: { width: 640, align: 'center' } } as unknown as Node;

    expect({ ...nodeAttrsToDataset(node) }).toEqual({ width: 640, align: 'center' });
  });

  it('stringifies object attributes', () => {
    const node = { attrs: { meta: { a: 1 } } } as unknown as Node;

    expect(nodeAttrsToDataset(node).meta).toBe('{"a":1}');
  });

  it('drops null and undefined attributes', () => {
    const node = { attrs: { a: 1, b: null, c: undefined } } as unknown as Node;

    expect(Object.keys(nodeAttrsToDataset(node))).toEqual(['a']);
  });

  it('returns an empty result for a node with no attributes', () => {
    const node = { attrs: {} } as unknown as Node;

    expect(Object.keys(nodeAttrsToDataset(node))).toEqual([]);
  });
});
