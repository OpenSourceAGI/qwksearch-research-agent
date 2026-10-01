/**
 * Mounts the default product surface — the editor `ReasonDocs` now renders — to
 * confirm Plate comes up with the full plugin set and toolbar behind the
 * engine-neutral contract, and that the HTML the document store round-trips
 * through it survives.
 */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { EditorArea } from '@/editor/EditorArea';
import { htmlToPlateValue } from '@/docs-agent/plate/html-to-plate';
import { plateValueToHtml } from '@/docs-agent/plate/plate-to-html';
import { extractTocHeadings, PlateEditorWrapper } from '@/editor/PlateEditorWrapper';

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

function mount(props: Partial<React.ComponentProps<typeof PlateEditorWrapper>> = {}) {
  act(() => {
    root.render(
      <PlateEditorWrapper
        content='<h1>Title</h1><p>Body text</p>'
        title='Doc'
        onTitleChange={() => {}}
        onChange={() => {}}
        {...props}
      />,
    );
  });
}

describe('PlateEditorWrapper', () => {
  it('mounts the Plate editable with the document content', () => {
    mount();

    const editable = container.querySelector('[data-slate-editor="true"]');
    expect(editable).not.toBeNull();
    expect(editable!.textContent).toContain('Body text');
    expect(editable!.querySelector('h1')?.textContent).toBe('Title');
  });

  it('reports the document headings for the table of contents', () => {
    const onHeadingsChange = vi.fn();
    mount({ onHeadingsChange, content: '<h1>Alpha</h1><p>x</p><h2>Beta</h2>' });

    expect(onHeadingsChange).toHaveBeenCalled();
    const headings = onHeadingsChange.mock.calls.at(-1)![0];
    expect(headings.map((h: [string, string, string]) => h[1])).toEqual(['Alpha', 'Beta']);
    expect(headings.map((h: [string, string, string]) => h[2])).toEqual(['h1', 'h2']);
  });

  it('renders the toolbar when editable and omits it in read-only mode', () => {
    mount();
    expect(container.querySelectorAll('button').length).toBeGreaterThan(0);

    act(() => root.unmount());
    root = createRoot(container);
    mount({ readOnly: true });

    expect(container.querySelector('[data-slate-editor="true"]')).not.toBeNull();
    expect(container.querySelectorAll('button').length).toBe(0);
  });

  it('resolves a heading key back to its element for scroll-to-heading', () => {
    const ref = { current: null } as React.RefObject<any>;
    act(() => {
      root.render(
        <PlateEditorWrapper
          content='<h1>Alpha</h1><h2>Beta</h2>'
          onChange={() => {}}
          onTitleChange={() => {}}
          ref={ref}
          title='Doc'
        />,
      );
    });

    const [key] = extractTocHeadings(htmlToPlateValue('<h1>Alpha</h1><h2>Beta</h2>'))[1];
    expect(ref.current!.getElementByKey(key)?.textContent).toBe('Beta');
  });
});

describe('plate HTML round-trip', () => {
  it('serializes a document back to the semantic HTML the store holds', async () => {
    const html = await plateValueToHtml(
      htmlToPlateValue('<h1>Alpha</h1><p>Body <strong>bold</strong></p>'),
    );

    expect(html).toContain('<h1');
    expect(html).toContain('Alpha');
    expect(html).toContain('Body');
    expect(html).toContain('bold');
    // The editor's own wrapper is not part of a stored document.
    expect(html).not.toContain('data-slate-editor');
  });

  it('survives a load/save/load cycle without losing structure', async () => {
    const first = htmlToPlateValue('<h1>Alpha</h1><ul><li>one</li><li>two</li></ul>');
    const second = htmlToPlateValue(await plateValueToHtml(first));

    expect(extractTocHeadings(second).map((h) => h[1])).toEqual(['Alpha']);
    expect(JSON.stringify(second)).toContain('one');
    expect(JSON.stringify(second)).toContain('two');
  });

  it('returns an empty string for an empty document', async () => {
    await expect(plateValueToHtml([])).resolves.toBe('');
  });
});

describe('EditorArea engine selection', () => {
  const activeDocument = {
    content: '<h1>Alpha</h1><p>Body text</p>',
    id: 'doc-1',
    title: 'Doc',
  } as any;

  // Both engines are lazy chunks behind a Suspense boundary, so the first
  // render shows the loading placeholder; wait for the engine to replace it.
  async function mountArea(engine?: 'plate' | 'tiptap') {
    await act(async () => {
      root.render(
        <EditorArea
          activeDocId='doc-1'
          activeDocument={activeDocument}
          documents={[activeDocument]}
          engine={engine}
          isMobile={false}
          onCloseSplitView={() => {}}
          onUpdateDocument={() => {}}
          splitViewDocId={null}
        />,
      );
    });
    await vi.waitFor(async () => {
      await act(async () => {});
      expect(container.querySelector('[aria-label="Loading the editor"]')).toBeNull();
    }, { timeout: 20_000 });
  }

  it('shows a placeholder while the editor chunk loads', () => {
    act(() => {
      root.render(
        <EditorArea
          activeDocId='doc-1'
          activeDocument={activeDocument}
          documents={[activeDocument]}
          isMobile={false}
          onCloseSplitView={() => {}}
          onUpdateDocument={() => {}}
          splitViewDocId={null}
        />,
      );
    });

    expect(container.querySelector('[aria-label="Loading the editor"]')).not.toBeNull();
  });

  it('mounts Plate when no engine is named', async () => {
    await mountArea();

    expect(container.querySelector('[data-slate-editor="true"]')).not.toBeNull();
    expect(container.querySelector('.ProseMirror')).toBeNull();
  }, 30_000);

  it('mounts Tiptap when asked for it', async () => {
    await mountArea('tiptap');

    expect(container.querySelector('.ProseMirror')).not.toBeNull();
    expect(container.querySelector('[data-slate-editor="true"]')).toBeNull();
  }, 30_000);
});
