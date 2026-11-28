/**
 * Tooltips on both toolbars: they appear without a hover delay and carry the
 * button's name, a one-line description and the shortcut as `<kbd>` badges.
 */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Plate, usePlateEditor } from 'platejs/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { EMPTY_PLATE_VALUE, platePlugins } from '@/docs-agent/plate/plate-editor-config';
import { FixedToolbar } from '@/docs-agent/plate/ui/fixed-toolbar';
import { FixedToolbarButtons } from '@/docs-agent/plate/ui/fixed-toolbar-buttons';
import { REASON_TOOLBAR_SKIN } from '@/docs-agent/plate/ui/reason-toolbar-skin';
import { createNullAdapter } from '@/docs-agent/shared/editor-types';
import { ReasonToolbar } from '@/docs-agent/shared/toolbar-renderer';
import { ToolbarTooltipBody } from '@/docs-agent/shared/toolbar-tooltip';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Radix popper sizing reads this; jsdom has none.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

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

function kbdLabels(scope: ParentNode): string[] {
  return [...scope.querySelectorAll('kbd')].map((kbd) => kbd.textContent ?? '');
}

/** Radix opens a tooltip on keyboard focus without waiting on a pointer delay. */
function focusButton(button: HTMLElement) {
  act(() => {
    button.focus();
  });
}

function tooltipBody() {
  return document.body.querySelector('[data-slot="toolbar-tooltip"]');
}

describe('ToolbarTooltipBody', () => {
  it('shows name, description and platform-aware kbd badges', () => {
    act(() => {
      root.render(
        <ToolbarTooltipBody
          description="Make the selected text bold."
          engine="plate"
          label="Bold"
          mac={false}
          shortcut="mod+b"
        />,
      );
    });

    expect(container.textContent).toContain('Bold');
    expect(container.textContent).toContain('Make the selected text bold.');
    expect(kbdLabels(container)).toEqual(['Ctrl', 'B']);
  });

  it('uses Cmd symbols on a Mac', () => {
    act(() => {
      root.render(
        <ToolbarTooltipBody
          engine="tiptap"
          label="Redo"
          mac
          shortcut="mod+shift+z"
        />,
      );
    });

    expect(kbdLabels(container)).toEqual(['⌘', '⇧', 'Z']);
  });

  it('omits the badges when the engine has no binding', () => {
    act(() => {
      root.render(
        <ToolbarTooltipBody
          description="Type by speaking."
          engine="plate"
          label="Dictate"
          shortcut={{ tiptap: 'mod+shift+d', plate: null }}
        />,
      );
    });

    expect(container.querySelector('kbd')).toBeNull();
  });
});

describe('ReasonToolbar tooltips', () => {
  function mount(engine: 'tiptap' | 'plate') {
    act(() => {
      root.render(<ReasonToolbar adapter={createNullAdapter(engine)} />);
    });
  }

  it('opens immediately, even on a disabled button, with description and shortcut', async () => {
    mount('plate');

    const bold = container.querySelector<HTMLElement>('[data-command="bold"]')!;
    expect(bold.hasAttribute('disabled')).toBe(true);
    await act(async () => {
      bold.parentElement!.dispatchEvent(new Event('pointermove', { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    expect(tooltipBody()?.textContent).toContain('Bold');
    expect(tooltipBody()?.textContent).toContain('Make the selected text bold.');
    expect(kbdLabels(tooltipBody()!)).toEqual(['Ctrl', 'B']);
  });

  it('keeps every icon button named for assistive tech', () => {
    mount('tiptap');

    for (const button of container.querySelectorAll('[data-command]')) {
      expect(button.getAttribute('aria-label'), button.outerHTML).toBeTruthy();
    }
  });
});

describe('playground toolbar tooltips', () => {
  function Harness() {
    const editor = usePlateEditor({ plugins: platePlugins, value: EMPTY_PLATE_VALUE });

    return (
      <Plate editor={editor}>
        <FixedToolbar className={REASON_TOOLBAR_SKIN}>
          <FixedToolbarButtons />
        </FixedToolbar>
      </Plate>
    );
  }

  beforeEach(() => {
    act(() => root.render(<Harness />));
  });

  it('names every icon-only control', () => {
    const controls = [...container.querySelectorAll<HTMLElement>('button, [role="button"]')];
    const unnamed = controls.filter(
      (control) =>
        !control.getAttribute('aria-label') &&
        !control.textContent?.trim() &&
        // The font size field is an input, and the split-list chevrons sit
        // beside a named primary half.
        !control.querySelector('input'),
    );

    expect(unnamed.map((control) => control.outerHTML)).toEqual([]);
  });

  it('shows the Plate binding for strikethrough, not the Tiptap one', () => {
    const strike = container.querySelector<HTMLElement>('[aria-label="Strikethrough"]')!;
    focusButton(strike);

    expect(tooltipBody()?.textContent).toContain('Draw a line through the selected text.');
    expect(kbdLabels(tooltipBody()!)).toEqual(['Ctrl', 'Shift', 'X']);
  });

  it('shows no shortcut for Dictate on Plate', () => {
    const dictate = container.querySelector<HTMLElement>('[aria-label="Dictate"]');
    if (!dictate || dictate.hasAttribute('disabled')) return;

    focusButton(dictate);
    expect(tooltipBody()?.querySelector('kbd')).toBeNull();
  });
});
