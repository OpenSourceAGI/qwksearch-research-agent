
import * as db from './db.js';
import { safeURL } from './model.js';

export function createFaviconCache({ read, write, fetchIcon, now = Date.now }) {
  const pending = new Map(),
    recent = new Map();
  async function resolve(url) {
    const last = recent.get(url);
    if (last && now() < last.retryAt) return last.data;
    if (pending.has(url)) return pending.get(url);
    const work = (async () => {
      const saved = await read(url);
      let data = saved?.data || null;
      if (!data || now() - saved.at > 10 * 60_000) {
        try {
          const fresh = await fetchIcon(url);
          // Generic browser images and temporary failures never replace a known icon.
          if (fresh) {
            data = fresh;
            await write({ id: url, data, at: now() });
          }
        } catch {
          /* Keep the last successfully resolved site icon. */
        }
      }
      recent.set(url, { data, retryAt: now() + (data ? 60_000 : 1000) });
      if (recent.size > 512) recent.delete(recent.keys().next().value);
      return data;
    })();
    pending.set(url, work);
    try {
      return await work;
    } finally {
      pending.delete(url);
    }
  }
  return { resolve };
}

async function localIcon(url) {
  const endpoint = new URL(chrome.runtime.getURL('_favicon/'));
  endpoint.searchParams.set('pageUrl', url);
  endpoint.searchParams.set('size', '32');
  const response = await fetch(endpoint, { signal: AbortSignal.timeout(4000) });
  if (!response.ok) throw Error('Local favicon cache unavailable');
  const bytes = new Uint8Array(await response.arrayBuffer());
  // A successful HTTP response can still contain an unusable image. Validate
  // before replacing the last known good icon in persistent storage.
  const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
  bitmap.close();
  return 'data:image/png;base64,' + btoa(String.fromCharCode(...bytes));
}
let fallback,
  writes = 0;
const cache = createFaviconCache({
  read: (url) => db.read('favicons', url),
  write: async (record) => {
    await db.write('favicons', record);
    if (++writes % 32 === 1) {
      const rows = (await db.all('favicons')).sort((a, b) => b.at - a.at);
      for (const old of rows.slice(512)) await db.remove('favicons', old.id);
    }
  },
  fetchIcon: async (url) => {
    const data = await localIcon(url);
    fallback ||= localIcon('https://neo-favicon-missing.invalid/').catch((error) => {
      fallback = null;
      throw error;
    });
    return data === (await fallback) ? null : data;
  },
});
export async function favicon(url) {
  const safe = safeURL(url);
  if (!/^https?:/.test(safe || '')) return null;
  return cache.resolve(safe);
}
