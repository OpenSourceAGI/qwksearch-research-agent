/**
 * The sidebar's bottom icon row. Two things the user sees directly:
 * settings is a plain link to the settings page (it used to be a dropdown
 * of settings sections), and the storage-source switcher sits down here
 * rather than in the top toolbar.
 */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { Sidebar } from '../../src/Sidebar';
import type { Document } from '../../src/documents/DocumentTree';

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

const documents: Document[] = [
  { id: 'a', title: 'a', content: '', parentId: null, isFolder: false, isExpanded: false },
];

function renderSidebar(props: Record<string, unknown> = {}) {
  act(() =>
    root.render(
      <Sidebar
        documents={documents}
        activeId={null}
        activeDocument={null}
        onSelect={() => {}}
        onAdd={() => {}}
        onDelete={() => {}}
        onDuplicate={() => {}}
        onSetExpandedFolders={() => {}}
        onMove={() => {}}
        onRename={() => {}}
        onSearchFocus={() => {}}
        isOpen
        onOpenChange={() => {}}
        isMobile={false}
        leftPanels={['files']}
        onLeftPanelsChange={() => {}}
        rightPanels={[]}
        onRightPanelsChange={() => {}}
        onRestore={() => {}}
        {...props}
      />,
    ),
  );
}

/** The footer's settings control, whatever element it renders as. */
function settingsControl() {
  return container.querySelector('[aria-label="Settings"]');
}

/** Buttons in the footer's icon row. */
function footerButtons() {
  return Array.from(container.querySelectorAll('nav button'));
}

describe('sidebar footer', () => {
  it('opens the settings page instead of a settings menu', () => {
    renderSidebar();

    const settings = settingsControl();
    expect(settings).not.toBeNull();
    expect(settings!.tagName).toBe('A');
    expect(settings!.getAttribute('href')).toBe('/settings');

    // A link, not a dropdown trigger: Radix marks those with aria-haspopup.
    expect(settings!.getAttribute('aria-haspopup')).toBeNull();
  });

  it('lets the host point settings somewhere else', () => {
    renderSidebar({ settingsHref: '/workspace/settings' });

    expect(settingsControl()!.getAttribute('href')).toBe('/workspace/settings');
  });

  it('puts the storage-source switcher in the footer, not the toolbar', () => {
    renderSidebar();
    const withoutSwitcher = footerButtons().length;

    // The switcher renders only once the host can act on a source change,
    // and it renders in the footer row — it used to live in the toolbar.
    renderSidebar({ onFileSourceChange: () => {} });
    const withSwitcher = footerButtons();

    expect(withSwitcher.length).toBe(withoutSwitcher + 1);
    expect(withSwitcher[0]?.getAttribute('aria-haspopup')).toBe('menu');
  });
});
