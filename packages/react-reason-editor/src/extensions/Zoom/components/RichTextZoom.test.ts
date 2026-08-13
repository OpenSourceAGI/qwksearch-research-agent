import { describe, it, expect } from 'vitest';
import { DEFAULT_ZOOM, clampZoom, zoomIn, zoomOut } from './RichTextZoom';

describe('DEFAULT_ZOOM', () => {
  it('defaults the reasoning view to 125% zoom', () => {
    expect(DEFAULT_ZOOM).toBe(1.25);
  });
});

describe('clampZoom', () => {
  it('leaves in-range values unchanged', () => {
    expect(clampZoom(1)).toBe(1);
    expect(clampZoom(1.25)).toBe(1.25);
  });

  it('clamps values below the minimum', () => {
    expect(clampZoom(0.1)).toBe(0.5);
  });

  it('clamps values above the maximum', () => {
    expect(clampZoom(5)).toBe(2);
  });
});

describe('zoomIn', () => {
  it('increases the scale by one step', () => {
    expect(zoomIn(1)).toBe(1.25);
  });

  it('stops at the maximum zoom', () => {
    expect(zoomIn(2)).toBe(2);
    expect(zoomIn(1.9)).toBe(2);
  });
});

describe('zoomOut', () => {
  it('decreases the scale by one step', () => {
    expect(zoomOut(1)).toBe(0.75);
  });

  it('stops at the minimum zoom', () => {
    expect(zoomOut(0.5)).toBe(0.5);
    expect(zoomOut(0.6)).toBe(0.5);
  });
});
