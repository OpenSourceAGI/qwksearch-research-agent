import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * These helpers branch on `typeof window === 'undefined'` at module load, so
 * each case re-imports the module with `window` removed to exercise the
 * server-side path that jsdom otherwise hides.
 */
async function importWithoutWindow<T>(specifier: string): Promise<T> {
  vi.resetModules();
  vi.stubGlobal('window', undefined);
  try {
    return (await import(specifier)) as T;
  } finally {
    vi.unstubAllGlobals();
  }
}

afterEach(() => {
  vi.resetModules();
  vi.unstubAllGlobals();
});

describe('ssrSafeLocalStorage without a window', () => {
  it('falls back to a no-op Storage implementation', async () => {
    const { ssrSafeLocalStorage } = await importWithoutWindow<
      typeof import('../src/utils/storage')
    >('../src/utils/storage');

    expect(ssrSafeLocalStorage.length).toBe(0);
    expect(ssrSafeLocalStorage.getItem('anything')).toBeNull();
    expect(ssrSafeLocalStorage.key(0)).toBeNull();
    expect(() => ssrSafeLocalStorage.setItem('a', 'b')).not.toThrow();
    expect(() => ssrSafeLocalStorage.removeItem('a')).not.toThrow();
    expect(() => ssrSafeLocalStorage.clear()).not.toThrow();
    // The no-op storage never actually persists anything.
    ssrSafeLocalStorage.setItem('a', 'b');
    expect(ssrSafeLocalStorage.getItem('a')).toBeNull();
  });

  it('uses window.localStorage in the browser', async () => {
    const { ssrSafeLocalStorage } = await import('../src/utils/storage');

    expect(ssrSafeLocalStorage).toBe(window.localStorage);
  });
});

describe('getStorage without a window', () => {
  it('throws rather than touching localStorage', async () => {
    // `getStorage` checks for `window` on every call, so keep it unstubbed
    // while the assertion runs.
    const { getStorage } = await import('../src/utils/storage');
    vi.stubGlobal('window', undefined);

    expect(() => getStorage('key')).toThrow();
  });
});

describe('downloadFromBlob without a window', () => {
  it('logs an error instead of triggering a download', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { downloadFromBlob } = await importWithoutWindow<
      typeof import('../src/utils/download')
    >('../src/utils/download');

    await expect(downloadFromBlob(new Blob(['x']), 'x.txt')).resolves.toBeUndefined();
    expect(consoleError).toHaveBeenCalledWith('Download is not supported in Node.js');

    consoleError.mockRestore();
  });
});
