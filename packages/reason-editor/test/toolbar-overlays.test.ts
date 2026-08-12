/**
 * The toolbar's dismissal and focus rules — the ones that decide whether a
 * press tears down an open dropdown, or belongs to something the dropdown
 * itself put on screen.
 */

import { afterEach, describe, expect, it } from 'vitest';

import {
  shouldDismissPanel,
  shouldKeepEditorFocus,
} from '../src/editor-views/components/toolbarOverlays';

const created: Element[] = [];

/** Appends an element to the document body and tracks it for cleanup. */
function mount(html: string): HTMLElement {
  const host = document.createElement('div');
  host.innerHTML = html;
  const element = host.firstElementChild as HTMLElement;
  document.body.append(element);
  created.push(element);
  return element;
}

afterEach(() => {
  created.splice(0).forEach((element) => element.remove());
});

describe('shouldDismissPanel', () => {
  it('dismisses on a press somewhere unrelated', () => {
    const outside = mount('<p>page content</p>');

    expect(shouldDismissPanel(outside)).toBe(true);
  });

  it('keeps the panel open when the press is inside it', () => {
    const panel = mount('<div class="dropdown-portal"><button>Cut</button></div>');

    expect(shouldDismissPanel(panel.querySelector('button'))).toBe(false);
  });

  it('keeps the panel open when the press is on its trigger', () => {
    const trigger = mount('<div class="dropdown-container"><button>Edit</button></div>');

    expect(shouldDismissPanel(trigger.querySelector('button'))).toBe(false);
  });

  it('keeps the panel open for a press in a portalled Radix surface', () => {
    // What the colour picker and the font list look like from the DOM's side:
    // attached to <body>, nowhere near the panel that rendered them.
    const popover = mount('<div data-richtext-portal><span>swatch</span></div>');

    expect(shouldDismissPanel(popover.querySelector('span'))).toBe(false);
  });

  it('keeps the panel open for a press inside a dialog', () => {
    const dialog = mount('<div role="dialog"><input /></div>');

    expect(shouldDismissPanel(dialog.querySelector('input'))).toBe(false);
  });

  it('keeps the panel open while a dialog is on top of it, wherever the press lands', () => {
    mount('<div role="dialog"><input /></div>');
    const elsewhere = mount('<p>page content</p>');

    // The press dismisses the dialog; the panel underneath renders it and must
    // outlive it.
    expect(shouldDismissPanel(elsewhere)).toBe(false);
  });

  it('dismisses again once the layer on top has closed', () => {
    const dialog = mount('<div role="dialog"><input /></div>');
    const elsewhere = mount('<p>page content</p>');

    dialog.remove();

    expect(shouldDismissPanel(elsewhere)).toBe(true);
  });

  it('ignores a press whose target has already left the document', () => {
    const detached = document.createElement('button');

    expect(shouldDismissPanel(detached)).toBe(false);
  });

  it('ignores a press with no target at all', () => {
    expect(shouldDismissPanel(null)).toBe(false);
  });
});

describe('shouldKeepEditorFocus', () => {
  it('holds focus for a press on a toolbar button', () => {
    const button = mount('<button>Bold</button>');

    expect(shouldKeepEditorFocus(button)).toBe(true);
  });

  it('holds focus for a press on a button’s inner icon', () => {
    const button = mount('<button><svg><title>B</title></svg></button>');

    expect(shouldKeepEditorFocus(button.querySelector('svg'))).toBe(true);
  });

  it('holds focus for a press on a menu item', () => {
    const item = mount('<div role="menuitemcheckbox">Table of Contents</div>');

    expect(shouldKeepEditorFocus(item)).toBe(true);
  });

  it('lets a text field take the caret', () => {
    const field = mount('<div class="dropdown-portal"><input placeholder="Search fonts..." /></div>');

    expect(shouldKeepEditorFocus(field.querySelector('input'))).toBe(false);
  });

  it('lets a button-wrapped text field take the caret', () => {
    // The style-preset rows in the CSS editor are an input inside a button.
    const row = mount('<button><input value="Default" /></button>');

    expect(shouldKeepEditorFocus(row.querySelector('input'))).toBe(false);
  });

  it('leaves a plain panel surface alone so its scrollbar still drags', () => {
    const panel = mount('<div class="dropdown-portal"><span>Clipboard</span></div>');

    expect(shouldKeepEditorFocus(panel)).toBe(false);
  });
});
