import { describe, expect, it, vi } from 'vitest';
import { convertColorToRGBA, getRandomColor } from '../src/utils/color';

describe('getRandomColor', () => {
  it('returns a hex colour from the palette', () => {
    expect(getRandomColor()).toMatch(/^#[0-9A-F]{6}$/i);
  });

  it('picks the first palette entry at the bottom of the range', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    expect(getRandomColor()).toBe('#47A1FF');
  });

  it('stays inside the palette at the top of the range', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999999);

    expect(getRandomColor()).toBe('#9861E5');
  });

  it('produces more than one distinct colour over many calls', () => {
    const seen = new Set(Array.from({ length: 100 }, () => getRandomColor()));

    expect(seen.size).toBeGreaterThan(1);
  });
});

describe('convertColorToRGBA', () => {
  it('converts a six-digit hex colour', () => {
    expect(convertColorToRGBA('#FF8000')).toBe('rgba(255,128,0,1)');
  });

  it('expands a three-digit shorthand hex colour', () => {
    expect(convertColorToRGBA('#F80')).toBe('rgba(255,136,0,1)');
  });

  it('is case insensitive', () => {
    expect(convertColorToRGBA('#ff8000')).toBe(convertColorToRGBA('#FF8000'));
  });

  it('applies a fractional opacity', () => {
    expect(convertColorToRGBA('#000000', 0.5)).toBe('rgba(0,0,0,0.5)');
  });

  it('treats an opacity above 1 as a percentage', () => {
    expect(convertColorToRGBA('#000000', 50)).toBe('rgba(0,0,0,0.5)');
    expect(convertColorToRGBA('#000000', 100)).toBe('rgba(0,0,0,1)');
  });

  it('re-parses an existing rgb() string', () => {
    expect(convertColorToRGBA('rgb(1,2,3)', 0.25)).toBe('rgba(1,2,3,0.25)');
  });

  it('tolerates whitespace inside rgb()', () => {
    expect(convertColorToRGBA('rgb(1, 2, 3)')).toBe('rgba(1,2,3,1)');
  });

  it('returns an unrecognized colour format unchanged', () => {
    expect(convertColorToRGBA('rebeccapurple')).toBe('rebeccapurple');
    expect(convertColorToRGBA('')).toBe('');
  });

  it('handles the palette colours end to end', () => {
    expect(convertColorToRGBA('#47A1FF')).toBe('rgba(71,161,255,1)');
  });
});
