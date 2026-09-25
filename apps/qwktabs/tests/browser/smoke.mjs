
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
export async function checkSmoke({app,rpc,results,delay,origin,out,hits,extensionOrigin}) {
  const tabA = await app.evaluate(
    `chrome.tabs.create({url:${JSON.stringify(origin + '/brief')},active:false})`,
  );
  const tabB = await app.evaluate(
    `chrome.tabs.create({url:${JSON.stringify(origin + '/research')},active:false})`,
  );
  const pin = await app.evaluate(
    `chrome.tabs.create({url:${JSON.stringify(origin + '/pinned')},pinned:true,active:false})`,
  );
  for (let i = 0; i < 100; i++) {
    if (
      await app.evaluate(
        `chrome.tabs.query({}).then(t=>[${tabA.id},${tabB.id},${pin.id}].every(id=>t.some(x=>x.id===id&&x.status==='complete'&&!x.pendingUrl)))`,
      )
    )
      break;
    await delay(100);
  }
  await app.evaluate(
    `chrome.tabs.group({tabIds:[${tabA.id},${tabB.id}]}).then(id=>chrome.tabGroups.update(id,{title:'Research',color:'green'}))`,
  );
  const saved = await rpc('save', {
    tabIds: [tabA.id, tabB.id, pin.id],
    name: 'Research',
    close: true,
  });
  assert.equal(saved.closed.length, 2);
  assert.equal((await rpc('load')).state.collections[0].groups[0].name, 'Research');
  assert((await app.evaluate('chrome.tabs.query({})')).some((t) => t.id === pin.id));
  results.push('Durable stash closes two captured pages, preserves native group and pinned page');
  const at = hits.length;
  const c = (await rpc('load')).state.collections[0];
  const resumed = await rpc('resume', {
    collectionId: c.id,
    windowId: tabA.windowId,
    deferred: true,
  });
  assert.equal(resumed.created.length, 2);
  await delay(600);
  assert(
    !hits.slice(at).some((url) => url === '/brief' || url === '/research'),
    'Deferred resume must not request either destination page',
  );
  await fs.writeFile(
    path.join(out, 'resume-diagnostic.json'),
    JSON.stringify({ resumed, tabs: await app.evaluate('chrome.tabs.query({})') }, null, 2),
  );
  const parked = await app.evaluate(`chrome.tabs.get(${resumed.created[0]})`);
  assert(parked.url.startsWith(extensionOrigin + '/parked.html'));
  results.push('Deferred resume makes zero destination website requests');
  await rpc('activate', { tabId: resumed.created[0] });
  for (let i = 0; i < 100 && !hits.slice(at).includes('/brief'); i++) await delay(100);
  assert(hits.slice(at).includes('/brief'));
  results.push('Selecting parked tab loads its destination');
  await app.send('Page.reload');
  await delay(350);
  assert.equal((await rpc('load')).state.collections[0].name, 'Research');
  results.push('Library and recovery persist across page reload');
  const sample = [
    ['Capstone', 'mint'],
    ['Product design', 'blue'],
    ['University', 'peach'],
    ['Reading', 'lavender'],
    ['Weekend plans', 'rose'],
    ['Development', 'teal'],
  ].map(([name, color], i) => ({
    id: 'sample' + i,
    name,
    color,
    note: i < 2 ? 'Next: compare the two approaches.' : '',
    groups: [
      {
        id: 'g' + i,
        name: i % 2 ? 'References' : 'Papers to compare',
        color: 'blue',
        collapsed: true,
      },
    ],
    links: [
      {
        id: 'l' + i + 'a',
        title: i % 2 ? 'Interaction references' : 'Project brief',
        url: origin + '/brief?' + i,
        note: '',
        groupId: null,
      },
      {
        id: 'l' + i + 'b',
        title: i % 2 ? 'Design notes' : 'Experiment tracker',
        url: origin + '/research?' + i,
        note: '',
        groupId: null,
      },
      {
        id: 'l' + i + 'c',
        title: 'Evaluation notes',
        url: origin + '/notes?' + i,
        note: 'Read the summary',
        groupId: 'g' + i,
      },
    ],
  }));
  await rpc('import', { collections: sample });
  for (
    let i = 0;
    i < 100 && !(await app.evaluate('document.querySelectorAll(".collection").length===7'));
    i++
  )
    await delay(100);
  const current = await app.evaluate('chrome.tabs.getCurrent()');
  await rpc('activate', { tabId: current.id });
  for (const [theme, width, height] of [
    ['light', 1440, 1000],
    ['dark', 1440, 1000],
    ['light', 390, 950],
  ]) {
    await rpc('settings', { settings: { theme } });
    for (
      let i = 0;
      i < 100 &&
      !(await app.evaluate(`document.documentElement.dataset.theme===${JSON.stringify(theme)}`));
      i++
    )
      await delay(100);
    await app.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await delay(300);
    assert.equal(await app.evaluate('document.documentElement.scrollWidth>innerWidth'), false);
    const shot = await app.send('Page.captureScreenshot', { format: 'png' });
    await fs.writeFile(path.join(out, `${theme}-${width}.png`), Buffer.from(shot.data, 'base64'));
  }
  results.push('Both themes and narrow reflow render without horizontal overflow');
  await app.send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await app.evaluate(`document.querySelector('.tab-tools [aria-label="Save tabs"]').click()`);
  await delay(100);
  assert(await app.evaluate(`document.querySelector('#action-popover').matches(':popover-open')`));
  const shot = await app.send('Page.captureScreenshot', { format: 'png' });
  await fs.writeFile(path.join(out, 'stash.png'), Buffer.from(shot.data, 'base64'));
  results.push('Anchored stash popover works in extension CSP');

  await app.evaluate('document.querySelector("#action-popover").hidePopover()');
  return {pin};
}
