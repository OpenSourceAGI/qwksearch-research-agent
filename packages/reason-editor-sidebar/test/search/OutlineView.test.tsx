/**
 * Regression coverage for the outline filter's ancestor-collapse and
 * has-children checks, which must resolve a filtered item back to its real
 * position in the unfiltered outline rather than its position in the
 * filtered list.
 */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { OutlineView, computeScrollIntoViewOffset } from '../../src/search/OutlineView';
import type { ActiveHeadingEditorHandle } from '../../src/search/useActiveHeading';
import type { TocEntry } from '../../src/app-types/toc';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

// Introduction (h1)
//   Setup (h2)
//   Details (h2)
// Conclusion (h1)
const HEADINGS: TocEntry[] = [
  ['h1', 'Introduction', 'h1'],
  ['h2', 'Setup', 'h2'],
  ['h2b', 'Details', 'h2'],
  ['h3', 'Conclusion', 'h1'],
];

function mount(
  props: {
    headings?: TocEntry[];
    searchQuery?: string;
    editorRef?: { current: ActiveHeadingEditorHandle | null };
  } = {},
) {
  act(() => {
    root.render(
      <OutlineView
        headings={props.headings ?? HEADINGS}
        searchQuery={props.searchQuery}
        editorRef={props.editorRef}
      />,
    );
  });
}

/**
 * Builds a fake `editorRef` whose `getElementByKey` resolves each heading key
 * to a detached element with a stubbed `getBoundingClientRect`, so scroll-spy
 * math can be exercised without a real scrollable document.
 */
function mockEditorRef(tops: Record<string, number>): { current: ActiveHeadingEditorHandle | null } {
  const elements = new Map<string, HTMLElement>();
  for (const [key, top] of Object.entries(tops)) {
    const el = document.createElement('div');
    el.getBoundingClientRect = () => ({ top, bottom: top + 20, left: 0, right: 0, height: 20, width: 0, x: 0, y: top, toJSON() {} });
    elements.set(key, el);
  }
  return { current: { getElementByKey: (key: string) => elements.get(key) ?? null } };
}

function headingRow(text: string) {
  // Each row is wrapped in a `ContextMenuTrigger`-rendered `<span>` whose
  // aggregated textContent also equals the row's heading text, so matching
  // on textContent alone can resolve to that wrapper instead of the row's
  // own `<div>` (walking `.closest('div')` up from the wrapper span skips
  // right past the row div to the shared outline container div). Restricting
  // to leaf spans (no element children) targets the actual `{item.text}`
  // span, whose immediate parent is the row's own div.
  return Array.from(container.querySelectorAll('span'))
    .find((el) => el.children.length === 0 && el.textContent === text)
    ?.closest('div');
}

function toggleButton(text: string) {
  return headingRow(text)?.querySelector('button') as HTMLButtonElement | undefined;
}

/**
 * jsdom's `offsetTop`/`offsetHeight`/`clientHeight`/`scrollTop` are always 0
 * (no real layout engine), so tests that exercise the outline panel's
 * auto-scroll-into-view effect stub them per-element with `defineProperty`
 * (plain assignment throws on the getter-only layout properties).
 */
function stubLayout(el: HTMLElement, props: Record<string, number>) {
  for (const [key, value] of Object.entries(props)) {
    Object.defineProperty(el, key, { value, writable: true, configurable: true });
  }
}

function outlineContainer(): HTMLDivElement {
  return container.querySelector('.overflow-auto') as HTMLDivElement;
}

function collapseFirstHeading() {
  // The first rendered row is "Introduction"; its toggle button is its own
  // expand/collapse chevron, distinct from the row's onClick navigation.
  act(() => {
    toggleButton('Introduction')!.click();
  });
}

