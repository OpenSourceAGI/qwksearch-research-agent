
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
export async function checkLazyOpen({ app, rpc, results, delay, origin, out, hits }) {
  const wait = async (fn, msg) => {
    for (let i = 0; i < 150; i++) {
      if (await fn()) return;
      await delay(70);
    }
    throw Error(msg);
  };
  const own = await app.evaluate('chrome.tabs.getCurrent()');
  await app.send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await rpc('settings', { settings: { autoGroup: false, currentWindowOnly: false } });
  const other = await app.evaluate(
    `chrome.windows.create({url:${JSON.stringify(origin + '/other-window')},focused:false})`,
  );
  await app.send('Page.reload');
  await wait(
    () => app.evaluate(`!!document.querySelector('#sidebar-scopes button')`),
    'Library load',
  );
  assert(
    await app.evaluate(
      `document.querySelector('#sidebar-scopes button').getAttribute('aria-pressed')==='true'`,
    ),
  );
  assert(
    !(await app.evaluate(`document.querySelector('#tabs').textContent`)).includes('other-window'),
  );
  await app.evaluate(`document.querySelectorAll('#sidebar-scopes button')[1].click()`);
  await wait(
    () => app.evaluate(`document.querySelectorAll('#tabs .tab-row').length>0`),
    'All windows choice',
  );
  await app.send('Page.reload');
  await wait(
    () =>
      app.evaluate(
        `document.querySelector('#sidebar-scopes button')?.getAttribute('aria-pressed')==='true'`,
      ),
    'Reload must default to This window',
  );
  await rpc('import', {
    collections: [
      {
        name: 'Lazy opening',
        groups: [{ id: 'g', name: 'References', color: 'green' }],
        links: ['a', 'b', 'c'].map((v, i) => ({
          url: origin + '/lazy-' + v,
          title: 'Reference ' + v,
          groupId: i < 2 ? 'g' : null,
        })),
      },
    ],
  });
  const c = (await rpc('load')).state.collections.find((c) => c.name === 'Lazy opening');
  const selector = `[data-collection-id="${c.id}"]`;
  const parked = () =>
    app.evaluate(`chrome.tabs.query({}).then(ts=>ts.filter(t=>t.url?.includes('/parked.html?')))`);
  const clickOpen = () =>
    app.evaluate(
      `[...document.querySelectorAll('${selector} .collection-primary-actions button')].find(b=>b.textContent==='Open').click()`,
    );
  await wait(() => app.evaluate(`!!document.querySelector('${selector}')`), 'Collection rendered');
  const working = await app.evaluate(
    `chrome.tabs.create({windowId:${own.windowId},url:${JSON.stringify(origin + '/working')},active:false})`,
  );
  const source = await rpc('save', {
    tabIds: [working.id],
    windowId: own.windowId,
    name: 'Existing work',
    adopt: true,
    minimal: true,
  });
  const before = await app.evaluate('chrome.tabs.query({})'),
    at = hits.length;
  await clickOpen();
  await wait(
    async () => (await parked()).filter((t) => t.windowId === own.windowId).length === 3,
    'Current-window Open did not park all pages',
  );
  await wait(
    () => app.evaluate(`document.querySelector('#toast').textContent.includes('Opened 3 tabs')`),
    'Open completion',
  );
  await delay(400);
  assert.equal(
    hits.slice(at).filter((p) => p.startsWith('/lazy-')).length,
    0,
    'Open contacted destination websites',
  );
  const current = (await parked()).filter((t) => t.windowId === own.windowId);
  assert.equal(current.filter((t) => t.groupId >= 0).length, 2);
  assert.equal(new Set(current.filter((t) => t.groupId >= 0).map((t) => t.groupId)).size, 1);
  assert(
    (await app.evaluate('chrome.tabs.query({})')).filter((t) => before.some((b) => b.id === t.id))
      .length === before.length,
  );
  assert.equal((await rpc('load')).state.collections.find((x) => x.id === c.id).links.length, 3);
  const loaded = await rpc('load');
  assert(!loaded.sessionState.active[own.windowId]);
  assert.deepEqual(
    loaded.state.collections.find((x) => x.id === source.collectionId).links.map((l) => l.url),
    [origin + '/working'],
  );
  assert(
    await app.evaluate(`!document.querySelector('.close-all-tabs').disabled`),
    'Opening tabs left Close all disabled',
  );
  await app.evaluate(`chrome.tabs.update(${current[0].id},{active:true})`);
  await wait(
    () => hits.slice(at).some((p) => p === '/lazy-a'),
    'Selecting parked tab did not load destination',
  );
  assert(!hits.slice(at).some((p) => p === '/lazy-b' || p === '/lazy-c'));
  await rpc('activate', { tabId: own.id });
  const windows = await app.evaluate('chrome.windows.getAll()'),
    newAt = hits.length;
  await app.evaluate(
    `document.querySelector('${selector} .collection-head button:last-child').click();[...document.querySelectorAll('#action-popover button')].find(b=>b.textContent==='Open in new window').click()`,
  );
  await wait(
    async () => (await app.evaluate('chrome.windows.getAll()')).length === windows.length + 1,
    'New window missing',
  );
  const created = (await app.evaluate('chrome.windows.getAll()')).find(
    (w) => !windows.some((x) => x.id === w.id),
  );
  await wait(
    async () => (await parked()).filter((t) => t.windowId === created.id).length === 3,
    'New-window Open did not park all pages',
  );
  await delay(500);
  const newTabs = await app.evaluate(`chrome.tabs.query({windowId:${created.id}})`);
  assert(
    newTabs.find((t) => t.active)?.url.endsWith('/app.html'),
    'New window activated a destination instead of the library',
  );
  assert.equal(
    hits.slice(newAt).filter((p) => p.startsWith('/lazy-')).length,
    0,
    'New window contacted a destination',
  );
  await app.evaluate(`chrome.tabs.remove(${current[0].id})`);
  await rpc('activate', { tabId: own.id });
  await wait(
    () => app.evaluate(`!!document.querySelector('#recent .recent-page[title*="/lazy-a"]')`),
    'Recently closed row missing',
  );
  assert.equal(
    await app.evaluate(`document.querySelectorAll('#recent .recent-page-verb').length`),
    0,
  );
  await app.evaluate(`document.querySelector('#recent').scrollIntoView({block:'end'})`);
  await fs.writeFile(
    path.join(out, 'recent-rows.png'),
    Buffer.from((await app.send('Page.captureScreenshot')).data, 'base64'),
  );
  await app.evaluate(`document.querySelector('#recent .recent-page[title*="/lazy-a"]').click()`);
  await wait(
    () =>
      app.evaluate(
        `chrome.tabs.query({}).then(ts=>ts.some(t=>t.active&&t.url===${JSON.stringify(origin + '/lazy-a')}))`,
      ),
    'Clicking the recent row did not open it',
  );
  await app.evaluate(
    `chrome.tabs.query({}).then(ts=>chrome.tabs.remove(ts.filter(t=>t.url===${JSON.stringify(origin + '/lazy-a')}).map(t=>t.id)))`,
  );
  await rpc('activate', { tabId: own.id });
  await app.evaluate(
    `[...document.querySelectorAll('#recent button')].find(b=>b.textContent==='Timeline').click()`,
  );
  await wait(
    () => app.evaluate(`document.querySelectorAll('.timeline-page').length>0`),
    'Timeline rows missing',
  );
  assert.equal(
    await app.evaluate(`document.querySelectorAll('.timeline-page .recent-page-verb').length`),
    0,
  );
  const timelineURL = await app.evaluate(
    `document.querySelector('.timeline-page').title.split('\\n').at(-1)`,
  );
  await app.evaluate(`document.querySelector('.timeline-page').click()`);
  await wait(
    () =>
      app.evaluate(
        `chrome.tabs.query({}).then(ts=>ts.some(t=>t.active&&t.url===${JSON.stringify(timelineURL)}))`,
      ),
    'Timeline row did not activate its page',
  );
  await rpc('activate', { tabId: own.id });
  await fs.writeFile(
    path.join(out, 'timeline-rows.png'),
    Buffer.from((await app.send('Page.captureScreenshot')).data, 'base64'),
  );
  results.push(
    'This window defaults even with a legacy All windows preference; Open/new-window Open make zero destination requests until activation, preserve groups and existing tabs; new window starts on Neo; recent/timeline rows omit repeated labels and remain clickable',
  );
}
