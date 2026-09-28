/**
 * The file manager modal's two create paths, driven through the real UI:
 * "Add new" (a typed name) and "Upload file" (a browser `File`). Both go
 * through SVAR's `create-file` action, which the modal has to translate into
 * a `parentId` the host understands.
 */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FileManagerModal } from '../../src/dialogs/FileManagerModal';
import type { FileManagerCreateRequest } from '../../src/layout/sidebar/types';
import type { Document } from '../../src/documents/DocumentTree';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// SVAR's grid measures its panes through ResizeObserver, which jsdom lacks.
// It never needs a real measurement here — only the callback to exist.
class StubResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= StubResizeObserver as any;

// Radix and SVAR both portal their overlays and menus to <body>, so the whole
// file manager lives outside the React container this test mounts into.
let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  document.body.innerHTML = '';
});

const documents: Document[] = [
  { id: 'note-1', title: 'Welcome', content: 'hi', parentId: null },
  { id: 'folder-1', title: 'Projects', content: '', parentId: null, isFolder: true },
  { id: 'note-2', title: 'Roadmap', content: '', parentId: 'folder-1' },
];

function renderModal(onCreateFile: (r: FileManagerCreateRequest) => void) {
  act(() =>
    root.render(
      <FileManagerModal
        open
        onOpenChange={() => {}}
        documents={documents}
        onCreateFile={onCreateFile}
      />,
    ),
  );
}

function findByText<T extends HTMLElement>(selector: string, text: string): T {
  const wanted = text.toLowerCase();
  const matches = Array.from(
    document.body.querySelectorAll<T>(selector),
  ).filter((el) => (el.textContent ?? '').trim().toLowerCase() === wanted);
  if (matches.length === 0) {
    throw new Error(`No <${selector}> with text "${text}"`);
  }
  // The wrapper, the menu anchor, and the button all report the same text;
  // only the innermost one is the real control, and SVAR's menus read
  // `event.target` to work out what was hit.
  return matches[matches.length - 1];
}

function click(el: Element) {
  act(() => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  });
}

function type(el: HTMLInputElement, value: string) {
  act(() => {
    // React tracks the value on the DOM node, so assign through the native
    // setter or the change is ignored as a no-op.
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value',
    )!.set!;
    setter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

/** Opens the "Add New" dropdown and picks one of its three options. */
function openAddMenu(optionId: 'add-file' | 'add-folder' | 'upload') {
  click(findByText<HTMLElement>('button', 'Add New'));
  const item = document.body.querySelector(`[data-id$="${optionId}"]`);
  if (!item) throw new Error(`"Add New" has no "${optionId}" option`);
  click(item);
}

/** Fills in the name prompt that "Add new" shows and confirms it. */
function confirmNamePrompt(name: string) {
  const input = document.body.querySelector<HTMLInputElement>(
    '.wx-modal input',
  );
  if (!input) throw new Error('Name prompt input not found');
  type(input, name);
  click(findByText<HTMLElement>('button', 'OK'));
}

describe('FileManagerModal create actions', () => {
  it('routes "Add new folder" to the host with the right parent and kind', () => {
    const onCreateFile = vi.fn();
    renderModal(onCreateFile);

    openAddMenu('add-folder');
    confirmNamePrompt('Archive');

    expect(onCreateFile).toHaveBeenCalledTimes(1);
    expect(onCreateFile).toHaveBeenCalledWith({
      parentId: null,
      name: 'Archive',
      isFolder: true,
      file: undefined,
    });
  });

  it('routes "Add new file" as a note, not a folder', () => {
    const onCreateFile = vi.fn();
    renderModal(onCreateFile);

    openAddMenu('add-file');
    confirmNamePrompt('Scratch');

    expect(onCreateFile).toHaveBeenCalledWith(
      expect.objectContaining({
        parentId: null,
        name: 'Scratch',
        isFolder: false,
      }),
    );
  });

  it('resolves the destination folder path to a document ID', () => {
    const onCreateFile = vi.fn();
    renderModal(onCreateFile);

    // Navigate into /Projects so the panel path is a folder, not the root.
    click(document.body.querySelector('li[data-id$="/Projects"]')!);
    openAddMenu('add-folder');
    confirmNamePrompt('2026');

    expect(onCreateFile).toHaveBeenCalledWith(
      expect.objectContaining({ parentId: 'folder-1', name: '2026' }),
    );
  });

  it('passes the uploaded File through so the host can read it', async () => {
    const onCreateFile = vi.fn();
    renderModal(onCreateFile);

    const file = new File(['line one\nline two'], 'notes.txt', {
      type: 'text/plain',
    });

    // The "Upload file" menu entry *is* the upload button: clicking it opens
    // the native picker, which jsdom cannot show, so the picker input is
    // driven directly once the button has been clicked for real.
    click(findByText<HTMLElement>('button', 'Add New'));
    click(document.body.querySelector('.wx-upload-button')!);

    const input = document.body.querySelector<HTMLInputElement>(
      'input[type="file"]',
    );
    if (!input) throw new Error('Upload input not found');

    await act(async () => {
      Object.defineProperty(input, 'files', {
        configurable: true,
        value: [file],
      });
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(onCreateFile).toHaveBeenCalledWith(
      expect.objectContaining({
        parentId: null,
        name: 'notes.txt',
        isFolder: false,
        file,
      }),
    );
  });

  it('does nothing observable when the host provides no create handler', () => {
    act(() =>
      root.render(
        <FileManagerModal open onOpenChange={() => {}} documents={documents} />,
      ),
    );

    expect(() => {
      openAddMenu('add-folder');
      confirmNamePrompt('Noop');
    }).not.toThrow();
  });
});
