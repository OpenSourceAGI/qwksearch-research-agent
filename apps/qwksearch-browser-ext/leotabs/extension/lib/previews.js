
import * as db from './db.js';
let lastCapture = 0,
  epoch = 0;
export function previewDimensions(width, height) {
  const scale = Math.min(1, 960 / width, 720 / height);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}
export function invalidatePreviews() {
  epoch++;
}
export async function trimPreviews(limit = 50 * 1024 * 1024) {
  const entries = (await db.all('previews')).sort((a, b) => b.at - a.at);
  let bytes = 0;
  for (const item of entries) {
    if (Date.now() - item.at > 14 * 86400000) {
      await db.remove('previews', item.id);
      continue;
    }
    bytes += item.bytes;
    if (bytes > limit) await db.remove('previews', item.id);
  }
}
export async function capture(tabId) {
  if (Date.now() - lastCapture < 1100) return;
  lastCapture = Date.now();
  const tab = await chrome.tabs.get(tabId);
  if (!tab.active || tab.incognito || tab.pendingUrl || !/^https?:/.test(tab.url || '')) return;
  const started = epoch;
  const data = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'jpeg', quality: 85 });
  const current = (check) =>
    started === epoch &&
    check.active &&
    !check.incognito &&
    check.windowId === tab.windowId &&
    check.url === tab.url &&
    !check.pendingUrl;
  if (!current(await chrome.tabs.get(tabId))) return;
  const blob = await (await fetch(data)).blob();
  const bitmap = await createImageBitmap(blob);
  const size = previewDimensions(bitmap.width, bitmap.height),
    canvas = new OffscreenCanvas(size.width, size.height);
  canvas
    .getContext('2d')
    .drawImage(bitmap, 0, 0, bitmap.width, bitmap.height, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const image = await canvas.convertToBlob({ type: 'image/webp', quality: 0.8 });
  if (!current(await chrome.tabs.get(tabId))) return;
  const written = await db.writeIf(
    'previews',
    {
      id: tab.url,
      blob: image,
      bytes: image.size,
      width: size.width,
      height: size.height,
      at: Date.now(),
    },
    () => started === epoch,
  );
  if (!written) return;
  const limit = (await db.getState()).settings.previewLimitMB * 1024 * 1024;
  await trimPreviews(limit);
}
export async function preview(url) {
  const item = await db.read('previews', url);
  if (!item || Date.now() - item.at > 14 * 86400000) return null;
  const buffer = new Uint8Array(await item.blob.arrayBuffer());
  let binary = '';
  for (const byte of buffer) binary += String.fromCharCode(byte);
  return {
    data: `data:${item.blob.type};base64,${btoa(binary)}`,
    at: item.at,
    width: item.width,
    height: item.height,
  };
}
