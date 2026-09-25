import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

export async function checkDialogPolish({app,rpc,results,out,delay}) {
  const wait=async fn=>{for(let i=0;i<100;i++){if(await fn())return;await delay(60);}throw Error('Dialog did not settle');};
  const click=label=>app.evaluate(`(()=>{const b=[...document.querySelectorAll('dialog[open] button,#action-popover button')].find(b=>b.textContent.trim()===${JSON.stringify(label)});if(!b)throw Error('Missing ${label}');b.click();})()`);
  const close=()=>app.evaluate(`document.querySelector('dialog[open]')?.close();document.querySelector('#action-popover')?.hidePopover()`);
  const openSettings=async label=>{await close();await app.evaluate(`document.querySelector('#settings').click()`);await click(label);};
  const openImport=async()=>{await close();await app.evaluate(`location.hash='#action=import';window.dispatchEvent(new Event('hashchange'))`);await wait(()=>app.evaluate(`document.querySelector('dialog[open] h2')?.textContent==='Import data'`));};
  const capture=async name=>{
    await fs.writeFile(path.join(out,name+'.png'),Buffer.from((await app.send('Page.captureScreenshot',{format:'png'})).data,'base64'));
    const metrics=await app.evaluate(`(()=>{const d=document.querySelector('dialog[open]'),r=d.getBoundingClientRect();return {fits:r.left>=0&&r.top>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1,noOverflow:d.scrollWidth<=d.clientWidth+1,head:parseFloat(getComputedStyle(d.querySelector('h2')).fontSize),sub:[...d.querySelectorAll('summary,h3')].map(n=>parseFloat(getComputedStyle(n).fontSize)),buttons:[...d.querySelectorAll('button:not(.icon-button)')].filter(n=>n.getClientRects().length).map(n=>n.getBoundingClientRect().height)}})()`);
    assert(metrics.fits&&metrics.noOverflow,JSON.stringify(metrics));
    assert(metrics.head>=20&&metrics.sub.every(n=>n>=17),JSON.stringify(metrics));
    assert(metrics.buttons.every(n=>n>=36),JSON.stringify(metrics));
  };
  for(const theme of ['light','dark']) {
    await rpc('settings',{settings:{theme}});
    await wait(()=>app.evaluate(`document.documentElement.dataset.theme===${JSON.stringify(theme)}`));
    for(const width of [1440,390]) {
      await app.send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});
      await openImport();await app.evaluate(`document.querySelector('dialog summary').click()`);
      await capture(`import-${theme}-${width}`);
      assert(await app.evaluate(`document.querySelector('dialog input[type=file]').hidden && !![...document.querySelectorAll('dialog button')].find(b=>b.textContent==='Choose file')`));
      await click('Export & import');
      await capture(`export-${theme}-${width}`);
      await openSettings('Privacy & permissions');
      await capture(`privacy-${theme}-${width}`);
      assert(await app.evaluate(`document.querySelectorAll('.dialog-setting-row').length===4 && !document.querySelector('dialog').textContent.includes('No account') && !document.querySelector('dialog').textContent.includes('Export & backup')`));
      if(width===1440)assert(await app.evaluate(`(()=>{const xs=[...document.querySelectorAll('.dialog-setting-row>button')].map(b=>b.getBoundingClientRect().left);return Math.max(...xs)-Math.min(...xs)<1})()`));
    }
  }
  await app.evaluate(`import(chrome.runtime.getURL('lib/db.js')).then(db=>db.write('previews',{id:'dialog-test',data:'fixture'}))`);
  await click('Clear previews');
  await wait(()=>app.evaluate(`import(chrome.runtime.getURL('lib/db.js')).then(db=>db.all('previews')).then(rows=>rows.length===0)`));
  await click('Revoke access');
  await wait(()=>app.evaluate(`document.querySelector('[aria-label="Enable browser history search"]').textContent==='Enable'`));
  assert.equal((await rpc('load')).state.settings.previewCapture,false);
  await openImport();await app.evaluate(`document.querySelector('dialog summary').click()`);
  const file=path.join(out,'import-fixture.md');await fs.writeFile(file,'# Imported reading\n- [Example](https://example.org/)\n');
  const doc=await app.send('DOM.getDocument');
  const input=await app.send('DOM.querySelector',{nodeId:doc.root.nodeId,selector:'dialog input[type=file]'});
  await app.send('DOM.setFileInputFiles',{nodeId:input.nodeId,files:[file]});
  await wait(()=>app.evaluate(`document.querySelector('dialog[open] h2')?.textContent==='Review import'`));
  assert(await app.evaluate(`document.querySelector('dialog').textContent.includes('1 links')`));
  results.push('Import, Export and Privacy dialogs verified in light/dark at 1440px/390px: readable headings, aligned controls, no overflow; file selection opens import review, preview clearing and access revocation work');
}