describe('OutlineView', () => {
  it('renders every heading when there is no search query', () => {
    mount();

    expect(headingRow('Introduction')).toBeTruthy();
    expect(headingRow('Setup')).toBeTruthy();
    expect(headingRow('Details')).toBeTruthy();
    expect(headingRow('Conclusion')).toBeTruthy();
  });

  it('hides a filtered item whose ancestor is collapsed, even though it is first in the filtered list', () => {
    mount();
    collapseFirstHeading();

    // Re-render with a query that narrows the list to just "Details" (real
    // index 2), which becomes index 0 within the filtered list. A naive
    // implementation that checks ancestor-collapse using the filtered-list
    // index instead of the real index would look up "Introduction" (real
    // index 0) instead of "Details", find no earlier collapsed ancestor,
    // and incorrectly show the row.
    mount({ searchQuery: 'Details' });

    expect(headingRow('Details')).toBeFalsy();
  });

  it('still shows a filtered item when its ancestor is not collapsed', () => {
    mount({ searchQuery: 'Details' });

    expect(headingRow('Details')).toBeTruthy();
  });

  it('does not show an expand chevron for a filtered last-heading with no children', () => {
    // "Conclusion" (real index 3, the last heading) has no children. Filtered
    // down to just this item, it sits at filtered-list index 0 — the same
    // position "Introduction" (which does have children) occupies in the
    // unfiltered list. A naive implementation that derives `hasChildren` from
    // the filtered-list index would incorrectly show a chevron.
    mount({ searchQuery: 'Conclusion' });

    const chevronButton = toggleButton('Conclusion');
    expect(chevronButton?.className).toContain('invisible');
  });

  it('shows an expand chevron for a filtered heading that does have children', () => {
    mount({ searchQuery: 'Introduction' });

    const chevronButton = toggleButton('Introduction');
    expect(chevronButton?.className).not.toContain('invisible');
  });

  it('shows a "no headings" placeholder when the outline is empty', () => {
    mount({ headings: [] });

    expect(container.textContent).toContain('No headings found in this document');
  });

  it('does not mark any row active when no editorRef is supplied', () => {
    mount();

    expect(container.querySelector('[data-active]')).toBeFalsy();
  });

  it('highlights the heading the reader has scrolled to as active', () => {
    // jsdom's default window.innerHeight is 768, so the scroll-spy threshold
    // is 768 * 0.3 = 230.4. "Setup" (top: 100) has scrolled past it while
    // "Details" (top: 300) has not, so "Setup" is the active heading.
    const editorRef = mockEditorRef({ h1: -50, h2: 100, h2b: 300, h3: 600 });
    mount({ editorRef });

    expect(headingRow('Setup')?.getAttribute('data-active')).toBe('true');
    expect(headingRow('Introduction')?.hasAttribute('data-active')).toBe(false);
    expect(headingRow('Details')?.hasAttribute('data-active')).toBe(false);
  });

  it('falls back to the first heading when the reader has not scrolled past any heading', () => {
    const editorRef = mockEditorRef({ h1: 400, h2: 500, h2b: 600, h3: 700 });
    mount({ editorRef });

    expect(headingRow('Introduction')?.getAttribute('data-active')).toBe('true');
  });

  it('scrolls the panel down when the newly active row is below the visible area', () => {
    mount();
    stubLayout(outlineContainer(), { clientHeight: 100, scrollTop: 0 });
    stubLayout(headingRow('Details')!, { offsetTop: 150, offsetHeight: 20 });

    // threshold = 768 * 0.3 = 230.4; h1/h2/h2b are all <= threshold, h3 is
    // not, so "Details" (h2b) is the active heading.
    const editorRef = mockEditorRef({ h1: -300, h2: -100, h2b: 50, h3: 600 });
    mount({ editorRef });

    expect(outlineContainer().scrollTop).toBe(70);
  });

  it('scrolls the panel up when the newly active row is above the visible area', () => {
    mount();
    stubLayout(outlineContainer(), { clientHeight: 100, scrollTop: 70 });
    stubLayout(headingRow('Introduction')!, { offsetTop: 0, offsetHeight: 20 });

    const editorRef = mockEditorRef({ h1: 400, h2: 500, h2b: 600, h3: 700 });
    mount({ editorRef });

    expect(outlineContainer().scrollTop).toBe(0);
  });

  it('does not scroll the panel when the newly active row is already fully visible', () => {
    mount();
    stubLayout(outlineContainer(), { clientHeight: 100, scrollTop: 20 });
    stubLayout(headingRow('Setup')!, { offsetTop: 30, offsetHeight: 20 });

    const editorRef = mockEditorRef({ h1: -50, h2: 100, h2b: 300, h3: 600 });
    mount({ editorRef });

    expect(outlineContainer().scrollTop).toBe(20);
  });

  it('does not scroll when no editorRef is supplied (no active heading)', () => {
    mount();
    const el = outlineContainer();
    stubLayout(el, { clientHeight: 100, scrollTop: 42 });

    // Re-render without changing anything active-heading related.
    mount();

    expect(el.scrollTop).toBe(42);
  });
});

describe('computeScrollIntoViewOffset', () => {
  const container = { scrollTop: 50, clientHeight: 100 };

  it('scrolls up to the row’s top when the row starts above the visible area', () => {
    const offset = computeScrollIntoViewOffset(container, { offsetTop: 20, offsetHeight: 20 });
    expect(offset).toBe(20);
  });

  it('scrolls down just enough to reveal the row’s bottom when it ends below the visible area', () => {
    // viewport bottom = 150; row bottom = 160 + 20 = 180; needed scrollTop = 180 - 100 = 80.
    const offset = computeScrollIntoViewOffset(container, { offsetTop: 160, offsetHeight: 20 });
    expect(offset).toBe(80);
  });

  it('returns null when the row is already fully visible', () => {
    const offset = computeScrollIntoViewOffset(container, { offsetTop: 60, offsetHeight: 20 });
    expect(offset).toBeNull();
  });

  it('returns null when the row exactly fills the visible area’s edges', () => {
    // row spans [50, 150), exactly the container's visible [scrollTop, scrollTop + clientHeight) range.
    const offset = computeScrollIntoViewOffset(container, { offsetTop: 50, offsetHeight: 100 });
    expect(offset).toBeNull();
  });
});
