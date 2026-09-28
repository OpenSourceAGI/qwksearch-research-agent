/**
 * Turning an uploaded file into a document body. The file manager hands us
 * whatever the user picked, so this has to cope with text, binary files, and
 * files it cannot read at all.
 */

import { describe, expect, it } from 'vitest';

import { isTextFile, nextDocumentId, readUploadedFile } from '../src/editor/fileUpload';
import type { Document } from 'react-reason-editor-sidebar';

function file(name: string, body: string, type = ''): File {
  return new File([body], name, { type });
}

describe('isTextFile', () => {
  it('accepts anything the browser reports as text', () => {
    expect(isTextFile(file('notes.txt', 'a', 'text/plain'))).toBe(true);
  });

  it('accepts text-like extensions the browser does not type', () => {
    // These arrive with an empty MIME type from browsers and from the OS
    // file picker alike, so the name is the only signal available.
    expect(isTextFile(file('README.md', '# hi'))).toBe(true);
    expect(isTextFile(file('data.json', '{}'))).toBe(true);
    expect(isTextFile(file('main.tsx', 'const a = 1;'))).toBe(true);
  });

  it('rejects binaries', () => {
    expect(isTextFile(file('diagram.png', '...', 'image/png'))).toBe(false);
    expect(isTextFile(file('report.pdf', '%PDF', 'application/pdf'))).toBe(false);
  });
});

describe('readUploadedFile', () => {
  it('turns a text upload into paragraphs', async () => {
    const html = await readUploadedFile(file('notes.txt', 'first\n\nsecond', 'text/plain'));
    expect(html).toBe('<p>first</p><p>second</p>');
  });

  it('keeps single newlines as line breaks', async () => {
    const html = await readUploadedFile(file('notes.txt', 'one\ntwo', 'text/plain'));
    expect(html).toBe('<p>one<br>two</p>');
  });

  it('escapes markup so an upload cannot inject HTML', async () => {
    const html = await readUploadedFile(
      file('xss.txt', '<script>alert(1)</script> & "quotes"', 'text/plain'),
    );
    expect(html).not.toContain('<script>');
    expect(html).toBe(
      '<p>&lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;quotes&quot;</p>',
    );
  });

  it('records the name and size for a binary upload', async () => {
    const html = await readUploadedFile(file('diagram.png', '12345', 'image/png'));
    expect(html).toBe('<p>diagram.png (5 bytes)</p>');
  });

  it('falls back to a placeholder when the file cannot be read', async () => {
    const broken = file('notes.txt', 'x', 'text/plain');
    Object.defineProperty(broken, 'text', {
      value: () => Promise.reject(new Error('revoked blob')),
    });
    expect(await readUploadedFile(broken)).toBe('<p>notes.txt (1 bytes)</p>');
  });
});

describe('nextDocumentId', () => {
  const doc = (id: string): Document => ({
    id,
    title: id,
    content: '',
    parentId: null,
  });

  it('avoids an ID that is already taken', () => {
    const now = Date.now().toString();
    const existing = [doc(now), doc((Number(now) + 1).toString())];
    expect(nextDocumentId(existing)).toBe((Number(now) + 2).toString());
  });

  it('is usable with no existing documents', () => {
    expect(nextDocumentId([])).toMatch(/^\d+$/);
  });
});
