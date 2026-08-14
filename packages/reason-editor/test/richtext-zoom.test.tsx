/**
 * Confirms the REASON editor's zoom toolbar control defaults to 125% on
 * mount and that in/out clicks still step and clamp correctly from there.
 */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { DEFAULT_ZOOM_SCALE, RichTextZoom } from '@/extensions/Zoom/components/RichTextZoom';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
let proseMirror: HTMLDivElement;

beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);

  proseMirror = document.createElement('div');
  proseMirror.className = 'ProseMirror';
  document.body.append(proseMirror);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  proseMirror.remove();
});

function mount() {
  act(() => {
    root.render(<RichTextZoom />);
  });
}

function zoomOutButton() {
  return container.querySelector('button[title^="Zoom Out"]') as HTMLButtonElement;
}

function zoomInButton() {
  return container.querySelector('button[title^="Zoom In"]') as HTMLButtonElement;
}

describe('RichTextZoom', () => {
  it('defaults to 125% and applies it to the editor content on mount', () => {
    mount();

    expect(DEFAULT_ZOOM_SCALE).toBe(1.25);
    expect(proseMirror.style.transform).toBe('scale(1.25)');
    expect(zoomInButton().title).toBe('Zoom In (125%)');
    expect(zoomOutButton().title).toBe('Zoom Out (125%)');
  });

  it('steps up from the 125% default and updates the applied transform', () => {
    mount();

    act(() => zoomInButton().click());

    expect(zoomInButton().title).toBe('Zoom In (150%)');
    expect(proseMirror.style.transform).toBe('scale(1.5)');
  });

  it('steps down from the 125% default and clamps at the 50% floor', () => {
    mount();

    act(() => zoomOutButton().click());
    expect(proseMirror.style.transform).toBe('scale(1)');

    act(() => zoomOutButton().click());
    expect(proseMirror.style.transform).toBe('scale(0.75)');

    act(() => zoomOutButton().click());
    expect(proseMirror.style.transform).toBe('scale(0.5)');

    act(() => zoomOutButton().click());
    expect(proseMirror.style.transform).toBe('scale(0.5)');
    expect(zoomOutButton().title).toBe('Zoom Out (50%)');
  });
});
