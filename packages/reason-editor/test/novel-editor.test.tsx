/**
 * Runtime checks for the Novel-based editor shell.
 *
 * These assert the thing the refactor is actually about: that Novel's
 * `EditorRoot`/`EditorContent` construct the editor, and that this package's
 * own Tiptap extensions — not Novel's bundled defaults — form the schema that
 * comes out the other side.
 */

import { StrictMode } from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { Editor } from '@tiptap/core';

import { NovelEditor } from '@/novel/NovelEditor';
import { buildBaseKit } from '@/editor-views/config/baseKit';
import { Bold } from '@/extensions/Bold';
import { ColumnNode, MultipleColumnNode } from '@/extensions/Column';
import { Italic } from '@/extensions/Italic';

// React 19 flags this when `act()` is used outside a test renderer.
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// A representative slice of the real extension set rather than the whole
// registry, which would drag in KaTeX/Mermaid/Draw.io for no added coverage.
// The column nodes are required: `buildBaseKit()`'s Document accepts
// `(block|columns)+`, so the schema will not compile without them.
const extensions = [...buildBaseKit(), MultipleColumnNode, ColumnNode, Bold, Italic];

let container: HTMLDivElement;
let root: Root;
/**
 * The most recent non-null editor seen. Shared across renders in a test
 * because `onEditor` only fires when the editor identity actually changes —
 * which is exactly what the rebuild test below asserts.
 */
let captured: Editor | null;

beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  captured = null;
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

/** Renders the shell into the shared root and returns the live editor. */
function mount(props: Partial<React.ComponentProps<typeof NovelEditor>> = {}) {
  act(() => {
    root.render(
      <StrictMode>
        <NovelEditor
          extensions={extensions}
          immediatelyRender={false}
          onEditor={(editor) => {
            if (editor) captured = editor;
          }}
          {...props}
        >
          {({ EditorSurface }) => <EditorSurface className='surface' />}
        </NovelEditor>
      </StrictMode>,
    );
  });

  return { editor: captured };
}

describe('NovelEditor', () => {
  it('builds an editor through Novel and reports it via onEditor', () => {
    const { editor } = mount();

    expect(editor).not.toBeNull();
    expect(editor!.isDestroyed).toBe(false);
  });

  it('registers this package\'s extensions rather than Novel\'s defaults', () => {
    const { editor } = mount();
    const names = editor!.extensionManager.extensions.map((e) => e.name);

    // Cross-applied from src/extensions/.
    expect(names).toContain('bold');
    expect(names).toContain('italic');
    // From buildBaseKit(): the column-aware Document replacement.
    expect(editor!.schema.topNodeType.spec.content).toBe('(block|columns)+');
    // Novel's own StarterKit is never merged in, so nothing it would have
    // brought along (e.g. its youtube node) is present.
    expect(names).not.toContain('youtube');
  });

  it('renders the editable surface inside the stylesheet scope', () => {
    mount();

    const scope = container.querySelector('.reactjs-tiptap-editor');
    expect(scope).not.toBeNull();
    expect(scope!.querySelector('.surface .ProseMirror')).not.toBeNull();
  });

  it('names Novel\'s own wrapper so the stylesheet can stretch it', () => {
    mount();

    // The host's classes land on the inner container, so the outer wrapper
    // needs a hook of its own — without one it shrink-wraps its content and an
    // empty document collapses the editable area (see styles/editor.scss).
    const shell = container.querySelector('.reason-editor-shell');
    expect(shell).not.toBeNull();
    expect(shell!.querySelector('.reason-editor-surface .ProseMirror')).not.toBeNull();
  });

  it('loads initialContent and round-trips it back as HTML', () => {
    const { editor } = mount({ initialContent: '<p>hello <strong>novel</strong></p>' });

    expect(editor!.getHTML()).toContain('<strong>novel</strong>');
  });

  it('honours the editable flag', () => {
    const { editor } = mount({ editable: false });

    expect(editor!.isEditable).toBe(false);
  });

  it('keeps one editor across re-renders and rebuilds only when rebuildKey changes', () => {
    const { editor: first } = mount({ rebuildKey: 'a' });

    // Same key, new props object: the surface must not be torn down.
    const { editor: second } = mount({ rebuildKey: 'a', className: 'changed' });
    expect(second).toBe(first);

    const { editor: third } = mount({ rebuildKey: 'b' });
    expect(third).not.toBe(first);
    expect(third!.isDestroyed).toBe(false);
  });
});
