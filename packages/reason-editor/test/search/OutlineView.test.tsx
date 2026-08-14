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

function mount(props: { headings?: TocEntry[]; searchQuery?: string } = {}) {
  act(() => {
    root.render(<OutlineView headings={props.headings ?? HEADINGS} searchQuery={props.searchQuery} />);
  });
}

function headingRow(text: string) {
  return Array.from(container.querySelectorAll('span')).find((el) => el.textContent === text)?.closest('div');
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
});
