/**
 * Settings that belong to the extension shell rather than to a feature.
 * Kept in `chrome.storage.local` so the background service worker, which has no
 * `localStorage`, reads the same value the side panel writes.
 */

/** Open QwkSearch as a full browser tab instead of the side panel. Off by default. */
export const OPEN_IN_TAB_KEY = 'qwkOpenInTab';

/** The side panel page; `?view=page` lays it out for a full browser tab. */
export const PANEL_PAGE = 'sidepanel.html';
export const FULL_PAGE_QUERY = '?view=page';

type StorageArea = Pick<chrome.storage.StorageArea, 'get' | 'set'>;

export async function getOpenInTab(storage: StorageArea = chrome.storage.local): Promise<boolean> {
  const stored = await storage.get(OPEN_IN_TAB_KEY);
  return stored[OPEN_IN_TAB_KEY] === true;
}

export async function setOpenInTab(
  value: boolean,
  storage: StorageArea = chrome.storage.local
): Promise<void> {
  await storage.set({ [OPEN_IN_TAB_KEY]: value });
}

/** True when this document is the panel UI opened as a full tab. */
export function isFullPage(search: string = location.search): boolean {
  return new URLSearchParams(search).get('view') === 'page';
}

type TabsBrowser = {
  runtime: { getURL: (path: string) => string };
  tabs: {
    query: (q: { windowId?: number }) => Promise<{ id?: number; url?: string }[]>;
    update: (id: number, props: { active: boolean }) => Promise<unknown>;
    create: (props: { url: string; windowId?: number }) => Promise<unknown>;
  };
};

/**
 * Opens the panel UI as a full tab in `windowId`, or focuses the one already
 * open there rather than stacking a second copy.
 */
export async function openFullPage(browser: TabsBrowser, windowId?: number): Promise<void> {
  const page = browser.runtime.getURL(PANEL_PAGE);
  const tabs = await browser.tabs.query(windowId === undefined ? {} : { windowId });
  const existing = tabs.find((t) => t.url?.startsWith(page));
  if (existing?.id !== undefined) {
    await browser.tabs.update(existing.id, { active: true });
    return;
  }
  await browser.tabs.create({ url: page + FULL_PAGE_QUERY, ...(windowId === undefined ? {} : { windowId }) });
}
