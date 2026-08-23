/**
 * The Page Settings control's popup: it is a panel of its own, portalled out
 * of the toolbar dropdown that lists it so the two sit side by side instead of
 * on top of each other, and it stays open while it is being used.
 */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { EditorContext } from '@tiptap/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { RichTextPagination } from '@/extensions/Pagination/components/RichTextPagination';

// React 19 flags this when `act()` is used outside a test renderer.
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

/** Only `editor.commands` is dereferenced, and every command is optional. */
const editor = { commands: {} } as any;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  // Stands in for the toolbar dropdown the control is listed in.
  container.className = 'dropdown-portal';
  document.body.append(container);
  root = createRoot(container);

  act(() => {
    root.render(
      <EditorContext.Provider value={{ editor }}>
        <RichTextPagination />
      </EditorContext.Provider>,
    );
  });
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

/** The gear that opens the panel. */
function trigger() {
  return container.querySelector('button[title="Page settings"]') as HTMLButtonElement;
}

function panel() {
  return document.body.querySelector('[data-richtext-portal]') as HTMLElement | null;
}

/** Presses `target` the way an outside-click listener sees it. */
function press(target: Element) {
  act(() => {
    target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
  });
}

describe('RichTextPagination', () => {
  it('opens the panel outside the menu that lists it', () => {
    expect(panel()).toBeNull();

    act(() => trigger().click());

    const opened = panel();
    expect(opened).not.toBeNull();
    // Portalled to <body>: nested inside the menu it would be drawn on top of
    // it and clipped by its scroll box.
    expect(container.contains(opened)).toBe(false);
    // Marked as part of the toolbar's overlay stack, which is what keeps the
    // menu underneath open while the panel is in use.
    expect(opened!.classList.contains('dropdown-portal')).toBe(true);
  });

  it('stays open while its own controls are used', () => {
    act(() => trigger().click());

    const tab = panel()!.querySelector('button') as HTMLButtonElement;
    press(tab);
    act(() => tab.click());
    expect(panel()).not.toBeNull();

    // A control that re-renders reports a target already detached from the
    // document by the time the listener runs; that is not "outside" either.
    const detached = document.createElement('button');
    press(detached);
    expect(panel()).not.toBeNull();
  });

  it('closes on a press outside itself and its trigger', () => {
    act(() => trigger().click());
    expect(panel()).not.toBeNull();

    const outside = document.createElement('div');
    document.body.append(outside);
    press(outside);
    outside.remove();

    expect(panel()).toBeNull();
  });
});
