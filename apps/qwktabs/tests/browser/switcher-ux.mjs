
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
export async function checkSwitcherUX({ read, rpc, app, pin, nativePage, out, results, delay }) {
  const waitFor = async (code) => {
    for (let i = 0; i < 120; i++) {
      if (await read(code)) return;
      await delay(100);
    }
    throw Error('Switcher did not settle: ' + code);
  };
  const click = (label) =>
    read(
      `const b=[...root.querySelectorAll('button')].find(n=>n.getAttribute('aria-label')===${JSON.stringify(label)});if(!b||b.disabled)throw Error('Button unavailable: '+${JSON.stringify(label)});b.click();`,
    );
  const screenshot = async (name) =>
    fs.writeFile(
      path.join(out, name + '.png'),
      Buffer.from(
        (await nativePage.send('Page.captureScreenshot', { format: 'png' })).data,
        'base64',
      ),
    );
  // Observe real loaded images continuously across more than three poll cycles.
  await read(`globalThis.__uxImages=[...root.querySelectorAll('.preview-image > :is(img, canvas)')];globalThis.__uxMissing=0;
    globalThis.__uxTimer=setInterval(()=>{if(globalThis.__uxImages.some(n=>!n.isConnected||(n.tagName==='IMG'&&!n.complete)))globalThis.__uxMissing++;},30);`);
  await rpc('settings', { settings: { theme: 'dark' } });
  await waitFor(`return getComputedStyle(root.host).colorScheme==='dark';`);
  await screenshot('switcher-dark');
  await delay(8200);
  assert.equal(
    await read('clearInterval(globalThis.__uxTimer);return globalThis.__uxMissing;'),
    0,
    'Loaded previews remain mounted and decoded through all refreshes',
  );
  await rpc('settings', { settings: { theme: 'light' } });
  await waitFor(`return getComputedStyle(root.host).colorScheme==='light';`);
  await screenshot('switcher-light');
  results.push(
    'Loaded previews never disappear across 8.2 seconds of polling and theme changes; injected light/dark colors match Settings',
  );
  const baseURL = await nativePage.evaluate('location.href');
  await rpc('settings', { settings: { autoGroup: false } });
  const testTabs = await app.evaluate(
    `Promise.all(['select-one','select-two'].map(p=>chrome.tabs.create({url:new URL('/'+p,${JSON.stringify(baseURL)}).href,windowId:${pin.windowId},active:false})))`,
  );
  await waitFor(
    `return ${JSON.stringify(testTabs.map((t) => t.id))}.every(id=>[...root.querySelectorAll('.switcher-card')].some(n=>n.dataset.key.includes('tab:'+id+':')));`,
  );
  await read(`root.querySelector('#select-mode').click();`);
  assert(
    await read(
      `return !root.querySelector('.selection-toolbar').hidden && !root.querySelector('.selection-toolbar button[aria-label=Group]').disabled===false;`,
    ),
  );
  for (const tab of testTabs)
    await read(
      `[...root.querySelectorAll('.switcher-card')].find(n=>n.dataset.key.includes('tab:${tab.id}:')).querySelector('button').click();`,
    );
  assert.equal(
    await read(`return root.querySelector('.selection-toolbar strong').textContent;`),
    '2 selected',
  );
  await click('Group');
  await waitFor(`return !!root.querySelector('.group-name-slot input');`);
  assert.equal(await read(`return !!root.querySelector('dialog[open]');`), false);
  const renameBounds = async () => read(`
    const input=root.querySelector('.group-name-slot input'),slot=input.parentElement,card=input.closest('.switcher-card');
    const rect=node=>{const r=node.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
    return {input:rect(input),slot:rect(slot),preview:card.querySelector('.group-preview')?rect(card.querySelector('.group-preview')):null,
      close:rect(card.querySelector('.tile-close')),count:card.closest('.tab-list')?rect(card.querySelector('.preview-info')):null,minimum:getComputedStyle(input).minHeight};
  `);
  const assertRenameFits = async () => {
    const bounds=await renameBounds();
    assert(bounds.input.height<=bounds.slot.height+0.5,'Rename input exceeds its header slot: '+JSON.stringify(bounds));
    if(bounds.close.width)assert(bounds.input.right<=bounds.close.x,'Rename input overlaps the close control');
    if(bounds.count)assert(bounds.input.right+4<=bounds.count.x,'Rename input overlaps the tab count');
    if(bounds.preview)assert(bounds.input.bottom<=bounds.preview.y,'Rename input overlaps the previews');
  };
  await assertRenameFits();
  await read(`root.querySelector('.group-name-slot input').value='Focus work';`);
  await delay(2800);
  assert.equal(await read(`return root.querySelector('.group-name-slot input').value;`), 'Focus work');
  await read(`root.querySelector('.group-name-slot input').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));`);
  await waitFor(
    `return !root.querySelector('.group-name-slot input') && [...root.querySelectorAll('.group-tile')].some(n=>n.textContent.includes('Focus work'));`,
  );
  const native = (await rpc('load')).groups.find((g) => g.title === 'Focus work');
  assert(native);
  // Editing must occupy the label's exact box in both layouts, including long names.
  await read(`root.querySelector('#select-mode').click();`);
  for (const mode of ['Previews', 'List']) {
    await click(mode);
    await waitFor(`return !![...root.querySelectorAll('.group-name')].find(n=>n.textContent==='Focus work');`);
    const label = await read(`
      const n=[...root.querySelectorAll('.group-name')].find(n=>n.textContent==='Focus work'),r=n.getBoundingClientRect(),s=getComputedStyle(n);
      return {x:r.x,y:r.y,width:r.width,height:r.height,font:s.font,padding:s.padding};
    `);
    await click('Rename Focus work');
    await waitFor(`return !!root.querySelector('.group-name-slot input');`);
    await read(`const i=root.querySelector('.group-name-slot input');i.value='Programming languages and runtimes with a very long group name';i.select();`);
    await assertRenameFits();
    const input = (await renameBounds()).input;
    for (const key of ['x','y','width','height'])
      assert(Math.abs(input[key]-label[key])<0.5,`${mode} rename changed ${key}: ${JSON.stringify({label,input})}`);
    assert.deepEqual(await read(`const s=getComputedStyle(root.querySelector('.group-name-slot input'));return {font:s.font,padding:s.padding};`),{font:label.font,padding:label.padding});
    await screenshot('switcher-rename-'+mode.toLowerCase());
    await read(`root.querySelector('.group-name-slot input').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));`);
    assert.equal((await rpc('load')).groups.find(g=>g.id===native.id).title,'Focus work','Cancel must preserve the group name');
  }
  await click('Previews');
  await read(`root.querySelector('#select-mode').click();`);
  await read(`[...root.querySelectorAll('.group-tile')].find(n=>n.textContent.includes('Focus work')).querySelector('.group-select').click();`);
  results.push('Group rename keeps the label bounds and typography in preview/list views; long names do not overlap previews or close controls; Enter saves and Escape cancels');
  await rpc('settings', { settings: { theme: 'dark' } });
  await waitFor(`return getComputedStyle(root.host).colorScheme==='dark';`);
  await screenshot('switcher-select');
  await click('Clear');
  await read(
    `[...root.querySelectorAll('.group-tile')].find(n=>n.textContent.includes('Focus work')).querySelector('.group-select').click();`,
  );
  assert.equal(
    await read(`return root.querySelector('.selection-toolbar strong').textContent;`),
    '2 selected',
  );
  await click('Rename Focus work');
  await read(
    `root.querySelector('.group-name-slot input').value='Writing';root.querySelector('.group-name-slot input').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));`,
  );
  await waitFor(
    `return [...root.querySelectorAll('.group-tile')].some(n=>n.textContent.includes('Writing'));`,
  );
  await click('Ungroup');
  await waitFor(
    `return ![...root.querySelectorAll('.group-tile')].some(n=>n.textContent.includes('Writing'));`,
  );
  assert(
    (await rpc('load')).tabs
      .filter((t) => testTabs.some((x) => x.id === t.id))
      .every((t) => t.groupId === -1),
  );
  await click('Group');
  await waitFor(`return !!root.querySelector('.group-name-slot input');`);
  await read(`root.querySelector('.group-name-slot input').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));`);
  await click('Close 2 tabs');
  await waitFor(
    `return root.querySelector('.selection-toolbar strong').textContent==='Select tabs or groups';`,
  );
  assert((await rpc('load')).tabs.every((t) => !testTabs.some((x) => x.id === t.id)));
  assert(await read('return !!root.querySelector(".task-view");'));
  await click('Undo');
  await waitFor(
    `return [...root.querySelectorAll('.group-tile')].some(n=>n.textContent.includes('2 tabs'));`,
  );
  results.push(
    'Select mode groups multiple tabs, renames inline, selects whole groups, ungroups, closes groups and undoes closure without leaving the overlay',
  );
  await read(
    `root.querySelector('#quick-search').focus();root.querySelector('#quick-search').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));`,
  );
  assert(
    await read(
      `return root.querySelector('.selection-toolbar').hidden && !!root.querySelector('.task-view');`,
    ),
  );
  await nativePage.send('Emulation.setDeviceMetricsOverride', {
    width: 640,
    height: 760,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await read(`root.querySelector('#quick-search').dispatchEvent(new Event('input'));`);
  assert(
    await read(
      `const b=root.querySelector('.task-view').getBoundingClientRect();return b.left>=0&&b.right<=innerWidth&&b.top>=0&&b.bottom<=innerHeight;`,
    ),
  );
  await screenshot('switcher-narrow');
  await nativePage.send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await read(`root.querySelector('#quick-search').dispatchEvent(new Event('input'));`);
  results.push('Escape exits selection first; narrow floating layout stays within the viewport');
}
