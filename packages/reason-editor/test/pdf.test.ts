import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { printEditorContent } from '../src/utils/pdf';

const exportPdfOptions = {
  paperSize: 'A4',
  title: 'My Document',
  margins: { top: '1cm', right: '2cm', bottom: '3cm', left: '4cm' },
} as any;

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
});

describe('printEditorContent', () => {
  it('returns false when the editor is empty', () => {
    const editor = { getHTML: () => '' } as any;

    expect(printEditorContent(editor, exportPdfOptions)).toBe(false);
    expect(document.querySelector('iframe')).toBeNull();
  });

  it('renders the document into a hidden iframe', () => {
    const editor = { getHTML: () => '<p>Hello</p>' } as any;

    expect(printEditorContent(editor, exportPdfOptions)).toBe(true);

    const iframe = document.querySelector('iframe')!;
    expect(iframe).not.toBeNull();
    expect(iframe.getAttribute('style')).toContain('position: absolute');

    const doc = iframe.contentDocument!;
    expect(doc.title).toBe('My Document');
    expect(doc.querySelector('.print-container')?.innerHTML).toContain('Hello');
    expect(doc.querySelector('style')?.textContent).toContain('size: A4');
    expect(doc.querySelector('style')?.textContent).toContain('1cm 2cm 3cm 4cm');
  });

  it('falls back to the default title', () => {
    const editor = { getHTML: () => '<p>Hi</p>' } as any;

    printEditorContent(editor, { ...exportPdfOptions, title: undefined });

    expect(document.querySelector('iframe')!.contentDocument!.title).toBe(
      'React Tiptap Editor'
    );
  });

  it('prints and then removes the iframe once it loads', () => {
    const editor = { getHTML: () => '<p>Hi</p>' } as any;
    printEditorContent(editor, exportPdfOptions);

    const iframe = document.querySelector('iframe')!;
    const print = vi.fn();
    const focus = vi.fn();
    Object.assign(iframe.contentWindow!, { print, focus });

    iframe.dispatchEvent(new Event('load'));
    vi.advanceTimersByTime(50);
    expect(focus).toHaveBeenCalled();
    expect(print).toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(document.querySelector('iframe')).toBeNull();
  });

  it('still removes the iframe when printing throws', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const editor = { getHTML: () => '<p>Hi</p>' } as any;
    printEditorContent(editor, exportPdfOptions);

    const iframe = document.querySelector('iframe')!;
    Object.assign(iframe.contentWindow!, {
      focus: () => {},
      print: () => {
        throw new Error('no printer');
      },
    });

    iframe.dispatchEvent(new Event('load'));
    vi.advanceTimersByTime(150);

    expect(consoleError).toHaveBeenCalledWith('Print failed', expect.any(Error));
    expect(document.querySelector('iframe')).toBeNull();
    consoleError.mockRestore();
  });
});
