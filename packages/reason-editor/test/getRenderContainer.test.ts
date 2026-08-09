import { afterEach, describe, expect, it } from 'vitest';
import { getRenderContainer } from '../src/utils/getRenderContainer';

/** Stand-in for the bits of the editor `getRenderContainer` actually reads. */
function fakeEditor(node: Node, from = 1) {
  return {
    view: { domAtPos: () => ({ node }) },
    state: { selection: { from } },
  } as any;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('getRenderContainer', () => {
  it('returns the innermost focused element matching the data-type', () => {
    document.body.innerHTML = `
      <div class="has-focus" data-type="image"></div>
      <div class="has-focus" data-type="video"></div>
    `;

    const result = getRenderContainer(fakeEditor(document.body), 'video');

    expect(result.dataset.type).toBe('video');
  });

  it('returns the innermost focused element matching by class name', () => {
    document.body.innerHTML = `<div class="has-focus callout"></div>`;

    const result = getRenderContainer(fakeEditor(document.body), 'callout');

    expect(result.classList.contains('callout')).toBe(true);
  });

  it('walks up from the selection DOM node when nothing is focused', () => {
    document.body.innerHTML = `
      <section class="callout"><p><span id="leaf">text</span></p></section>
    `;
    const leaf = document.querySelector('#leaf')!;

    const result = getRenderContainer(fakeEditor(leaf), 'callout');

    expect(result.tagName).toBe('SECTION');
  });

  it('climbs to the element parent when the selection resolves to a text node', () => {
    document.body.innerHTML = `<section class="callout"><p>text</p></section>`;
    const textNode = document.querySelector('p')!.firstChild!;

    const result = getRenderContainer(fakeEditor(textNode), 'callout');

    expect(result.tagName).toBe('SECTION');
  });

  it('returns null when no ancestor matches', () => {
    document.body.innerHTML = `<section><p id="leaf">text</p></section>`;
    const leaf = document.querySelector('#leaf')!;

    expect(getRenderContainer(fakeEditor(leaf), 'nowhere')).toBeNull();
  });

  it('ignores a focused element whose type does not match and falls back to the walk', () => {
    document.body.innerHTML = `
      <div class="has-focus" data-type="image"></div>
      <section class="callout"><p id="leaf">text</p></section>
    `;
    const leaf = document.querySelector('#leaf')!;

    const result = getRenderContainer(fakeEditor(leaf), 'callout');

    expect(result.tagName).toBe('SECTION');
  });
});
