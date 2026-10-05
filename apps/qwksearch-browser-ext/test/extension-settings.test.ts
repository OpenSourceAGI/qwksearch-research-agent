import { describe, expect, it, vi } from 'vitest';
import { getOpenInTab, isFullPage, openFullPage, OPEN_IN_TAB_KEY, setOpenInTab } from '../lib/extension-settings';

function memoryStorage(initial: Record<string, unknown> = {}) {
  const data = { ...initial };
  return {
    data,
    get: vi.fn(async (key: string) => (key in data ? { [key]: data[key] } : {})),
    set: vi.fn(async (items: Record<string, unknown>) => {
      Object.assign(data, items);
    }),
  } as any;
}

describe('open in a full tab', () => {
  it('is off by default', async () => {
    expect(await getOpenInTab(memoryStorage())).toBe(false);
  });

  it('round-trips through storage', async () => {
    const storage = memoryStorage();
    await setOpenInTab(true, storage);
    expect(storage.data[OPEN_IN_TAB_KEY]).toBe(true);
    expect(await getOpenInTab(storage)).toBe(true);
  });

  it('recognises the full-page view', () => {
    expect(isFullPage('?view=page')).toBe(true);
    expect(isFullPage('')).toBe(false);
  });
});

describe('openFullPage', () => {
  const page = 'chrome-extension://test/sidepanel.html';
  function browser(tabs: { id?: number; url?: string }[]) {
    return {
      runtime: { getURL: (path: string) => `chrome-extension://test/${path}` },
      tabs: {
        query: vi.fn(async () => tabs),
        update: vi.fn(async () => ({})),
        create: vi.fn(async () => ({})),
      },
    };
  }

  it('opens the panel page as a tab in the window', async () => {
    const b = browser([{ id: 1, url: 'https://example.com' }]);
    await openFullPage(b, 4);
    expect(b.tabs.create).toHaveBeenCalledWith({ url: `${page}?view=page`, windowId: 4 });
  });

  it('focuses the copy already open instead of opening another', async () => {
    const b = browser([{ id: 9, url: `${page}?view=page` }]);
    await openFullPage(b, 4);
    expect(b.tabs.update).toHaveBeenCalledWith(9, { active: true });
    expect(b.tabs.create).not.toHaveBeenCalled();
  });
});
