import { describe, expect, it } from 'vitest';
import { base64ToBlob, blobToFile } from '../src/utils/base64';

// "hello" in base64.
const HELLO = 'aGVsbG8=';
const DATA_URI = `data:text/plain;base64,${HELLO}`;

describe('base64ToBlob', () => {
  it('decodes a data URI into a Blob of the requested type', async () => {
    const blob = base64ToBlob(DATA_URI, 'text/plain');

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('text/plain');
    expect(await blob.text()).toBe('hello');
  });

  it('sizes the blob to the decoded byte length', () => {
    expect(base64ToBlob(DATA_URI, 'text/plain').size).toBe(5);
  });

  it('decodes binary payloads byte for byte', async () => {
    const bytes = new Uint8Array([0, 1, 254, 255]);
    const base64 = btoa(String.fromCharCode(...bytes));

    const blob = base64ToBlob(`data:application/octet-stream;base64,${base64}`, 'application/octet-stream');

    expect(new Uint8Array(await blob.arrayBuffer())).toEqual(bytes);
  });

  it('produces an empty blob for an empty payload', () => {
    expect(base64ToBlob('data:text/plain;base64,', 'text/plain').size).toBe(0);
  });
});

describe('blobToFile', () => {
  it('wraps a Blob in a named File, preserving the MIME type', () => {
    const blob = new Blob(['hello'], { type: 'text/plain' });

    const file = blobToFile(blob, 'greeting.txt');

    expect(file).toBeInstanceOf(File);
    expect(file.name).toBe('greeting.txt');
    expect(file.type).toBe('text/plain');
    expect(file.size).toBe(5);
  });

  it('preserves the contents', async () => {
    const file = blobToFile(new Blob(['hello']), 'greeting.txt');

    expect(await file.text()).toBe('hello');
  });

  it('composes with base64ToBlob', async () => {
    const file = blobToFile(base64ToBlob(DATA_URI, 'text/plain'), 'greeting.txt');

    expect(await file.text()).toBe('hello');
    expect(file.type).toBe('text/plain');
  });
});
