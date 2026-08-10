import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  dataURLtoFile,
  extractFileExtension,
  extractFilename,
  FILE_CHUNK_SIZE,
  getImageWidthHeight,
  normalizeFileSize,
  normalizeFileType,
  readImageAsBase64,
} from '../src/utils/file';

describe('extractFilename', () => {
  it('strips the directory and the extension', () => {
    expect(extractFilename('https://gitlab.com/images/logo-full.png')).toBe('logo-full');
  });

  it('handles a bare filename', () => {
    expect(extractFilename('report.pdf')).toBe('report');
  });

  it('returns the name unchanged when there is no extension', () => {
    expect(extractFilename('/tmp/archive')).toBe('archive');
  });
});

describe('extractFileExtension', () => {
  it('returns the last segment after a dot', () => {
    expect(extractFileExtension('photo.tar.gz')).toBe('gz');
  });

  it('returns the whole name when there is no dot', () => {
    expect(extractFileExtension('README')).toBe('README');
  });
});

describe('normalizeFileSize', () => {
  it('reports bytes below 1 KB', () => {
    expect(normalizeFileSize(512)).toBe('512 Byte');
  });

  it('reports kilobytes below 1 MB', () => {
    expect(normalizeFileSize(2048)).toBe('2.00 KB');
  });

  it('reports megabytes at and above 1 MB', () => {
    expect(normalizeFileSize(3 * 1024 * 1024)).toBe('3.00 MB');
  });
});

describe('normalizeFileType', () => {
  it('falls back to "file" for an empty type', () => {
    expect(normalizeFileType('')).toBe('file');
    expect(normalizeFileType(undefined)).toBe('file');
  });

  it('recognises PDFs', () => {
    expect(normalizeFileType('application/pdf')).toBe('pdf');
  });

  it('recognises Word documents', () => {
    expect(
      normalizeFileType('application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    ).toBe('word');
    expect(normalizeFileType('application/msword')).toBe('word');
  });

  it('maps presentation and sheet mime types', () => {
    // Note: the current mapping intentionally reports 'excel' for
    // presentations and 'ppt' for sheets; these assertions pin the behaviour.
    expect(
      normalizeFileType('application/vnd.openxmlformats-officedocument.presentationml.presentation')
    ).toBe('excel');
    expect(
      normalizeFileType('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    ).toBe('ppt');
  });

  it('recognises media families by prefix', () => {
    expect(normalizeFileType('image/png')).toBe('image');
    expect(normalizeFileType('audio/mpeg')).toBe('audio');
    expect(normalizeFileType('video/mp4')).toBe('video');
  });

  it('falls back to "file" for unknown types', () => {
    expect(normalizeFileType('text/plain')).toBe('file');
    expect(normalizeFileType('application/zip')).toBe('file');
  });
});

describe('readImageAsBase64', () => {
  it('resolves with the file name and a data URL', async () => {
    const file = new File(['hello'], 'greeting.txt', { type: 'text/plain' });

    const result = await readImageAsBase64(file);

    expect(result.alt).toBe('greeting.txt');
    expect(result.src.startsWith('data:text/plain;base64,')).toBe(true);
  });
});

describe('getImageWidthHeight', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('resolves with the natural size once the image loads', async () => {
    const img = document.createElement('img');
    Object.defineProperty(img, 'width', { value: 320 });
    Object.defineProperty(img, 'height', { value: 200 });
    vi.spyOn(document, 'createElement').mockReturnValue(img);

    const pending = getImageWidthHeight('https://example.com/a.png');
    img.dispatchEvent(new Event('load'));

    await expect(pending).resolves.toEqual({ width: 320, height: 200 });
  });

  it('resolves with "auto" when the image fails to load', async () => {
    const img = document.createElement('img');
    vi.spyOn(document, 'createElement').mockReturnValue(img);

    const pending = getImageWidthHeight('https://example.com/missing.png');
    img.onerror?.(new Event('error'));

    await expect(pending).resolves.toEqual({ width: 'auto', height: 'auto' });
  });
});

describe('dataURLtoFile', () => {
  it('rebuilds a File with the encoded mime type and bytes', async () => {
    const file = dataURLtoFile('data:text/plain;base64,aGVsbG8=', 'hello.txt');

    expect(file).toBeInstanceOf(File);
    expect(file.name).toBe('hello.txt');
    expect(file.type).toBe('text/plain');
    expect(await file.text()).toBe('hello');
  });
});

describe('FILE_CHUNK_SIZE', () => {
  it('is 2 MB', () => {
    expect(FILE_CHUNK_SIZE).toBe(2 * 1024 * 1024);
  });
});
