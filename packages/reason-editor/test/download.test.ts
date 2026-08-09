import { describe, expect, it, vi } from 'vitest';
import { downloadFromBlob } from '../src/utils/download';

describe('downloadFromBlob', () => {
  function stubObjectUrl() {
    const createObjectURL = vi.fn(() => 'blob:mock-url');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL }));
    return { createObjectURL, revokeObjectURL };
  }

  it('creates an object URL for the blob and revokes it afterwards', async () => {
    const { createObjectURL, revokeObjectURL } = stubObjectUrl();
    const blob = new Blob(['hello']);

    await downloadFromBlob(blob, 'greeting.txt');

    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });

  it('clicks an anchor carrying the object URL and the filename', async () => {
    stubObjectUrl();
    const anchor = document.createElement('a');
    const click = vi.spyOn(anchor, 'click').mockImplementation(() => {});
    vi.spyOn(document, 'createElement').mockReturnValue(anchor);

    await downloadFromBlob(new Blob(['hello']), 'greeting.txt');

    expect(anchor.getAttribute('href')).toBe('blob:mock-url');
    expect(anchor.download).toBe('greeting.txt');
    expect(click).toHaveBeenCalledTimes(1);
  });

  it('resolves rather than returning a value', async () => {
    stubObjectUrl();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    await expect(downloadFromBlob(new Blob(['hello']), 'f.txt')).resolves.toBeUndefined();
  });
});
