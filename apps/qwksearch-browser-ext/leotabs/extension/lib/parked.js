
export const parkedTitle = (record) =>
  record.title?.trim() || new URL(record.url).hostname || record.url;
export const hasParkedIdentity = (tab, title) =>
  tab.title === title && /^data:image\/png;base64,/i.test(tab.favIconUrl || '');
export async function settleParked(
  browser,
  tab,
  target,
  title,
  pause = (ms) => new Promise((r) => setTimeout(r, ms)),
) {
  for (let attempt = 0; attempt < 40; attempt++) {
    tab = await browser.tabs.get(tab.id);
    if (tab.active || (tab.url && tab.url !== target && !tab.pendingUrl)) return tab;
    if (tab.url === target && tab.status === 'complete' && hasParkedIdentity(tab, title)) {
      // Chrome can report the new icon URL before its native tab strip has adopted
      // the bitmap. Immediate discard can freeze the extension icon instead.
      // Keep this inert local document; the destination still loads only on selection.
      return tab;
    }
    await pause(50);
  }
  // Keep the lightweight local page alive if metadata isn't ready. Never freeze a generic label.
  return tab;
}
export async function repairParkedTabs(browser, db, { repairDiscarded = true } = {}) {
  const prefix = browser.runtime.getURL('parked.html?');
  const pending = (await browser.tabs.query({})).filter(
    (t) => !t.active && !t.incognito && t.url?.startsWith(prefix),
  );
  await Promise.all(
    Array.from({ length: Math.min(4, pending.length) }, async () => {
      while (pending.length) {
        const candidate = pending.shift();
        try {
          const record = await db.read('parked', new URL(candidate.url).searchParams.get('id'));
          if (!record) continue;
          const tab = await browser.tabs.get(candidate.id);
          if (
            tab.active ||
            tab.url !== candidate.url ||
            ((!repairDiscarded || !tab.discarded) && hasParkedIdentity(tab, parkedTitle(record)))
          )
            continue;
          await browser.tabs.reload(tab.id);
          await settleParked(browser, tab, tab.url, parkedTitle(record));
        } catch {
          /* Closed or changed tabs are left alone. */
        }
      }
    }),
  );
}
