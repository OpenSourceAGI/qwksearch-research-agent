/**
 * Regression coverage for the outline filter's ancestor-collapse and
 * has-children checks, which must resolve a filtered item back to its real
 * position in the unfiltered outline rather than its position in the
 * filtered list.
 */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { OutlineView } from '@/search/OutlineView';
import type { ActiveHeadingEditorHandle } from '@/search/useActiveHeading';
import type { TocEntry } from '@/app-types/toc';

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
});
