/**
 * Mounts the playground toolbar over a real Plate editor.
 *
 * The value here is coverage of the wiring rather than of any one button: every
 * component in `plate/ui/*-toolbar-button.tsx` runs hooks against the plugin set
 * in `plate-editor-config.ts`, so a button whose plugin is missing, or whose
 * registry API moved under a Plate upgrade, fails on mount instead of in the
 * browser.
 */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Plate, usePlateEditor } from 'platejs/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { EMPTY_PLATE_VALUE, platePlugins } from '@/docs-agent/plate/plate-editor-config';
import { FixedToolbar } from '@/docs-agent/plate/ui/fixed-toolbar';
import { FixedToolbarButtons } from '@/docs-agent/plate/ui/fixed-toolbar-buttons';
import { REASON_TOOLBAR_SKIN } from '@/docs-agent/plate/ui/reason-toolbar-skin';

function PlaygroundToolbarHarness() {
  const editor = usePlateEditor({
    plugins: platePlugins,
    value: EMPTY_PLATE_VALUE,
  });

  return (
    <Plate editor={editor}>
      <FixedToolbar className={REASON_TOOLBAR_SKIN}>
        <FixedToolbarButtons />
      </FixedToolbar>
    </Plate>
  );
}

describe('playground fixed toolbar', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);

    act(() => {
      root.render(<PlaygroundToolbarHarness />);
    });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('mounts every button without a plugin or hook error', () => {
    // The registry buttons render as `button`; the split lists' halves as spans
    // with `role="button"`.
    const controls = container.querySelectorAll('button, [role="button"]');

    expect(controls.length).toBeGreaterThan(25);
  });

  it('wears the REASON toolbar skin', () => {
    const toolbar = container.querySelector('[role="toolbar"]');

    expect(toolbar).not.toBeNull();
    expect(toolbar!.className).toContain('gap-0.5');
    expect(toolbar!.className).toContain('border-b-border');
  });

  it('labels the Turn into trigger with the current block type', () => {
    expect(container.textContent).toContain('Text');
  });
});
