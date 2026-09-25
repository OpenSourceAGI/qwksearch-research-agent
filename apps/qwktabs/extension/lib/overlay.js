
import { capture, invalidatePreviews } from './previews.js';

const pending = new Map();
const sessionTabs = new Set();

export function forgetOverlay(tabId) {
  if (sessionTabs.delete(tabId)) chrome.storage.session.remove('overlay:' + tabId).catch(() => {});
}

export async function openSwitcher(tab, { mode = 'switcher' } = {}) {
  tab ||= (await chrome.tabs.query({ active: true, lastFocusedWindow: true }))[0];
  if (!tab || tab.incognito) return;
  // The protected-page fallback is itself the active tab on the next shortcut.
  // Close that owned UI rather than opening another popup inside it.
  if (tab.url && tab.url.split('?')[0] === chrome.runtime.getURL('quick.html')) {
    const window = await chrome.windows.get(tab.windowId);
    if (window.type === 'popup') await chrome.windows.remove(window.id);
    else await chrome.tabs.remove(tab.id);
    return;
  }
  const previous = pending.get(tab.id) || Promise.resolve();
  const work = previous.catch(() => {}).then(() => toggleSwitcher(tab, mode));
  pending.set(tab.id, work);
  try {
    return await work;
  } finally {
    if (pending.get(tab.id) === work) pending.delete(tab.id);
  }
}

async function toggleSwitcher(tab, mode) {
  const context = { token: crypto.randomUUID(), windowId: tab.windowId, mode };
  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (context) => {
        if (globalThis.__neoCloseOverlay) {
          const same =
            context.mode === 'switcher' || globalThis.__neoOverlayContext?.mode === context.mode;
          globalThis.__neoCloseOverlay();
          if (same) return false;
        }
        globalThis.__neoOverlayContext = context;
        return true;
      },
      args: [context],
    });
    if (!result.result) return;
    // Capture after the toggle check but before mounting. Toggling an existing
    // overlay off must never cache the overlay as the underlying page.
    let timer;
    await Promise.race([
      mode === 'search' ? Promise.resolve() : capture(tab.id).catch(() => {}),
      new Promise((resolve) => {
        timer = setTimeout(resolve, 900);
      }),
    ]);
    clearTimeout(timer);
    // A slow compositor capture must not hold the switcher closed or later
    // overwrite this page's cache with the newly mounted overlay.
    invalidatePreviews();
    await chrome.storage.session.set({
      ['overlay:' + tab.id]: {
        ...context,
        documentId: result.documentId,
        expires: Date.now() + 3600000,
      },
    });
    sessionTabs.add(tab.id);
    await chrome.scripting.executeScript({
      target: { tabId: tab.id, documentIds: [result.documentId] },
      files: ['overlay.js'],
    });
  } catch {
    // Protected browser pages cannot host content scripts. Keep the fallback
    // bounded too, preserving the source window for all tab operations.
    await openSwitcherPopup(tab.windowId, mode);
  }
}

export async function openSwitcherPopup(windowId, mode = 'switcher', continuation) {
    const source = await chrome.windows.get(windowId);
    const width = Math.min(mode === 'search' ? 720 : 1180, source.width - 64),
      height = Math.min(mode === 'search' ? 520 : 760, source.height - 100);
    return chrome.windows.create({
      url: chrome.runtime.getURL('quick.html?' + new URLSearchParams({window:windowId, mode, ...(continuation ? {continuation} : {})})),
      type: 'popup',
      width,
      height,
      left: Math.round(source.left + (source.width - width) / 2),
      top: Math.round(source.top + (source.height - height) / 2),
    });
}

export async function isOverlaySender(message, sender) {
  if (!message.overlayToken || sender.frameId !== 0 || !sender.tab || sender.tab.incognito)
    return false;
  const key = 'overlay:' + sender.tab.id;
  const session = (await chrome.storage.session.get(key))[key];
  return (
    !!session &&
    session.token === message.overlayToken &&
    session.documentId === sender.documentId &&
    session.expires > Date.now()
  );
}
