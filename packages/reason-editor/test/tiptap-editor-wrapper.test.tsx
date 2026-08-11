/**
 * Mounts the real product surface — the wrapper `ReasonDocs` renders — to
 * confirm it still comes up on the Novel shell with the full default extension
 * set, the toolbar, and the bubble menus attached.
 */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TiptapEditorWrapper } from '@/editor/TiptapEditorWrapper';

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

function mount(props: Partial<React.ComponentProps<typeof TiptapEditorWrapper>> = {}) {
  act(() => {
    root.render(
      <TiptapEditorWrapper
        content='<h1>Title</h1><p>Body text</p>'
        title='Doc'
        onTitleChange={() => {}}
        onChange={() => {}}
        {...props}
      />,
    );
  });
}

describe('TiptapEditorWrapper', () => {
  it('mounts the editor inside the Novel shell', () => {
    mount();

    const scope = container.querySelector('.reactjs-tiptap-editor');
    expect(scope).not.toBeNull();
    expect(scope!.querySelector('.ProseMirror')).not.toBeNull();
    expect(scope!.textContent).toContain('Body text');
  });

  it('reports the document headings for the table of contents', () => {
    const onHeadingsChange = vi.fn();
    mount({ onHeadingsChange, content: '<h1>Alpha</h1><p>x</p><h2>Beta</h2>' });

    // Reported on the content-load effect, once the editor exists.
    expect(onHeadingsChange).toHaveBeenCalled();
    const headings = onHeadingsChange.mock.calls.at(-1)![0];
    expect(headings.map((h: [string, string, string]) => h[1])).toEqual(['Alpha', 'Beta']);
  });

  it('renders the toolbar when editable and omits it in read-only mode', () => {
    mount();
    const editable = container.querySelectorAll('button').length;
    expect(editable).toBeGreaterThan(0);

    act(() => root.unmount());
    root = createRoot(container);
    mount({ readOnly: true });

    expect(container.querySelector('.ProseMirror')).not.toBeNull();
    expect(container.querySelectorAll('button').length).toBe(0);
  });
});
