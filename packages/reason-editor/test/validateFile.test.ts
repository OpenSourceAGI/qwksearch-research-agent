import { describe, expect, it, vi } from 'vitest';
import { validateFiles } from '../src/utils/validateFile';

/** Minimal stand-in for the i18n `t` used by the upload flow. */
const t = (key: string, params?: Record<string, unknown>) =>
  params ? `${key}:${JSON.stringify(params)}` : key;

function makeFile(name: string, type: string, size = 10) {
  const file = new File(['x'.repeat(size)], name, { type });
  // jsdom derives size from the blob parts; pin it so the size assertions are exact.
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

describe('validateFiles', () => {
  it('accepts every file when no accept list is configured', () => {
    const toast = vi.fn();
    const files = [makeFile('a.png', 'image/png'), makeFile('b.zip', 'application/zip')];

    expect(validateFiles(files, { maxSize: 1000, t, toast })).toEqual(files);
    expect(toast).not.toHaveBeenCalled();
  });

  it('accepts an object map of files', () => {
    const toast = vi.fn();
    const a = makeFile('a.png', 'image/png');

    expect(validateFiles({ 0: a }, { maxSize: 1000, t, toast })).toEqual([a]);
  });

  it('matches a wildcard mime type', () => {
    const toast = vi.fn();
    const image = makeFile('a.png', 'image/png');
    const text = makeFile('a.txt', 'text/plain');

    const valid = validateFiles([image, text], {
      acceptMimes: ['image/*'],
      maxSize: 1000,
      t,
      toast,
    });

    expect(valid).toEqual([image]);
    expect(toast).toHaveBeenCalledTimes(1);
  });

  it('matches an exact mime type', () => {
    const pdf = makeFile('a.pdf', 'application/pdf');
    const png = makeFile('a.png', 'image/png');

    const valid = validateFiles([pdf, png], {
      acceptMimes: ['application/pdf'],
      maxSize: 1000,
      t,
      toast: vi.fn(),
    });

    expect(valid).toEqual([pdf]);
  });

  it('matches by file extension', () => {
    const doc = makeFile('notes.MD', '');

    const valid = validateFiles([doc], {
      acceptMimes: ['.md'],
      maxSize: 1000,
      t,
      toast: vi.fn(),
    });

    expect(valid).toEqual([doc]);
  });

  it('guesses the mime type from the extension for raw camera formats', () => {
    const heic = makeFile('IMG_0001.heic', '');

    const valid = validateFiles([heic], {
      acceptMimes: ['image/*'],
      maxSize: 1000,
      t,
      toast: vi.fn(),
    });

    expect(valid).toEqual([heic]);
  });

  it('rejects a file with no extension when an accept list is set', () => {
    const noExt = makeFile('LICENSE', '');
    Object.defineProperty(noExt, 'name', { value: 'LICENSE' });

    const valid = validateFiles([noExt], {
      acceptMimes: ['image/*'],
      maxSize: 1000,
      t,
      toast: vi.fn(),
    });

    expect(valid).toEqual([]);
  });

  it('rejects files over the size limit', () => {
    const toast = vi.fn();
    const big = makeFile('big.png', 'image/png', 5000);

    expect(validateFiles([big], { maxSize: 1024, t, toast })).toEqual([]);
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: expect.stringContaining('fileSizeTooBig') })
    );
  });

  it('routes type failures to onError instead of toast when provided', () => {
    const toast = vi.fn();
    const onError = vi.fn();
    const text = makeFile('a.txt', 'text/plain');

    validateFiles([text], { acceptMimes: ['image/*'], maxSize: 1000, t, toast, onError });

    expect(toast).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'type', file: text, message: expect.any(String) })
    );
  });

  it('routes size failures to onError instead of toast when provided', () => {
    const toast = vi.fn();
    const onError = vi.fn();
    const big = makeFile('big.png', 'image/png', 5000);

    validateFiles([big], { maxSize: 1024, t, toast, onError });

    expect(toast).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ type: 'size', file: big }));
  });

  it('reports the limit in megabytes', () => {
    const onError = vi.fn();
    const big = makeFile('big.png', 'image/png', 5 * 1024 * 1024);

    validateFiles([big], { maxSize: 2 * 1024 * 1024, t, toast: vi.fn(), onError });

    expect(onError.mock.calls[0][0].message).toContain('2.00');
  });
});
